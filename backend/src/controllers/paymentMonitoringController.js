const db = require("../config/db");
const { logAudit } = require("../middleware/auditMiddleware");

const PAYMENT_TYPES = ["Consultation", "Vaccination", "Medicine"];

// =========================================
// SEARCH PET OWNERS (handles duplicate names)
// =========================================

async function searchOwners(req, res) {
  const { q } = req.query;

  const term = (q || "").trim();
  if (term.length < 2) {
    return res.json({ success: true, owners: [] });
  }

  try {
    const [rows] = await db.query(
      `SELECT
        po.id AS owner_id,
        po.full_name,
        po.contact_number,
        po.address,
        po.barangay,
        COUNT(p.id) AS pet_count
      FROM pet_owners po
      LEFT JOIN pets p ON p.pet_owner_id = po.id
      WHERE po.full_name LIKE ?
      GROUP BY po.id
      ORDER BY po.full_name ASC
      LIMIT 15`,
      [`%${term}%`]
    );

    // Attach each owner's pets so staff can pick the exact pet for the payment.
    if (rows.length) {
      const ownerIds = rows.map((r) => r.owner_id);
      const [petRows] = await db.query(
        `SELECT
          p.id AS pet_id,
          p.pet_owner_id AS owner_id,
          p.name AS pet_name,
          p.pet_code AS pet_code,
          p.sex AS pet_sex,
          p.photo AS pet_photo,
          s.species_name AS pet_species,
          COALESCE(b.breed_name, p.breed_custom) AS pet_breed
        FROM pets p
        LEFT JOIN species s ON p.species_id = s.id
        LEFT JOIN breeds b ON p.breed_id = b.id
        WHERE p.pet_owner_id IN (?)
        ORDER BY p.name ASC`,
        [ownerIds]
      );
      const petsByOwner = {};
      petRows.forEach((pet) => {
        (petsByOwner[pet.owner_id] = petsByOwner[pet.owner_id] || []).push(pet);
      });
      rows.forEach((row) => {
        row.pets = petsByOwner[row.owner_id] || [];
      });
    }

    res.json({ success: true, owners: rows });
  } catch (error) {
    console.error("Search owners error:", error);
    res.status(500).json({ success: false, message: "Could not search pet owners.", error: error.message });
  }
}

const PAYMENT_STATUS_VALUES = ["Unpaid", "Paid", "Cancelled"];
const NORMALIZED_PAYMENT_FROM = `
  FROM payment_monitoring pm
  LEFT JOIN consultation_records cr ON cr.id = pm.consultation_id
  LEFT JOIN pets p ON p.id = COALESCE(pm.pet_id, cr.pet_id)
  LEFT JOIN pet_owners po ON po.id = COALESCE(pm.pet_owner_id, p.pet_owner_id)
  LEFT JOIN users vet ON vet.id = cr.vet_id
  LEFT JOIN users actor ON actor.id = pm.recorded_by
`;

function isValidDateFilter(value) {
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number(text.slice(0, 4)) < 1000) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

function buildPaymentFilters(query = {}) {
  const conditions = ["(pm.consultation_id IS NOT NULL OR pm.payment_reference IS NOT NULL)"];
  const params = [];
  const status = String(query.status || query.payment_status || "").trim();
  if (status) {
    if (!PAYMENT_STATUS_VALUES.includes(status)) {
      throw Object.assign(new Error("Payment status must be Unpaid, Paid, or Cancelled."), { statusCode: 400 });
    }
    conditions.push("pm.payment_status = ?");
    params.push(status);
  }
  const type = String(query.type || "").trim();
  if (type) {
    if (!PAYMENT_TYPES.includes(type)) {
      throw Object.assign(new Error("Invalid payment type."), { statusCode: 400 });
    }
    conditions.push("pm.payment_type = ?");
    params.push(type);
  }
  const search = String(query.search || "").trim();
  if (search) {
    const term = `%${search.slice(0, 100)}%`;
    conditions.push("(pm.payment_reference LIKE ? OR p.name LIKE ? OR p.pet_code LIKE ? OR po.full_name LIKE ? OR cr.diagnosis LIKE ?)");
    params.push(term, term, term, term, term);
  }
  for (const [key, operator] of [["from", ">="], ["to", "<="]]) {
    const value = String(query[key] || "").trim();
    if (!value) continue;
    if (!isValidDateFilter(value)) {
      throw Object.assign(new Error(`${key} must be a valid date.`), { statusCode: 400 });
    }
    conditions.push(`COALESCE(pm.consultation_date, DATE(pm.created_at)) ${operator} ?`);
    params.push(value);
  }
  const petId = Number(query.pet_id);
  if (query.pet_id && (!Number.isInteger(petId) || petId < 1)) {
    throw Object.assign(new Error("pet_id must be a positive integer."), { statusCode: 400 });
  }
  if (petId) {
    conditions.push("p.id = ?");
    params.push(petId);
  }
  const ownerId = Number(query.owner_id);
  if (query.owner_id && (!Number.isInteger(ownerId) || ownerId < 1)) {
    throw Object.assign(new Error("owner_id must be a positive integer."), { statusCode: 400 });
  }
  if (ownerId) {
    conditions.push("po.id = ?");
    params.push(ownerId);
  }
  return { where: conditions.join(" AND "), params };
}

