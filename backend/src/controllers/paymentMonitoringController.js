const db = require("../config/db");
const fs = require("fs");
const { generatePmToken, writeReceiptQrImage } = require("../utils/qrReceipt");
const { ocrReceiptFile } = require("../utils/ocrService");
const { uploadLocalFile, isAbsoluteUrl } = require("../utils/cloudUpload");
const { logAudit } = require("../middleware/auditMiddleware");

const PAYMENT_TYPES = ["Consultation", "Vaccination", "Medicine"];

// =========================================
// OCR THE RECEIPT PHOTO (in-process Tesseract.js)
// =========================================

async function ocrReceipt(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No receipt image provided." });
  }

  try {
    const result = await ocrReceiptFile(req.file.path);
    res.json({
      success: true,
      engine: result.engine || "paddle",
      text: result.text || "",
      confidence: result.confidence ?? null,
      lines: result.lines || [],
      elapsed_ms: result.elapsed_ms ?? null,
    });
  } catch (error) {
    console.error("OCR service error:", error.message);
    res.status(502).json({
      success: false,
      message: "OCR service is not available right now. Please try again or enter the details manually.",
      error: error.message,
    });
  } finally {
    // The uploaded photo is temporary — remove it after OCR.
    try {
      fs.unlink(req.file.path, () => {});
    } catch (_) {}
  }
}

// =========================================
// CREATE PAYMENT MONITORING RECORD
// =========================================

