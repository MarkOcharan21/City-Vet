const crypto = require('crypto');
const db = require('../config/db');
const { isPg } = require('../config/sql');
const { createNotification, notifyUsersByRoles } = require('../services/notificationService');
const { sendDueReminder } = require('../services/dueReminderService');
const {
  validationError,
  validateClinicalRecord,
  validatePrescriptionItems,
} = require('../utils/validation');
const { logAudit } = require('../middleware/auditMiddleware');
const { vetNameExpr } = require('../utils/vetNameFormat');
const { getOwnerUnpaidBlocking } = require('../utils/paymentBlocking');
const queueLock = require('../services/clinicQueueLock');
const { insertPrescription, notifyPrescriptionOwner } = require('../services/prescriptionService');
const { paymentTypeForCategory } = require('./catalogController');

// A walk-in (no queue entry) consultation is only treated as a resubmission of the
// same request when it was created for the same consultation date inside this
// window. Without the window a pet's second visit would silently replay the first
// visit's record and never generate a payment.
const WALK_IN_DUPLICATE_WINDOW_SECONDS = 120;

// Normalises a DATE column (a JS Date from mysql2) or an 'YYYY-MM-DD' string to a
// comparable 'YYYY-MM-DD' key using local calendar parts.
function toDateKey(value) {
  if (!value) return '';
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

// A transaction can hold at most one consultation fee, so a vaccine-only or
// medicine-only visit is classified by what it actually contains.
function paymentTypeForLines(lines) {
  const types = new Set(lines.map((line) => line.paymentType));
  if (types.size === 1) return [...types][0];
  if (types.has('Consultation')) return 'Consultation';
  if (types.has('Vaccination')) return 'Vaccination';
  return 'Medicine';
}

// GET /api/clinical/my-records  (Pet Owner view)
async function getMyClinicalRecords(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT cr.*, p.name AS pet_name, ${vetNameExpr('vet_name')}
       FROM consultation_records cr
       JOIN pets p ON cr.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       LEFT JOIN users u ON cr.vet_id = u.id
       WHERE po.user_id = ?
       ORDER BY cr.consultation_date DESC`,
      [req.user.id]
    );

    const petIds = [...new Set(rows.map((r) => r.pet_id).filter((id) => id != null))];
    const unpaid = await getOwnerUnpaidBlocking(petIds);
    const blockedConsultations = new Set(unpaid.blocked.consultations);

    for (const row of rows) {
      row.is_blocked = blockedConsultations.has(Number(row.id));
    }

    res.json({ success: true, records: rows, unpaid });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load consultation records.', error: error.message });
  }
}

// GET /api/clinical  (Staff/Vet - all consultation records)
async function getAllClinicalRecords(req, res) {
  try {
    const { pet_id } = req.query;
    let query = `
      SELECT cr.*,
              p.name AS pet_name,
              p.pet_code,
              po.full_name AS owner_name,
              ${vetNameExpr('vet_name')}
       FROM consultation_records cr
       JOIN pets p ON cr.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       LEFT JOIN users u ON cr.vet_id = u.id
    `;
    const params = [];

    if (pet_id) {
      query += ` WHERE cr.pet_id = ?`;
      params.push(pet_id);
    }

    query += ` ORDER BY cr.consultation_date DESC, cr.created_at DESC`;

    const [rows] = await db.query(query, params);
    res.json({ success: true, records: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load consultation records.', error: error.message });
  }
}

function clinicalError(statusCode, message, details = {}) {
  return Object.assign(new Error(message), { statusCode, ...details });
}

function parseMoneyToCents(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw clinicalError(500, 'A catalog product has an invalid price.');
  }
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 9999999999) {
    throw clinicalError(500, 'A catalog product price is outside the supported range.');
  }
  return cents;
}

function formatCents(cents) {
  return (cents / 100).toFixed(2);
}

function createPaymentReference() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `PM-${date}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function normalizeChargeInput(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw clinicalError(400, 'Charges must be an array.');
  const merged = new Map();
  for (const item of value) {
    const catalogProductId = Number(item?.catalog_product_id ?? item?.product_id);
    const quantity = Number(item?.quantity ?? 1);
    if (!Number.isInteger(catalogProductId) || catalogProductId < 1) {
      throw clinicalError(400, 'Each charge must have a valid catalog product.');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw clinicalError(400, 'Charge quantity must be an integer of at least 1.');
    }
    const current = merged.get(catalogProductId) || 0;
    const nextQuantity = current + quantity;
    if (!Number.isSafeInteger(nextQuantity)) {
      throw clinicalError(400, 'Charge quantity is too large.');
    }
    merged.set(catalogProductId, nextQuantity);
  }
  return [...merged.entries()].map(([catalogProductId, quantity]) => ({ catalogProductId, quantity }));
}

async function loadConsultationResponse(consultationId, queueId = null) {
  const [consultationRows] = await db.query(
    `SELECT cr.id,
            cr.pet_id,
            cr.queue_id,
            cr.complaint,
            cr.diagnosis,
            cr.treatment_plan,
            cr.consultation_date,
            cr.follow_up_date,
            cr.vet_id,
            cr.created_at,
            p.name AS pet_name,
            p.pet_code,
            po.id AS pet_owner_id,
            po.full_name AS owner_name,
            COALESCE(vet.full_name, vet.email) AS veterinarian_name
     FROM consultation_records cr
     JOIN pets p ON p.id = cr.pet_id
     JOIN pet_owners po ON po.id = p.pet_owner_id
     LEFT JOIN users vet ON vet.id = cr.vet_id
     WHERE cr.id = ?
     LIMIT 1`,
    [consultationId],
  );
  const consultation = consultationRows[0] || null;
  if (!consultation) return null;

  const [paymentRows] = await db.query(
    `SELECT id,
            consultation_id,
            payment_reference,
            payment_status,
            total_amount,
            consultation_date,
            status_updated_by,
            status_updated_at,
            created_at
     FROM payment_monitoring
     WHERE consultation_id = ?
     LIMIT 1`,
    [consultationId],
  );
  const paymentRow = paymentRows[0] || null;
  const [chargeRows] = await db.query(
    `SELECT id,
            catalog_product_id,
            description,
            quantity,
            unit_price,
            line_total
     FROM consultation_charges
     WHERE consultation_id = ?
     ORDER BY id ASC`,
    [consultationId],
  );
  const charges = chargeRows.map((charge) => ({
    ...charge,
    quantity: Number(charge.quantity),
    unit_price: Number(charge.unit_price),
    line_total: Number(charge.line_total),
  }));
  const payment = paymentRow
    ? {
        id: paymentRow.id,
        paymentId: paymentRow.id,
        consultationId: paymentRow.consultation_id,
        paymentReference: paymentRow.payment_reference,
        paymentStatus: paymentRow.payment_status,
        totalAmount: Number(paymentRow.total_amount),
        consultationDate: paymentRow.consultation_date,
        statusUpdatedBy: paymentRow.status_updated_by,
        statusUpdatedAt: paymentRow.status_updated_at,
        createdAt: paymentRow.created_at,
      }
    : null;

  return {
    consultation,
    charges,
    payment,
    consultationId: consultation.id,
    queueId: queueId ?? consultation.queue_id,
    paymentId: payment?.paymentId ?? null,
    paymentReference: payment?.paymentReference ?? null,
    paymentStatus: payment?.paymentStatus ?? 'Unpaid',
    totalAmount: payment?.totalAmount ?? 0,
  };
}

// POST /api/clinical  (Vet adds a consultation record)
async function addClinicalRecord(req, res) {
  const body = req.body || {};
  const petId = Number(body.pet_id);
  const queueId = Number(body.queue_id);
  const hasQueue = Number.isInteger(queueId) && queueId >= 1;
  const complaint = body.complaint === undefined || body.complaint === null ? null : String(body.complaint).trim().slice(0, 255) || null;
  const diagnosis = body.diagnosis || null;
  const treatmentPlan = body.treatment_plan || null;
  const consultationDate = body.consultation_date;
  const followUpDate = body.follow_up_date || null;
  const validation = validateClinicalRecord({ pet_id: petId, consultation_date: consultationDate, follow_up_date: followUpDate });

  if (!validation.valid) {
    return validationError(res, validation.message, validation.errors);
  }
  if (!Number.isInteger(petId) || petId < 1) {
    return validationError(res, 'A pet is required.', { pet_id: 'Select a pet.' });
  }

  let chargeInput;
  try {
    chargeInput = normalizeChargeInput(body.charges);
  } catch (error) {
    return validationError(res, error.message);
  }
  if (!chargeInput.length) {
    return validationError(res, 'At least one consultation charge is required.');
  }

  // Medicines ride along with the consultation in the same transaction, so a
  // visit can never end up saved without the prescription the vet just wrote,
  // and a bad medicine line can never leave a half-saved consultation behind.
  const prescriptionItems = Array.isArray(body.prescription) ? body.prescription : [];
  const prescriptionValidation = validatePrescriptionItems(prescriptionItems);
  if (!prescriptionValidation.valid) {
    return validationError(res, prescriptionValidation.message, prescriptionValidation.errors);
  }

  let connection;
  let lockAcquired = false;
  let transactionStarted = false;
  let consultationId;
  let prescriptionId;
  let paymentId;
  let paymentReference;
  let totalCents = 0;
  let pet;
  let queueRow;
  let queueCompleted = false;
  let idempotent = false;
  let created = false;

  try {
    connection = await db.getConnection();
    lockAcquired = await queueLock.acquire(connection);
    if (!lockAcquired) {
      return res.status(503).json({ success: false, message: 'Another queue update is in progress. Please try again.' });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    if (hasQueue) {
      const [existingRows] = await connection.query(
        `SELECT id, pet_id FROM consultation_records WHERE queue_id = ? LIMIT 1 FOR UPDATE`,
        [queueId],
      );
      if (existingRows[0]) {
        if (Number(existingRows[0].pet_id) !== petId) {
          throw clinicalError(409, 'The queue entry belongs to a different pet.');
        }
        consultationId = existingRows[0].id;
        idempotent = true;
        await connection.rollback();
        transactionStarted = false;
      } else {
        const [queueRows] = await connection.query(
          `SELECT q.id, q.pet_id, q.batch_id, q.status, q.veterinarian_id, p.name AS pet_name, p.pet_code, p.status AS pet_status, p.pet_owner_id, po.user_id AS owner_user_id FROM clinic_queue q JOIN pets p ON p.id = q.pet_id JOIN pet_owners po ON po.id = p.pet_owner_id WHERE q.id = ? LIMIT 1 FOR UPDATE`,
          [queueId],
        );
        queueRow = queueRows[0] || null;
        if (!queueRow) throw clinicalError(404, 'Queue entry not found.');
        if (queueRow.pet_status !== 'Verified') throw clinicalError(409, `${queueRow.pet_name} is not yet verified. Verify the pet registration before consulting.`);
        if (Number(queueRow.pet_id) !== petId) throw clinicalError(409, 'The queue entry does not match the selected pet.');
        if (!['Waiting', 'In Consultation'].includes(queueRow.status)) throw clinicalError(409, 'The queue entry has already been finalized.');
        if (req.user.role === 'Veterinarian' && queueRow.veterinarian_id != null && Number(queueRow.veterinarian_id) !== Number(req.user.id)) throw clinicalError(409, 'This queue entry is assigned to another veterinarian.');

        const productIds = chargeInput.map((c) => c.catalogProductId);
        const products = [];
        if (productIds.length > 0) {
          const placeholders = productIds.map(() => '?').join(', ');
          const [productRows] = await connection.query(`SELECT id, category, product_name, price FROM catalog_products WHERE id IN (${placeholders}) AND active = 1 FOR UPDATE`, productIds);
          products.push(...productRows);
        }
        const productMap = new Map(products.map((p) => [Number(p.id), p]));
        if (products.length !== productIds.length) throw clinicalError(400, `Catalog product ${productIds.find((id) => !productMap.has(id))} is unavailable.`);

        const lines = chargeInput.map((charge) => {
          const product = productMap.get(charge.catalogProductId);
          const unitPriceCents = parseMoneyToCents(product.price);
          const lineTotalCents = unitPriceCents * charge.quantity;
          if (!Number.isSafeInteger(lineTotalCents) || lineTotalCents > 9999999999) throw clinicalError(400, 'The charge total is outside the supported range.');
          return { catalogProductId: charge.catalogProductId, description: product.product_name, quantity: charge.quantity, unitPrice: unitPriceCents, lineTotal: lineTotalCents, paymentType: paymentTypeForCategory(product.category) };
        });
        totalCents = lines.reduce((sum, line) => sum + line.lineTotal, 0);
        if (!Number.isSafeInteger(totalCents) || totalCents > 9999999999) throw clinicalError(400, 'The consultation total is outside the supported range.');

        const assignedVeterinarianId = queueRow.veterinarian_id || (req.user.role === 'Veterinarian' ? req.user.id : null);
        const recordedBy = assignedVeterinarianId || req.user.id;
        const [consultationResult] = await connection.query(`INSERT INTO consultation_records (pet_id, queue_id, complaint, diagnosis, treatment_plan, consultation_date, follow_up_date, vet_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [petId, queueId, complaint, diagnosis, treatmentPlan, consultationDate, followUpDate, assignedVeterinarianId]);
        consultationId = consultationResult.insertId;
        pet = { name: queueRow.pet_name, pet_code: queueRow.pet_code, pet_owner_id: queueRow.pet_owner_id, user_id: queueRow.owner_user_id };

        for (const line of lines) {
          await connection.query(`INSERT INTO consultation_charges (consultation_id, catalog_product_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?)`, [consultationId, line.catalogProductId, line.description, line.quantity, formatCents(line.unitPrice), formatCents(line.lineTotal)]);
        }

        paymentReference = createPaymentReference();
        const totalAmount = formatCents(totalCents);
        const paymentItems = JSON.stringify(lines.map((line) => ({ catalog_product_id: line.catalogProductId, description: line.description, quantity: line.quantity, unit_price: formatCents(line.unitPrice), line_total: formatCents(line.lineTotal) })));
        const [paymentResult] = await connection.query(`INSERT INTO payment_monitoring (payment_items, pet_owner_id, pet_id, payment_type, recorded_by, consultation_id, payment_reference, payment_status, total_amount, consultation_date, status_updated_by, status_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'Unpaid', ?, ?, ?, CURRENT_TIMESTAMP)`, [paymentItems, queueRow.pet_owner_id, petId, paymentTypeForLines(lines), recordedBy, consultationId, paymentReference, totalAmount, consultationDate, recordedBy]);
        paymentId = paymentResult.insertId;

        const [queueResult] = await connection.query(`UPDATE clinic_queue SET status = 'Completed', veterinarian_id = COALESCE(veterinarian_id, ?), completed_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('Waiting', 'In Consultation')`, [assignedVeterinarianId, queueId]);
        if (queueResult.affectedRows === 0) throw clinicalError(409, 'The queue entry changed while the consultation was being saved.');
        queueCompleted = true;

        if (prescriptionItems.length) {
          prescriptionId = await insertPrescription(connection, consultationId, prescriptionItems);
        }

        if (queueRow.batch_id) {
          const [[remaining]] = await connection.query(`SELECT COUNT(*) AS count FROM clinic_queue WHERE batch_id = ? AND status IN ('Waiting', 'In Consultation')`, [queueRow.batch_id]);
          if (Number(remaining.count) === 0) await connection.query(`UPDATE consultation_batches SET status = 'Completed' WHERE id = ? AND status = 'Active'`, [queueRow.batch_id]);
        }

        await connection.commit();
        transactionStarted = false;
        created = true;
      }
    } else {
      const [existingRows] = await connection.query(`SELECT id, pet_id, consultation_date, created_at, EXTRACT(EPOCH FROM (NOW() - created_at)) AS age_seconds FROM consultation_records WHERE pet_id = ? AND queue_id IS NULL ORDER BY id DESC LIMIT 1 FOR UPDATE`, [petId]);
      const existing = existingRows[0];
      // Only replay a previous walk-in when it is plausibly the same submission:
      // same consultation date and written moments ago. A genuine follow-up visit
      // (later date, or a revisit hours later) must always create a new record.
      const isResubmission = Boolean(existing)
        && toDateKey(existing.consultation_date) === toDateKey(consultationDate)
        && Number(existing.age_seconds) <= WALK_IN_DUPLICATE_WINDOW_SECONDS;
      if (isResubmission) {
        consultationId = existing.id;
        idempotent = true;
        await connection.rollback();
        transactionStarted = false;
      } else {
        const [petRows] = await connection.query(`SELECT p.name AS pet_name, p.pet_code, p.status, p.pet_owner_id, po.user_id AS owner_user_id FROM pets p JOIN pet_owners po ON po.id = p.pet_owner_id WHERE p.id = ? LIMIT 1`, [petId]);
        const petRow = petRows[0];
        if (!petRow) throw clinicalError(404, 'Pet not found.');
        if (petRow.status !== 'Verified') throw clinicalError(409, `${petRow.pet_name} is not yet verified. Verify the pet registration before consulting.`);

        const productIds = chargeInput.map((c) => c.catalogProductId);
        const products = [];
        if (productIds.length > 0) {
          const placeholders = productIds.map(() => '?').join(', ');
          const [productRows] = await connection.query(`SELECT id, category, product_name, price FROM catalog_products WHERE id IN (${placeholders}) AND active = 1 FOR UPDATE`, productIds);
          products.push(...productRows);
        }
        const productMap = new Map(products.map((p) => [Number(p.id), p]));
        if (products.length !== productIds.length) throw clinicalError(400, `Catalog product ${productIds.find((id) => !productMap.has(id))} is unavailable.`);

        const lines = chargeInput.map((charge) => {
          const product = productMap.get(charge.catalogProductId);
          const unitPriceCents = parseMoneyToCents(product.price);
          const lineTotalCents = unitPriceCents * charge.quantity;
          if (!Number.isSafeInteger(lineTotalCents) || lineTotalCents > 9999999999) throw clinicalError(400, 'The charge total is outside the supported range.');
          return { catalogProductId: charge.catalogProductId, description: product.product_name, quantity: charge.quantity, unitPrice: unitPriceCents, lineTotal: lineTotalCents, paymentType: paymentTypeForCategory(product.category) };
        });
        totalCents = lines.reduce((sum, line) => sum + line.lineTotal, 0);
        if (!Number.isSafeInteger(totalCents) || totalCents > 9999999999) throw clinicalError(400, 'The consultation total is outside the supported range.');

        const recordedBy = req.user.role === 'Veterinarian' ? req.user.id : null;
        const [consultationResult] = await connection.query(`INSERT INTO consultation_records (pet_id, complaint, diagnosis, treatment_plan, consultation_date, follow_up_date, vet_id) VALUES (?, ?, ?, ?, ?, ?, ?)`, [petId, complaint, diagnosis, treatmentPlan, consultationDate, followUpDate, recordedBy]);
        consultationId = consultationResult.insertId;
        pet = { name: petRow.pet_name, pet_code: petRow.pet_code, pet_owner_id: petRow.pet_owner_id, user_id: petRow.owner_user_id };

        for (const line of lines) {
          await connection.query(`INSERT INTO consultation_charges (consultation_id, catalog_product_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?)`, [consultationId, line.catalogProductId, line.description, line.quantity, formatCents(line.unitPrice), formatCents(line.lineTotal)]);
        }

        paymentReference = createPaymentReference();
        const totalAmount = formatCents(totalCents);
        const paymentItems = JSON.stringify(lines.map((line) => ({ catalog_product_id: line.catalogProductId, description: line.description, quantity: line.quantity, unit_price: formatCents(line.unitPrice), line_total: formatCents(line.lineTotal) })));
        const [paymentResult] = await connection.query(`INSERT INTO payment_monitoring (payment_items, pet_owner_id, pet_id, payment_type, recorded_by, consultation_id, payment_reference, payment_status, total_amount, consultation_date, status_updated_by, status_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'Unpaid', ?, ?, ?, CURRENT_TIMESTAMP)`, [paymentItems, petRow.pet_owner_id, petId, paymentTypeForLines(lines), recordedBy, consultationId, paymentReference, totalAmount, consultationDate, recordedBy]);
        paymentId = paymentResult.insertId;

        if (prescriptionItems.length) {
          prescriptionId = await insertPrescription(connection, consultationId, prescriptionItems);
        }

        await connection.commit();
        transactionStarted = false;
        created = true;
      }
    }
  } catch (error) {
    if (transactionStarted && connection) {
      await connection.rollback().catch(() => {});
    }
    if (!res.headersSent) {
      res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Could not save consultation record.', ...(error.statusCode ? {} : { error: error.message }) });
    }
    return;
  } finally {
    if (connection) {
      if (lockAcquired) await queueLock.release(connection);
      connection.release();
    }
  }

  let responseData;
  try {
    responseData = await loadConsultationResponse(consultationId, hasQueue ? queueId : null);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Consultation was saved but could not be reloaded.', error: error.message });
  }
  if (!responseData) return res.status(500).json({ success: false, message: 'Consultation was saved but could not be reloaded.' });

  if (global.io) global.io.emit("data-changed", { type: "consultation-added" });

  res.status(idempotent ? 200 : 201).json({ success: true, message: idempotent ? 'Consultation record already exists.' : 'Consultation record saved.', prescriptionId: prescriptionId || null, ...responseData });

  if (!created) return;
  if (pet?.user_id) {
    createNotification(pet.user_id, 'Consultation Record Added', `${pet.name} has a new consultation record.`, 'System', false, 'clinical-medicine').catch((error) => console.warn('Consultation notification failed:', error.message));
    if (totalCents > 0 && paymentReference) {
      createNotification(pet.user_id, `Unpaid Charge — ${pet.name}`, `You have an unpaid consultation charge of ₱${formatCents(totalCents)} for ${pet.name}. Settle at the City Treasurer's office for the latest record to appear.`, 'Payment', false, 'payments').catch((error) => console.warn('Unpaid payment notification failed:', error.message));
    }
    if (followUpDate) {
      sendDueReminder({ userId: pet.user_id, petName: pet.name, dueDate: followUpDate, category: 'Follow-Up Visit', type: 'System', link: 'clinical-medicine' }).catch((error) => console.warn('Consultation follow-up reminder failed:', error.message));
    }
  }
  if (queueCompleted) {
    notifyUsersByRoles(['Staff'], 'Consultation Completed', `${pet?.name || 'The patient'} has a saved consultation record.`, 'ClinicQueue', 'queue', true).catch((error) => console.warn('Queue completion notification failed:', error.message));
  }
  logAudit(req, { action: 'CREATE', entity_type: 'clinical_record', entity_id: consultationId, new_value: { pet_id: petId, queue_id: hasQueue ? queueId : null, payment_reference: paymentReference, payment_id: paymentId, total_amount: formatCents(totalCents) }, description: `Consultation record added for "${pet?.name || petId}" on ${consultationDate}` }).catch((error) => console.warn('Consultation audit log failed:', error.message));

  // Runs after the commit so a notification problem can never roll back a
  // consultation the vet already believes was saved.
  if (prescriptionId) {
    notifyPrescriptionOwner(consultationId)
      .then((notifiedPetName) => logAudit(req, { action: 'CREATE', entity_type: 'prescription', entity_id: prescriptionId, new_value: { consultation_id: consultationId, items_count: prescriptionItems.length }, description: `Prescription saved for "${notifiedPetName || pet?.name || petId}" with ${prescriptionItems.length} item(s)` }))
      .catch((error) => console.warn('Prescription notification failed:', error.message));
  }
}

// POST /api/clinical/mobile-scan-result  (Mobile scanner submits result)
//
// The scanner page is opened on an unauthenticated phone, so this endpoint cannot
// require a JWT without breaking phone scanning. Instead the pet is re-resolved
// from the database using only `pet_id`; the display fields sent by the phone are
// discarded so a scan can never introduce a pet that is not registered.
async function receiveMobileScanResult(req, res) {
  const { session, pet, mode } = req.body || {};
  if (!session || !pet || !pet.pet_id) {
    return res.status(400).json({ success: false, message: "Invalid payload: session and pet required." });
  }
  const sessionId = String(session).trim();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(sessionId)) {
    return res.status(400).json({ success: false, message: "Invalid session." });
  }
  const petId = Number(pet.pet_id);
  if (!Number.isInteger(petId) || petId < 1) {
    return res.status(400).json({ success: false, message: "Invalid pet." });
  }
  const scanMode = mode === "batch" ? "batch" : "single";
  try {
    const [petRows] = await db.query(
      `SELECT p.id AS pet_id, p.name, p.pet_code, p.status, po.full_name AS owner_name FROM pets p JOIN pet_owners po ON po.id = p.pet_owner_id WHERE p.id = ? LIMIT 1`,
      [petId],
    );
    if (!petRows[0]) {
      return res.status(404).json({ success: false, message: "Pet not found." });
    }
    if (petRows[0].status !== 'Verified') {
      return res.status(409).json({ success: false, message: `${petRows[0].name} is not yet verified. Only verified pets can be consulted.` });
    }
    // Only database values are stored, so a scan cannot fabricate a patient.
    const resolved = {
      pet_id: petRows[0].pet_id,
      id: petRows[0].pet_id,
      name: petRows[0].name,
      pet_code: petRows[0].pet_code,
      status: petRows[0].status,
      owner_name: petRows[0].owner_name,
    };
    const [rows] = await db.query(
      `SELECT pet_data FROM mobile_scan_sessions WHERE session_id = ?`,
      [sessionId]
    );
    let pets = [];
    if (rows.length) {
      try {
        const stored = typeof rows[0].pet_data === "string" ? JSON.parse(rows[0].pet_data) : rows[0].pet_data;
        pets = Array.isArray(stored) ? stored : (stored && stored.pet_id ? [stored] : []);
      } catch (_) {
        pets = [];
      }
    }
    const next = pets.some((entry) => Number(entry.pet_id) === petId)
      ? pets
      : [...pets, resolved];

    await db.query(
      `INSERT INTO mobile_scan_sessions (session_id, pet_data, scan_mode, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ${isPg()
         ? `ON CONFLICT (session_id) DO UPDATE
              SET pet_data = EXCLUDED.pet_data,
                  scan_mode = EXCLUDED.scan_mode,
                  updated_at = NOW()`
         : `ON DUPLICATE KEY UPDATE
              pet_data = VALUES(pet_data),
                  scan_mode = VALUES(scan_mode),
                  updated_at = NOW()`}`,
      [sessionId, JSON.stringify(next), scanMode]
    );
    res.json({ success: true, message: "Scan result stored.", count: next.length });
  } catch (error) {
    console.error("Mobile scan result error:", error);
    res.status(500).json({ success: false, message: "Could not store scan result.", error: error.message });
  }
}

// GET /api/clinical/mobile-scan-result/:session  (Desktop polls for result)
async function getMobileScanResult(req, res) {
  const { session } = req.params;
  if (!session) {
    return res.status(400).json({ success: false, message: "Session required." });
  }
  try {
    const [rows] = await db.query(
      `SELECT pet_data, scan_mode, created_at, updated_at FROM mobile_scan_sessions WHERE session_id = ?`,
      [session]
    );
    if (!rows.length) {
      return res.json({ success: true, result: null });
    }
    const data = rows[0];
    let pets = [];
    try {
      const stored = typeof data.pet_data === "string" ? JSON.parse(data.pet_data) : data.pet_data;
      pets = Array.isArray(stored) ? stored : (stored && stored.pet_id ? [stored] : []);
    } catch (_) {}
    res.json({
      success: true,
      result: { pets, mode: data.scan_mode, scanned_at: data.updated_at || data.created_at },
    });
  } catch (error) {
    console.error("Get mobile scan result error:", error);
    res.status(500).json({ success: false, message: "Could not retrieve scan result.", error: error.message });
  }
}

// DELETE /api/clinical/mobile-scan-result/:session  (Desktop clears result after use)
async function clearMobileScanResult(req, res) {
  const { session } = req.params;
  if (!session) {
    return res.status(400).json({ success: false, message: "Session required." });
  }
  try {
    await db.query(`DELETE FROM mobile_scan_sessions WHERE session_id = ?`, [session]);
    res.json({ success: true });
  } catch (error) {
    console.error("Clear mobile scan result error:", error);
    res.status(500).json({ success: false, message: "Could not clear scan result.", error: error.message });
  }
}

module.exports = { getMyClinicalRecords, getAllClinicalRecords, addClinicalRecord, receiveMobileScanResult, getMobileScanResult, clearMobileScanResult };
