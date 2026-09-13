const db = require("../config/db");
const fs = require("fs");
const { generatePmToken, writeReceiptQrImage } = require("../utils/qrReceipt");
const { ocrReceiptFile } = require("../utils/paddleOcr");
const { logAudit } = require("../middleware/auditMiddleware");

const PAYMENT_TYPES = ["Consultation", "Vaccination", "Medicine"];

// =========================================
// OCR THE RECEIPT PHOTO (PaddleOCR sidecar)
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
    payment_type,
    medicine_id,
    medicine_quantity,
    medicine_total,
    remarks,
    ocr_text,
    ocr_confidence,
  } = req.body;

  const recordedBy = req.user.id;
  const orPhotoPath = req.file ? `/uploads/payments/${req.file.filename}` : null;

  if (!or_number || !String(or_number).trim()) {
    return res.status(400).json({ success: false, message: "OR number is required." });
  }

  if (!PAYMENT_TYPES.includes(payment_type)) {
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

    const pmToken = generatePmToken();

    const [result] = await db.query(
      `INSERT INTO payment_monitoring
        (or_number, or_amount, or_date, or_time, or_description, payment_items, or_photo_path,
         ocr_text, ocr_confidence, pet_owner_id, payment_type, medicine_id,
         medicine_quantity, medicine_total, recorded_by, remarks, pm_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        payment_type,
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
      new_value: { or_number: String(or_number).trim(), or_amount: amount.toFixed(2), payment_type },
      description: `Recorded payment OR ${String(or_number).trim()} — ₱${amount.toFixed(2)} (${payment_type})`
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
        pm.created_at,
        po.full_name AS owner_name,
        po.contact_number,
        po.address,
        po.barangay,
        (SELECT COUNT(*) FROM pets p2 WHERE p2.pet_owner_id = po.id) AS pet_count,
        ru.full_name AS recorded_by_name
      FROM payment_monitoring pm
      JOIN pet_owners po ON pm.pet_owner_id = po.id
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
        m.medicine_name,
        ru.full_name AS recorded_by_name
      FROM payment_monitoring pm
      JOIN pet_owners po ON pm.pet_owner_id = po.id
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

module.exports = {
  createRecord,
  checkOrNumber,
  getReceiptByToken,
  listRecords,
  getSummary,
  searchOwners,
  getMedicines,
  deleteRecord,
  ocrReceipt,
};