async function createRecord(req, res) {
  const {
    or_number,
    or_amount,
    or_date,
    or_time,
    or_description,
    payment_items,
    pet_owner_id,
    pet_id,
    payment_type,
    medicine_id,
    medicine_quantity,
    medicine_total,
    remarks,
    ocr_text,
    ocr_confidence,
  } = req.body;

  const recordedBy = req.user.id;
  let orPhotoPath = req.file ? `/uploads/payments/${req.file.filename}` : null;

  // On cloud deployments the receipt photo must live in object storage
  // (Cloudinary) so it survives redeploys; local dev keeps the local path.
  if (orPhotoPath && req.file) {
    try {
      const uploaded = await uploadLocalFile(req.file.path, "pet-vet/payments");
      if (isAbsoluteUrl(uploaded)) orPhotoPath = uploaded;
    } catch (photoErr) {
      console.warn("Receipt photo upload to Cloudinary failed, keeping local path:", photoErr.message);
    }
  }

  if (!or_number || !String(or_number).trim()) {
    return res.status(400).json({ success: false, message: "OR number is required." });
  }

  // The frontend always sends payment_type, but keep a safety net: when the
  // detail rows carry a catalog category, classify from that instead of a stale value.
  let effectiveType = payment_type;
  if (!PAYMENT_TYPES.includes(effectiveType)) {
    try {
      const rows = payment_items ? JSON.parse(payment_items) : [];
      const cats = (rows || []).map((r) => r.category).filter(Boolean);
      if (cats.some((c) => /vaccin/i.test(c))) effectiveType = 'Vaccination';
      else if (cats.some((c) => /consultat/i.test(c))) effectiveType = 'Consultation';
      else if (cats.length) effectiveType = 'Medicine';
    } catch (_) {}
  }
  if (!PAYMENT_TYPES.includes(effectiveType)) {
    return res.status(400).json({ success: false, message: "A valid payment type is required." });
  }

  if (!pet_owner_id) {
    return res.status(400).json({ success: false, message: "Please select a pet owner." });
  }

  const amount = Number.parseFloat(or_amount);
  if (Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: "A valid OR amount is required." });
  }

  try {
    const [[existing]] = await db.query(
      "SELECT id FROM payment_monitoring WHERE or_number = ?",
      [String(or_number).trim()]
    );
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `OR number ${or_number} has already been recorded. A receipt can only be logged once.`,
      });
    }

    const [[owner]] = await db.query("SELECT id FROM pet_owners WHERE id = ?", [Number(pet_owner_id)]);
    if (!owner) {
      return res.status(400).json({ success: false, message: "Pet owner not found." });
    }

    // If a pet was selected, make sure it actually belongs to the chosen owner.
    let linkedPetId = null;
    if (pet_id) {
      const [[pet]] = await db.query("SELECT id FROM pets WHERE id = ? AND pet_owner_id = ?", [Number(pet_id), Number(pet_owner_id)]);
      if (!pet) {
        return res.status(400).json({ success: false, message: "The selected pet does not belong to this pet owner." });
      }
      linkedPetId = Number(pet.id);
    }

    const pmToken = generatePmToken();

    const [result] = await db.query(
      `INSERT INTO payment_monitoring
        (or_number, or_amount, or_date, or_time, or_description, payment_items, or_photo_path,
         ocr_text, ocr_confidence, pet_owner_id, pet_id, payment_type, medicine_id,
         medicine_quantity, medicine_total, recorded_by, remarks, pm_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(or_number).trim(),
        amount.toFixed(2),
        or_date || null,
        or_time || null,
        or_description || null,
        payment_items || null,
        orPhotoPath,
        ocr_text || null,
        ocr_confidence || null,
        Number(pet_owner_id),
        linkedPetId,
        effectiveType,
        Number(medicine_id) || null,
        medicine_quantity || null,
        Number(medicine_total) || null,
        recordedBy,
        remarks || null,
        pmToken,
      ]
    );

    // Generate the QR receipt (best-effort — never blocks the save).
    let receiptQrPath = null;
    try {
      receiptQrPath = await writeReceiptQrImage(pmToken);
      await db.query("UPDATE payment_monitoring SET receipt_qr_path = ? WHERE id = ?", [receiptQrPath, result.insertId]);
    } catch (qrErr) {
      console.warn(`Receipt QR generation failed for record ${result.insertId}:`, qrErr.message);
    }

    res.json({
      success: true,
      message: `Payment for OR ${or_number} recorded.`,
      id: result.insertId,
      pm_token: pmToken,
      receipt_qr_path: receiptQrPath,
    });

    await logAudit(req, {
      action: 'CREATE',
      entity_type: 'payment',
      entity_id: result.insertId,
      new_value: { or_number: String(or_number).trim(), or_amount: amount.toFixed(2), payment_type: effectiveType },
      description: `Recorded payment OR ${String(or_number).trim()} — ₱${amount.toFixed(2)} (${effectiveType})`
    });
  } catch (error) {
    console.error("Create payment monitoring error:", error);
    res.status(500).json({ success: false, message: "Could not save payment record.", error: error.message });
  }
}

// =========================================
// CHECK IF OR NUMBER ALREADY EXISTS
// =========================================

async function getReceiptByToken(req, res) {
  const { token } = req.params;

  if (!token || !String(token).trim()) {
    return res.status(400).json({ success: false, message: "Receipt token is required." });
  }

  try {
    const [[record]] = await db.query(
      `SELECT
        pm.id,
        pm.pm_token,
        pm.receipt_qr_path,
        pm.or_number,
        pm.or_amount,
        pm.or_date,
        pm.or_time,
        pm.or_description,
        pm.payment_items,
        pm.or_photo_path,
        pm.ocr_text,
        pm.ocr_confidence,
        pm.payment_type,
        pm.pet_owner_id,
        pm.pet_id,
        pm.created_at,
        po.full_name AS owner_name,
        po.contact_number,
        po.address,
        po.barangay,
        (SELECT COUNT(*) FROM pets p2 WHERE p2.pet_owner_id = po.id) AS pet_count,
        p.name AS pet_name,
        p.pet_code AS pet_code,
        p.sex AS pet_sex,
        p.photo AS pet_photo,
        s.species_name AS pet_species,
        COALESCE(b.breed_name, p.breed_custom) AS pet_breed,
        ru.full_name AS recorded_by_name
      FROM payment_monitoring pm
      JOIN pet_owners po ON pm.pet_owner_id = po.id
      LEFT JOIN pets p ON pm.pet_id = p.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      LEFT JOIN users ru ON pm.recorded_by = ru.id
      WHERE pm.pm_token = ?`,
      [String(token).trim()]
    );

    if (!record) {
      return res.status(404).json({ success: false, message: "Receipt not found. This code is not a valid payment receipt." });
    }

    let items = null;
    if (record.payment_items) {
      try {
        const parsed = JSON.parse(record.payment_items);
        items = Array.isArray(parsed) ? parsed : null;
      } catch (_) {
        items = null;
      }
    }

    res.json({
      success: true,
      message: `Receipt matched — OR ${record.or_number}.`,
      receipt: {
        ...record,
        items,
      },
    });
  } catch (error) {
    console.error("Receipt token lookup error:", error);
    res.status(500).json({ success: false, message: "Could not look up this receipt.", error: error.message });
  }
}

async function checkOrNumber(req, res) {
  const { number } = req.params;

  if (!number || !String(number).trim()) {
    return res.status(400).json({ success: false, message: "OR number is required." });
  }

  try {
    const [[existing]] = await db.query(
      "SELECT id FROM payment_monitoring WHERE or_number = ?",
      [String(number).trim()]
    );

    res.json({
      success: true,
      isDuplicate: !!existing,
    });
  } catch (error) {
    console.error("Check OR number error:", error);
    res.status(500).json({ success: false, message: "Could not check OR number.", error: error.message });
  }
}

// =========================================
// LIST PAYMENT MONITORING RECORDS
// =========================================

async function listRecords(req, res) {
  const { search, type, from, to } = req.query;

  const conditions = [];
  const params = [];

  if (search && String(search).trim()) {
    conditions.push(`(pm.or_number LIKE ? OR po.full_name LIKE ? OR ru.full_name LIKE ?)`);
    const term = `%${String(search).trim()}%`;
    params.push(term, term, term);
  }

  if (type && PAYMENT_TYPES.includes(type)) {
    conditions.push("pm.payment_type = ?");
    params.push(type);
  }

  if (from) {
    conditions.push("pm.or_date >= ?");
    params.push(from);
  }

  if (to) {
    conditions.push("pm.or_date <= ?");
    params.push(to);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const [rows] = await db.query(
      `SELECT
        pm.*,
        po.full_name AS owner_name,
        po.contact_number,
        po.address,
        po.barangay,
        p.name AS pet_name,
        p.pet_code AS pet_code,
        s.species_name AS pet_species,
        COALESCE(b.breed_name, p.breed_custom) AS pet_breed,
        m.medicine_name,
        ru.full_name AS recorded_by_name
      FROM payment_monitoring pm
      JOIN pet_owners po ON pm.pet_owner_id = po.id
      LEFT JOIN pets p ON pm.pet_id = p.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      LEFT JOIN medicines m ON pm.medicine_id = m.id
      LEFT JOIN users ru ON pm.recorded_by = ru.id
      ${whereClause}
      ORDER BY pm.or_date DESC, pm.or_time DESC, pm.id DESC`,
      params
    );

    res.json({ success: true, records: rows });
  } catch (error) {
    console.error("List payment monitoring error:", error);
    res.status(500).json({ success: false, message: "Could not load payment records.", error: error.message });
  }
}

// =========================================
// SUMMARY STATS
// =========================================

async function getSummary(req, res) {
  try {
    const [[overall]] = await db.query(
      `SELECT
        COUNT(*) AS total_payments,
        COALESCE(SUM(or_amount), 0) AS total_amount
      FROM payment_monitoring`
    );

    const [byType] = await db.query(
      `SELECT payment_type, COUNT(*) AS total_count, COALESCE(SUM(or_amount), 0) AS type_amount
       FROM payment_monitoring
       GROUP BY payment_type`
    );

    const [[today]] = await db.query(
      `SELECT COUNT(*) AS today_count
       FROM payment_monitoring
       WHERE DATE(created_at) = CURDATE()`
    );

    res.json({ success: true, overall: overall || { total_payments: 0, total_amount: 0 }, byType, todayCount: today?.today_count || 0 });
  } catch (error) {
    console.error("Payment monitoring summary error:", error);
    res.status(500).json({ success: false, message: "Could not load payment summary.", error: error.message });
  }
}

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

// =========================================
// MEDICINE CATALOG (for Medicine payments)
// =========================================

async function getMedicines(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT m.id, m.medicine_name, m.description
       FROM medicines m
       ORDER BY m.medicine_name ASC`
    );
    res.json({ success: true, medicines: rows });
  } catch (error) {
    console.error("Get medicines error:", error);
    res.status(500).json({ success: false, message: "Could not load medicines.", error: error.message });
  }
}

