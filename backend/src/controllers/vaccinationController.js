const db = require("../config/db");
const { createNotification } = require("../services/notificationService");
const { sendDueReminder } = require("../services/dueReminderService");
const {
  validationError,
  validateVaccinationRecord,
} = require("../utils/validation");
const { logAudit } = require("../middleware/auditMiddleware");

// ======================================================
// Small date + status helpers
// ======================================================

const pad = (n) => String(n).padStart(2, "0");

const toISODate = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function addDaysToISO(isoDate, days) {
  if (!isoDate) return null;
  const [y, m, d] = String(isoDate).split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

// Display status is always derived from the due date so stale stored statuses
// can never cause a pet to show as overdue while its vaccination is still valid.
// A record without a next due date is treated as "Updated" (not overdue).
function computeDisplayStatus(nextDueDate) {
  if (!nextDueDate) return "Updated";

  let year, month, day;
  if (nextDueDate instanceof Date && !Number.isNaN(nextDueDate.getTime())) {
    year = nextDueDate.getFullYear();
    month = nextDueDate.getMonth() + 1;
    day = nextDueDate.getDate();
  } else {
    const [y, m, d] = String(nextDueDate).split("-").map(Number);
    year = y;
    month = m;
    day = d;
  }

  if (!year || !month || !day) return "Updated";

  const due = new Date(year, month - 1, day).setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return "Overdue";
  if (diff <= 30) return "Due Soon";
  return "Updated";
}

// Resolve the schedule row that applies to a vaccine for a given species/dose.
// - species_id null on the schedule row means "applies to every species".
// - If the exact dose is not mapped, repeat the LAST row for that vaccine/species.
function resolveScheduleRow(schedules, speciesId, doseNo) {
  if (!schedules || schedules.length === 0) return null;

  const compatible = schedules.filter(
    (s) => s.species_id === null || s.species_id === speciesId
  );

  if (compatible.length === 0) return null;

  const exact = compatible.find(
    (s) => Number(s.dose_no) === Number(doseNo)
  );
  if (exact) return exact;

  return compatible.reduce((lastRow, s) =>
    Number(s.dose_no) > Number(lastRow.dose_no) ? s : lastRow
  );
}

// ======================================================
// Vaccination billing helpers
// ======================================================
//
// A vaccination record is billed as a standalone payment_monitoring row so the
// charge appears in both staff payment monitoring and the owner's payment
// history. The payment reference is derived from the vaccination record id,
// which lets edit/delete find the exact billing row without a new FK column.

const SPECIES_NAMES = { 1: "Dog", 2: "Cat" };

function speciesIdToName(speciesId) {
  return SPECIES_NAMES[Number(speciesId)] || null;
}

function vaccinationPaymentReference(vaccinationId) {
  return `VAC-${String(vaccinationId).padStart(6, "0")}`;
}

// Pick the best catalog "Vaccines" product for a vaccine + pet species so the
// charge carries a real price. Species compatibility is weighted above name
// overlap; pass a pre-fetched product list to avoid a query per callback.
async function resolveVaccineCatalogProduct(vaccineName, speciesId, products) {
  const list = products || (await db.query(
    `SELECT id, product_name, price, species
     FROM catalog_products
     WHERE category = 'Vaccines' AND active = 1`
  ))[0];
  if (!list || list.length === 0) return null;

  const speciesName = speciesIdToName(speciesId);
  const toTokens = (text) =>
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter((token) => token.length >= 4);

  // "5-in-1 (DHPPL)" vs "5-in-1 Vaccine" share no token of length >= 4, so also
  // compare the fully-normalized strings (digits/hyphens stripped) for a
  // containment hit — "5in1dhppl" contains "5in1".
  const normalizeCore = (text) =>
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");

  const vaccineCore = normalizeCore(vaccineName);
  const vaccineTokens = toTokens(vaccineName);
  if (vaccineTokens.length === 0 && vaccineCore.length < 4) return null;

  let best = null;
  let bestScore = -1;

  for (const product of list) {
    const productTokens = toTokens(product.product_name);
    if (productTokens.length === 0) continue;

    const shared = productTokens.filter((token) => vaccineTokens.includes(token)).length;
    const productName = String(product.product_name || "").toLowerCase();
    const substringHit = vaccineTokens.some((token) => productName.includes(token));
    const productCore = normalizeCore(product.product_name);
    const coreHit = (() => {
      const a = vaccineCore;
      const b = productCore;
      if (a.length < 4 || b.length < 4) return false;
      const [short, long] = a.length <= b.length ? [a, b] : [b, a];
      for (let len = short.length; len >= 4; len--) {
        for (let i = 0; i + len <= short.length; i++) {
          if (long.includes(short.slice(i, i + len))) return true;
        }
      }
      return false;
    })();
    if (shared === 0 && !substringHit && !coreHit) continue;

    const speciesScore =
      product.species && speciesName
        ? String(product.species).toLowerCase() === speciesName.toLowerCase()
          ? 100
          : 0
        : 40;
    const score = speciesScore + (shared || (substringHit ? 1 : 0) || (coreHit ? 1 : 0)) * 10;

    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }

  return best
    ? { id: Number(best.id), product_name: best.product_name, price: Number(best.price) }
    : null;
}

function buildVaccinationPaymentItems(vaccine, doseLabel, doseNo, price, catalogProductId) {
  return JSON.stringify([
    {
      service_name: vaccine ? vaccine.vaccine_name : "Vaccination",
      dosage: doseLabel || `Dose ${doseNo}`,
      quantity: 1,
      unit_price: price,
      line_total: price,
      catalog_product_id: catalogProductId,
    },
  ]);
}

const VACCINE_CATALOG_SQL = `SELECT id, product_name, price, species
     FROM catalog_products
     WHERE category = 'Vaccines' AND active = 1`;

// ======================================================
// GET MY VACCINATION HISTORY (PET OWNER)
// ======================================================

async function getMyVaccinationHistory(req, res) {
  try {
    const [rows] = await db.query(
      `
      SELECT
        vr.*,
        v.vaccine_name,
        p.name AS pet_name
      FROM vaccination_records vr
      JOIN vaccines v
        ON vr.vaccine_id = v.id
      JOIN pets p
        ON vr.pet_id = p.id
      JOIN pet_owners po
        ON p.pet_owner_id = po.id
      WHERE po.user_id = ?
      ORDER BY vr.next_due_date ASC
      `,
      [req.user.id]
    );

    res.json({
      success: true,
      records: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load vaccination history.",
      error: error.message,
    });
  }
}

// ======================================================
// GET PET VACCINATION HISTORY (STAFF)
// ======================================================

async function getPetVaccinationHistory(req, res) {
  try {
    const { petId } = req.params;

    // Fetch full history
    const [history] = await db.query(
      `
      SELECT
        vr.*,
        v.vaccine_name,
        v.interval_days,
        p.name AS pet_name,
        po.full_name AS owner_name,
        po.barangay
      FROM vaccination_records vr
      JOIN vaccines v ON vr.vaccine_id = v.id
      JOIN pets p ON vr.pet_id = p.id
      JOIN pet_owners po ON p.pet_owner_id = po.id
      WHERE vr.pet_id = ?
      ORDER BY vr.date_administered DESC, vr.id DESC
      `,
      [petId]
    );

    // Fetch basic pet info for the card
    const [petRows] = await db.query(
      `
      SELECT
        p.id, p.name, p.pet_code, p.species_id, p.breed_id, p.breed_custom,
        s.species_name,
        COALESCE(b.breed_name, p.breed_custom) AS breed_name,
        po.full_name AS owner_name, po.barangay
      FROM pets p
      JOIN pet_owners po ON p.pet_owner_id = po.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      WHERE p.id = ?
      `,
      [petId]
    );

    const petInfo = petRows[0];

    if (!petInfo) {
      return res.status(404).json({
        success: false,
        message: "Pet not found.",
      });
    }

    // Latest record = most recently administered vaccination
    let latestRecord = null;
    let latestStatus = "No Records";

    if (history.length > 0) {
      latestRecord = history[0];
      latestStatus = computeDisplayStatus(latestRecord.next_due_date);
    }

    res.json({
      success: true,
      pet: petInfo,
      latest: {
        ...latestRecord,
        status: latestStatus,
      },
      history: history,
    });
  } catch (error) {
    console.error("Error in getPetVaccinationHistory:", error);
    res.status(500).json({
      success: false,
      message: "Could not load pet vaccination history.",
      error: error.message,
    });
  }
}

// ======================================================

async function getAllVaccinations(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT
        vr.*,
        v.vaccine_name,
        p.name AS pet_name,
        p.pet_code,
        p.species_id,
        s.species_name,
        po.full_name AS owner_name

      FROM vaccination_records vr

      JOIN vaccines v
        ON vr.vaccine_id = v.id

      JOIN pets p
        ON vr.pet_id = p.id

      JOIN pet_owners po
        ON p.pet_owner_id = po.id

      LEFT JOIN species s
        ON p.species_id = s.id

      ORDER BY vr.next_due_date ASC
    `);

    const records = rows.map((record) => ({
      ...record,
      status: computeDisplayStatus(record.next_due_date),
    }));

    res.json({
      success: true,
      records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load vaccination records.",
      error: error.message,
    });
  }
}

// ======================================================
// GET VACCINE LIST (optionally filtered by species)
// ======================================================

async function getVaccineList(req, res) {
  try {
    const { species_id } = req.query;

    const vaccineParams = [];
    let vaccineWhere = "";
    if (species_id) {
      vaccineWhere = "WHERE (species_id IS NULL OR species_id = ?)";
      vaccineParams.push(Number(species_id));
    }

    const [vaccines] = await db.query(
      `SELECT * FROM vaccines ${vaccineWhere} ORDER BY id`,
      vaccineParams
    );

    const scheduleParams = [];
    let scheduleWhere = "";
    if (species_id) {
      scheduleWhere = "WHERE (species_id IS NULL OR species_id = ?)";
      scheduleParams.push(Number(species_id));
    }

    const [schedules] = await db.query(
      `SELECT * FROM vaccine_schedules ${scheduleWhere} ORDER BY vaccine_id, dose_no`,
      scheduleParams
    );

    const schedulesByVaccine = {};
    schedules.forEach((schedule) => {
      if (!schedulesByVaccine[schedule.vaccine_id]) {
        schedulesByVaccine[schedule.vaccine_id] = [];
      }
      schedulesByVaccine[schedule.vaccine_id].push(schedule);
    });

    const [catalogProducts] = await db.query(VACCINE_CATALOG_SQL);

    const result = await Promise.all(
      vaccines.map(async (vaccine) => {
        const catalogProduct = await resolveVaccineCatalogProduct(
          vaccine.vaccine_name,
          vaccine.species_id,
          catalogProducts
        );
        return {
          ...vaccine,
          schedules: schedulesByVaccine[vaccine.id] || [],
          catalog_product_id: catalogProduct ? catalogProduct.id : null,
          catalog_product_name: catalogProduct ? catalogProduct.product_name : null,
          price: catalogProduct ? catalogProduct.price : null,
        };
      })
    );

    res.json({
      success: true,
      vaccines: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load vaccine list.",
      error: error.message,
    });
  }
}

// ======================================================
// RECORD VACCINATION
// ======================================================

async function recordVaccination(req, res) {
  const {
    pet_id,
    vaccine_id,
    date_administered,
    next_due_date,
    dose_no,
    comments,
  } = req.body;

  if (!pet_id || !vaccine_id || !date_administered) {
    return validationError(res, "Please correct the highlighted fields.", {
      pet_id: pet_id ? undefined : "Select a pet.",
      vaccine_id: vaccine_id ? undefined : "Select a vaccine.",
      date_administered: date_administered ? undefined : "Date administered is required.",
    });
  }

  try {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Pet species determines which schedule applies
      const [[pet]] = await connection.query(
        `SELECT id, name, species_id, pet_owner_id
         FROM pets
         WHERE id = ?`,
        [pet_id]
      );

      if (!pet) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: "Pet not found.",
        });
      }

      const [[owner]] = await connection.query(
        `SELECT user_id FROM pet_owners WHERE id = ?`,
        [pet.pet_owner_id]
      );
      const ownerUserId = owner ? owner.user_id : null;

      // Load this vaccine's schedules (species applies to every species or this pet)
      const [schedules] = await connection.query(
        `SELECT * FROM vaccine_schedules
         WHERE vaccine_id = ?
           AND (species_id IS NULL OR species_id = ?)
         ORDER BY dose_no`,
        [vaccine_id, pet.species_id]
      );

      const [[vaccine]] = await connection.query(
        `SELECT id, vaccine_name, species_id, interval_days FROM vaccines WHERE id = ?`,
        [vaccine_id]
      );

      // Determine dose / series stage
      let effectiveDoseNo = parseInt(dose_no, 10);
      let effectiveDoseLabel = null;

      if (!Number.isInteger(effectiveDoseNo) || effectiveDoseNo < 1) {
        const [[countRow]] = await connection.query(
          `SELECT COUNT(*) AS cnt FROM vaccination_records
           WHERE pet_id = ? AND vaccine_id = ?`,
          [pet_id, vaccine_id]
        );
        effectiveDoseNo = Number(countRow.cnt) + 1;
      }

      // Resolve schedule and compute Next Due automatically when possible
      const scheduleRow = resolveScheduleRow(schedules, pet.species_id, effectiveDoseNo);
      let computedNextDue = next_due_date || null;

      if (scheduleRow) {
        effectiveDoseLabel = scheduleRow.dose_label;
        // Next Due is computed from the configured schedule, never guessed by the client.
        computedNextDue = addDaysToISO(date_administered, scheduleRow.interval_days);
      }

      const validation = validateVaccinationRecord({
        pet_id,
        vaccine_id,
        date_administered,
        next_due_date: computedNextDue,
      });

      if (!validation.valid) {
        await connection.rollback();
        connection.release();
        return validationError(res, validation.message, validation.errors);
      }

      const [result] = await connection.query(
        `
        INSERT INTO vaccination_records
        (
          pet_id,
          vaccine_id,
          dose_no,
          dose_label,
          date_administered,
          next_due_date,
          status,
          administered_by,
          comments
        )

        VALUES
        (
          ?, ?, ?, ?, ?, ?, 'Updated', ?, ?
        )
        `,
        [
          pet_id,
          vaccine_id,
          effectiveDoseNo,
          effectiveDoseLabel,
          date_administered,
          computedNextDue,
          req.user.id,
          comments || null,
        ]
      );

      const vaccinationId = result.insertId;

      // Bill the vaccination so the charge shows up in staff payment monitoring
      // and the owner's payment history.
      const [catalogProducts] = await connection.query(VACCINE_CATALOG_SQL);
      const catalogProduct = await resolveVaccineCatalogProduct(
        vaccine ? vaccine.vaccine_name : "",
        pet.species_id,
        catalogProducts
      );
      const unitPrice = catalogProduct ? catalogProduct.price : 0;
      const paymentItems = buildVaccinationPaymentItems(
        vaccine,
        effectiveDoseLabel,
        effectiveDoseNo,
        unitPrice,
        catalogProduct ? catalogProduct.id : null
      );
      const vaccineLabel = vaccine ? vaccine.vaccine_name : `Vaccine #${vaccine_id}`;
      const paymentReference = vaccinationPaymentReference(vaccinationId);

      await connection.query(
        `INSERT INTO payment_monitoring
         (pet_owner_id, pet_id, payment_type, payment_reference, payment_status,
          total_amount, or_amount, or_date, payment_items, recorded_by, remarks,
          consultation_date)
         VALUES (?, ?, 'Vaccination', ?, 'Unpaid', ?, ?, ?, ?, ?, ?, ?)`,
        [
          pet.pet_owner_id,
          pet_id,
          paymentReference,
          unitPrice,
          unitPrice,
          date_administered || null,
          paymentItems,
          req.user.id,
          `Vaccination — ${vaccineLabel}${effectiveDoseLabel ? ` (${effectiveDoseLabel})` : ""}`,
          date_administered || null,
        ]
      );

      await connection.commit();
      connection.release();

      if (global.io) global.io.emit("data-changed", { type: "vaccination-recorded" });

      // Notification: Vaccination Updated

      await createNotification(
        ownerUserId,
        "Vaccination Updated",
        `${pet.name} has been vaccinated.`,
        "Vaccination",
        false,
        "vaccinations"
      );

      const unitPriceNumber = Number(unitPrice) || 0;
      if (unitPriceNumber > 0) {
        await createNotification(
          ownerUserId,
          `Unpaid Charge — ${pet.name}`,
          `You have an unpaid ${vaccineLabel} vaccination charge of ₱${unitPriceNumber.toFixed(2)} for ${pet.name}. Settle at the City Treasurer's office for the latest record to appear.`,
          "Payment",
          false,
          "payments"
        );
      }

      // Check Due Date

      if (computedNextDue) {
        await sendDueReminder({
          userId: ownerUserId,
          petName: pet.name,
          dueDate: computedNextDue,
          category: "Vaccination",
          type: "Vaccination",
          link: "vaccinations",
        });
      }

      res.status(201).json({
        success: true,
        message: "Vaccination record saved.",
        payment_reference: paymentReference,
      });

      await logAudit(req, {
        action: 'CREATE',
        entity_type: 'vaccination',
        entity_id: vaccinationId,
        new_value: {
          pet_id,
          vaccine_id,
          dose_no: effectiveDoseNo,
          dose_label: effectiveDoseLabel,
          date_administered,
          next_due_date: computedNextDue,
        },
        description: `Vaccination recorded for "${pet.name}" — ${vaccineLabel} (dose ${effectiveDoseNo || '—'}) on ${date_administered}`
      });
    } catch (error) {
      await connection.rollback().catch(() => {});
      connection.release();
      throw error;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not save vaccination record.",
      error: error.message,
    });
  }
}