function normalizePaymentRow(row) {
  if (!row) return null;
  const totalAmount = Number(row.total_amount || 0);
  return {
    ...row,
    id: Number(row.payment_id),
    payment_id: Number(row.payment_id),
    status: row.payment_status,
    reference: row.payment_reference,
    total_amount: totalAmount,
    amount: totalAmount,
    consultation_date: row.consultation_date,
    charges: row.charges || [],
  };
}

async function attachConsultationCharges(rows, connection = db) {
  if (!rows.length) return rows;
  const consultationIds = rows.map((row) => row.consultation_id).filter((id) => id != null);
  const chargesByConsultation = {};
  if (consultationIds.length) {
    const placeholders = consultationIds.map(() => "?").join(", ");
    const [chargeRows] = await connection.query(
      `SELECT id, consultation_id, catalog_product_id, description, quantity, unit_price, line_total
       FROM consultation_charges
       WHERE consultation_id IN (${placeholders})
       ORDER BY id ASC`,
      consultationIds,
    );
    for (const charge of chargeRows) {
      const key = Number(charge.consultation_id);
      (chargesByConsultation[key] = chargesByConsultation[key] || []).push({
        ...charge,
        quantity: Number(charge.quantity),
        unit_price: Number(charge.unit_price),
        line_total: Number(charge.line_total),
      });
    }
  }
  for (const row of rows) {
    const consultationId = Number(row.consultation_id);
    let charges = chargesByConsultation[consultationId] || [];
    if (!charges.length && row.payment_items) {
      try {
        const parsed = JSON.parse(row.payment_items);
        if (Array.isArray(parsed)) {
          charges = parsed.map((item) => ({
            ...item,
            quantity: Number(item.quantity || 0),
            unit_price: Number(item.unit_price || item.price || 0),
            line_total: Number(item.line_total || item.total || 0),
          }));
        }
      } catch (_) {}
    }
    row.charges = charges;
  }
  return rows;
}

async function getNormalizedPaymentById(id) {
  const [rows] = await db.query(
    `SELECT pm.id AS payment_id,
             pm.consultation_id,
             pm.payment_reference,
             pm.payment_status,
             COALESCE(pm.total_amount, 0) AS total_amount,
             COALESCE(pm.consultation_date, DATE(pm.created_at)) AS consultation_date,
             pm.payment_type,
             pm.pet_owner_id,
             pm.recorded_by,
             pm.status_updated_by,
             pm.status_updated_at,
             pm.created_at,
             pm.payment_items,
            p.id AS pet_id,
            p.name AS pet_name,
            p.pet_code,
            po.id AS owner_id,
            po.full_name AS owner_name,
            po.contact_number,
            po.address,
            po.barangay,
            COALESCE(vet.full_name, vet.email) AS veterinarian_name,
            COALESCE(actor.full_name, actor.email) AS recorded_by_name
     ${NORMALIZED_PAYMENT_FROM}
     WHERE pm.id = ?
       AND (pm.consultation_id IS NOT NULL OR pm.payment_reference IS NOT NULL)
     LIMIT 1`,
    [id],
  );
  if (!rows[0]) return null;
  await attachConsultationCharges(rows);
  return normalizePaymentRow(rows[0]);
}