// =========================================
// LAST OR NUMBER (for "Save & Next" quick-entry)
// =========================================

async function getLastOrNumber(req, res) {
  try {
    const [[row]] = await db.query(
      `SELECT MAX(CAST(or_number AS UNSIGNED)) AS last_or
       FROM payment_monitoring
       WHERE or_number REGEXP '^[0-9]+$'`
    );
    res.json({ success: true, last_or_number: row && row.last_or != null ? Number(row.last_or) : null });
  } catch (error) {
    console.error("Get last OR number error:", error);
    res.status(500).json({ success: false, message: "Could not load the last OR number.", error: error.message });
  }
}

// =========================================
// DELETE RECORD
// =========================================

async function deleteRecord(req, res) {
  const { id } = req.params;

  try {
    const [[record]] = await db.query("SELECT * FROM payment_monitoring WHERE id = ?", [id]);
    if (!record) {
      return res.status(404).json({ success: false, message: "Payment record not found." });
    }

    await db.query("DELETE FROM payment_monitoring WHERE id = ?", [id]);
    res.json({ success: true, message: `Payment record for OR ${record.or_number} deleted.` });

    await logAudit(req, {
      action: 'DELETE',
      entity_type: 'payment',
      entity_id: record.id,
      old_value: { or_number: record.or_number, or_amount: record.or_amount, payment_type: record.payment_type },
      description: `Deleted payment record OR ${record.or_number} — ₱${record.or_amount}`
    });
  } catch (error) {
    console.error("Delete payment monitoring error:", error);
    res.status(500).json({ success: false, message: "Could not delete payment record.", error: error.message });
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
    const totalAmount = Object.values(summary).reduce((sum, item) => sum + item.total_amount, 0);
    const [[today]] = await db.query(
      `SELECT COUNT(*) AS count
       ${NORMALIZED_PAYMENT_FROM}
       WHERE ${filters.where} AND DATE(pm.created_at) = CURDATE()`,
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

async function updateConsultationPaymentStatus(req, res) {
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
      `SELECT id, consultation_id, payment_reference, payment_status
       FROM payment_monitoring
       WHERE id = ?
       LIMIT 1`,
      [id],
    );
    if (!existing) {
      return res.status(404).json({ success: false, message: "Payment record not found." });
    }
    if (existing.consultation_id == null && !existing.payment_reference) {
      return res.status(409).json({ success: false, message: "Only consultation-linked payment records can be updated here." });
    }
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
      description: `Consultation payment ${existing.payment_reference || id} changed to ${status}`,
    }).catch((error) => console.warn("Payment status audit log failed:", error.message));
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not update payment status.", error: error.message });
  }
}

module.exports = {
  createRecord,
  checkOrNumber,
  getReceiptByToken,
  listRecords,
  getSummary,
  searchOwners,
  getMedicines,
  getLastOrNumber,
  deleteRecord,
  ocrReceipt,
  listConsultationPayments,
  getConsultationPaymentSummary,
  updateConsultationPaymentStatus,
};