// ======================================================
// UPDATE VACCINATION
// ======================================================

async function updateVaccination(req, res) {
  const vaccinationId = Number(req.params.id);
  if (!Number.isInteger(vaccinationId) || vaccinationId < 1) {
    return res.status(400).json({
      success: false,
      message: "A valid vaccination record is required.",
    });
  }

  const {
    vaccine_id,
    date_administered,
    next_due_date,
    dose_no,
    comments,
  } = req.body;

  if (!vaccine_id || !date_administered) {
    return validationError(res, "Please correct the highlighted fields.", {
      vaccine_id: vaccine_id ? undefined : "Select a vaccine.",
      date_administered: date_administered ? undefined : "Date administered is required.",
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [[existing]] = await connection.query(
      `SELECT * FROM vaccination_records WHERE id = ?`,
      [vaccinationId]
    );
    if (!existing) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({
        success: false,
        message: "Vaccination record not found.",
      });
    }

    const [[pet]] = await connection.query(
      `SELECT id, name, species_id, pet_owner_id
       FROM pets
       WHERE id = ?`,
      [existing.pet_id]
    );
    if (!pet) {
      throw Object.assign(new Error("The linked pet no longer exists."), { statusCode: 409 });
    }

    const [schedules] = await connection.query(
      `SELECT * FROM vaccine_schedules
       WHERE vaccine_id = ?
         AND (species_id IS NULL OR species_id = ?)
       ORDER BY dose_no`,
      [vaccine_id, pet.species_id]
    );

    const [[vaccine]] = await connection.query(
      `SELECT id, vaccine_name, species_id, interval_days FROM vaccines WHERE id = ?`,
      [vaccine_id]
    );

    let effectiveDoseNo = parseInt(dose_no, 10);
    if (!Number.isInteger(effectiveDoseNo) || effectiveDoseNo < 1) {
      effectiveDoseNo = Number(existing.dose_no) || 1;
    }

    const scheduleRow = resolveScheduleRow(schedules, pet.species_id, effectiveDoseNo);
    let computedNextDue = next_due_date || null;

    if (scheduleRow) {
      computedNextDue = addDaysToISO(date_administered, scheduleRow.interval_days);
    }

    const validation = validateVaccinationRecord({
      pet_id: pet.id,
      vaccine_id,
      date_administered,
      next_due_date: computedNextDue,
    });

    if (!validation.valid) {
      await connection.rollback();
      connection.release();
      return validationError(res, validation.message, validation.errors);
    }

    await connection.query(
      `UPDATE vaccination_records
       SET vaccine_id = ?, dose_no = ?, dose_label = ?, date_administered = ?,
           next_due_date = ?, status = 'Updated', administered_by = ?, comments = ?
       WHERE id = ?`,
      [
        vaccine_id,
        effectiveDoseNo,
        scheduleRow ? scheduleRow.dose_label : null,
        date_administered,
        computedNextDue,
        req.user.id,
        comments || null,
        vaccinationId,
      ]
    );

    // Keep the billing row in sync with the corrected vaccination.
    const [catalogProducts] = await connection.query(VACCINE_CATALOG_SQL);
    const catalogProduct = await resolveVaccineCatalogProduct(
      vaccine ? vaccine.vaccine_name : "",
      pet.species_id,
      catalogProducts
    );
    const unitPrice = catalogProduct ? catalogProduct.price : 0;
    const paymentItems = buildVaccinationPaymentItems(
      vaccine,
      scheduleRow ? scheduleRow.dose_label : null,
      effectiveDoseNo,
      unitPrice,
      catalogProduct ? catalogProduct.id : null
    );
    const vaccineLabel = vaccine ? vaccine.vaccine_name : `Vaccine #${vaccine_id}`;
    const paymentReference = vaccinationPaymentReference(vaccinationId);

    await connection.query(
      `UPDATE payment_monitoring
       SET total_amount = ?, or_amount = ?, or_date = ?, payment_items = ?,
           consultation_date = ?, remarks = ?
       WHERE payment_reference = ?`,
      [
        unitPrice,
        unitPrice,
        date_administered || null,
        paymentItems,
        date_administered || null,
        `Vaccination — ${vaccineLabel}${scheduleRow ? ` (${scheduleRow.dose_label})` : ""}`,
        paymentReference,
      ]
    );

    await connection.commit();
    connection.release();

    if (global.io) global.io.emit("data-changed", { type: "vaccination-updated" });

    res.json({
      success: true,
      message: "Vaccination record updated.",
      payment_reference: paymentReference,
    });

    await logAudit(req, {
      action: 'UPDATE',
      entity_type: 'vaccination',
      entity_id: vaccinationId,
      old_value: {
        vaccine_id: existing.vaccine_id,
        dose_no: existing.dose_no,
        date_administered: existing.date_administered,
        next_due_date: existing.next_due_date,
      },
      new_value: {
        vaccine_id,
        dose_no: effectiveDoseNo,
        dose_label: scheduleRow ? scheduleRow.dose_label : null,
        date_administered,
        next_due_date: computedNextDue,
      },
      description: `Vaccination updated for "${pet.name}" — ${vaccineLabel} (dose ${effectiveDoseNo || '—'}) on ${date_administered}`
    });

  } catch (error) {
    await connection.rollback().catch(() => {});
    connection.release();
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: statusCode === 409 ? error.message : "Could not update vaccination record.",
      error: error.message,
    });
  }
}