async function listConsultationPayments(req, res) {
  let filters;
  try {
    filters = buildPaymentFilters(req.query);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || "50", 10) || 50, 1), 200);
  const page = Math.max(Number.parseInt(req.query.page || "1", 10) || 1, 1);
  const offset = (page - 1) * limit;
  try {
    const [[countRow]] = await db.query(
      `SELECT COUNT(*) AS total
       ${NORMALIZED_PAYMENT_FROM}
       WHERE ${filters.where}`,
      filters.params,
    );
    const [rows] = await db.query(
      `SELECT pm.id AS payment_id,
              pm.consultation_id,
              pm.payment_reference,
              pm.payment_status,
              COALESCE(pm.total_amount, 0) AS total_amount,
              COALESCE(pm.consultation_date, DATE(pm.created_at)) AS consultation_date,
              pm.payment_type,
              pm.pet_owner_id,
              pm.recorded_by,
              pm.status_updated_by,
              pm.status_updated_at,
              pm.created_at,
              pm.payment_items,
              p.id AS pet_id,
              p.name AS pet_name,
              p.pet_code,
              po.id AS owner_id,
              po.full_name AS owner_name,
              po.contact_number,
              po.address,
              po.barangay,
              COALESCE(vet.full_name, vet.email) AS veterinarian_name,
              COALESCE(actor.full_name, actor.email) AS recorded_by_name
       ${NORMALIZED_PAYMENT_FROM}
       WHERE ${filters.where}
       ORDER BY consultation_date DESC, pm.created_at DESC, pm.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      filters.params,
    );
    await attachConsultationCharges(rows);
    const records = rows.map(normalizePaymentRow);
    res.json({
      success: true,
      records,
      payments: records,
      total: Number(countRow.total || 0),
      page,
      limit,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load consultation payments.", error: error.message });
  }
}

async function getConsultationPaymentSummary(req, res) {
  let filters;
  try {
    filters = buildPaymentFilters(req.query);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
  try {
    const [statusRows] = await db.query(
      `SELECT pm.payment_status AS status,
              COUNT(*) AS count,
              COALESCE(SUM(COALESCE(pm.total_amount, 0)), 0) AS total_amount
       ${NORMALIZED_PAYMENT_FROM}
       WHERE ${filters.where}
       GROUP BY pm.payment_status`,
      filters.params,
    );
    const [typeRows] = await db.query(
      `SELECT pm.payment_type AS payment_type,
              COUNT(*) AS total_count,
              COALESCE(SUM(COALESCE(pm.total_amount, 0)), 0) AS type_amount
       ${NORMALIZED_PAYMENT_FROM}
       WHERE ${filters.where}
       GROUP BY pm.payment_type`,
      filters.params,
    );
    const summary = {
      Unpaid: { count: 0, total_amount: 0 },
      Paid: { count: 0, total_amount: 0 },
      Cancelled: { count: 0, total_amount: 0 },
    };
    for (const row of statusRows) {
      if (summary[row.status]) {
        summary[row.status] = { count: Number(row.count || 0), total_amount: Number(row.total_amount || 0) };
      }
    }
    const totalPayments = Object.values(summary).reduce((sum, item) => sum + item.count, 0);
    // The headline amount is what the clinic has actually collected, so it counts
    // Paid only. Cancelling a transaction has to move it out of this figure;
    // otherwise the total never moves. Unpaid and Cancelled stay visible as
    // their own breakdown cards below.
    const totalAmount = Number(summary.Paid.total_amount);
    const [[today]] = await db.query(
      `SELECT COUNT(*) AS count
       ${NORMALIZED_PAYMENT_FROM}
       WHERE ${filters.where} AND DATE(pm.created_at) = CURRENT_DATE`,
      filters.params,
    );
    const byStatus = statusRows.map((row) => ({
      status: row.status,
      count: Number(row.count || 0),
      total_amount: Number(row.total_amount || 0),
    }));
    const byTypeMap = new Map(
      PAYMENT_TYPES.map((paymentType) => [paymentType, { payment_type: paymentType, total_count: 0, type_amount: 0 }]),
    );
    for (const row of typeRows) {
      const key = row.payment_type || 'Unknown';
      byTypeMap.set(key, {
        payment_type: key,
        total_count: Number(row.total_count || 0),
        type_amount: Number(row.type_amount || 0),
      });
    }
    res.json({
      success: true,
      summary,
      byStatus,
      overall: { total_payments: totalPayments, total_amount: totalAmount },
      byType: [...byTypeMap.values()],
      todayCount: Number(today?.count || 0),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load the consultation payment summary.", error: error.message });
  }
}

async function updatePaymentStatus(req, res) {
  const id = Number(req.params.id);
  const status = String(req.body?.status || req.body?.payment_status || "").trim();
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: "A valid payment is required." });
  }
  if (!PAYMENT_STATUS_VALUES.includes(status)) {
    return res.status(400).json({ success: false, message: "Payment status must be Unpaid, Paid, or Cancelled." });
  }
  try {
    const [[existing]] = await db.query(
      `SELECT id, payment_reference, payment_status, payment_type, pet_owner_id, pet_id, total_amount
       FROM payment_monitoring
       WHERE id = ?
       LIMIT 1`,
      [id],
    );
    if (!existing) {
      return res.status(404).json({ success: false, message: "Payment record not found." });
    }
    if (global.io) global.io.emit("data-changed", { type: "payment-updated" });

    await db.query(
      `UPDATE payment_monitoring
       SET payment_status = ?,
           status_updated_by = ?,
           status_updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, req.user.id, id],
    );
    const payment = await getNormalizedPaymentById(id);
    res.json({ success: true, message: "Payment status updated.", payment, record: payment });
    logAudit(req, {
      action: "UPDATE",
      entity_type: "payment_monitoring",
      entity_id: id,
      old_value: { payment_status: existing.payment_status },
      new_value: { payment_status: status },
      description: `${existing.payment_type || 'Payment'} ${existing.payment_reference || id} changed to ${status}`,
    }).catch((error) => console.warn("Payment status audit log failed:", error.message));
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not update payment status.", error: error.message });
  }
}


module.exports = {
  searchOwners,
  listConsultationPayments,
  getConsultationPaymentSummary,
  updatePaymentStatus,
};