// ======================================================
// DELETE VACCINATION
// ======================================================

async function deleteVaccination(req, res) {
  const vaccinationId = Number(req.params.id);
  if (!Number.isInteger(vaccinationId) || vaccinationId < 1) {
    return res.status(400).json({
      success: false,
      message: "A valid vaccination record is required.",
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [[existing]] = await connection.query(
      `SELECT vr.*,
              p.name AS pet_name,
              v.vaccine_name
       FROM vaccination_records vr
       JOIN pets p ON p.id = vr.pet_id
       LEFT JOIN vaccines v ON v.id = vr.vaccine_id
       WHERE vr.id = ?`,
      [vaccinationId]
    );
    if (!existing) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({
        success: false,
        message: "Vaccination record not found.",
      });
    }

    // Remove the linked billing row first so the owner and staff payment views
    // do not keep showing a charge for a deleted vaccination.
    await connection.query(
      `DELETE FROM payment_monitoring WHERE payment_reference = ?`,
      [vaccinationPaymentReference(vaccinationId)]
    );
    await connection.query(
      `DELETE FROM vaccination_records WHERE id = ?`,
      [vaccinationId]
    );

    await connection.commit();
    connection.release();

    if (global.io) global.io.emit("data-changed", { type: "vaccination-deleted" });

    res.json({
      success: true,
      message: "Vaccination record deleted.",
    });

    await logAudit(req, {
      action: 'DELETE',
      entity_type: 'vaccination',
      entity_id: vaccinationId,
      old_value: {
        pet_id: existing.pet_id,
        vaccine_id: existing.vaccine_id,
        dose_no: existing.dose_no,
        date_administered: existing.date_administered,
      },
      description: `Deleted vaccination record for "${existing.pet_name}" — ${existing.vaccine_name || 'unknown vaccine'}`
    });

  } catch (error) {
    await connection.rollback().catch(() => {});
    connection.release();
    console.error("Delete vaccination error:", error);
    res.status(500).json({
      success: false,
      message: "Could not delete vaccination record.",
      error: error.message,
    });
  }
}

module.exports = {
  getMyVaccinationHistory,
  getPetVaccinationHistory,
  getAllVaccinations,
  getVaccineList,
  recordVaccination,
  updateVaccination,
  deleteVaccination,
};