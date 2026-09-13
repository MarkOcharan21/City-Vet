const db = require("../config/db");
const path = require("path");
const { createNotification, notifyUsersByRoles } = require("../services/notificationService");
const { generatePaymentQR, deletePaymentQR } = require("../utils/qrHelper");
const { uploadLocalFile, isAbsoluteUrl } = require("../utils/cloudUpload");
const { logAudit } = require("../middleware/auditMiddleware");

// =========================================
// OWNER: CREATE OFFICIAL RECEIPT + PAYMENTS
// =========================================

async function createOfficialReceipt(req, res) {
  const { or_number, payment_date, items, ocr_text, ocr_confidence } = req.body;

  if (!or_number || !or_number.trim()) {
    return res.status(400).json({ success: false, message: "OR number is required." });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "At least one payment item is required." });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Get pet_owner_id from authenticated user
    const [[ownerRow]] = await conn.query(
      "SELECT id FROM pet_owners WHERE user_id = ?",
      [req.user.id]
    );
    if (!ownerRow) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Pet owner profile not found." });
    }
    const ownerId = ownerRow.id;

    // Check OR number uniqueness (DB-level + app-level double-check)
    const [[existingOR]] = await conn.query(
      "SELECT id FROM official_receipts WHERE or_number = ?",
      [or_number.trim()]
    );
    if (existingOR) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: "This OR number is already in use. Each OR can only be submitted once.",
      });
    }

    // Validate each item: pet must belong to owner, payment type must exist
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const { pet_id, payment_type_id } = item;

      if (!pet_id || !payment_type_id) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: "Each item needs a pet and payment type." });
      }

      const [[pet]] = await conn.query(
        "SELECT p.id, p.name FROM pets p JOIN pet_owners po ON p.pet_owner_id = po.id WHERE p.id = ? AND po.user_id = ?",
        [pet_id, req.user.id]
      );
      if (!pet) {
        await conn.rollback();
        return res.status(403).json({ success: false, message: `Pet ${pet_id} not found or not yours.` });
      }

      const [[payType]] = await conn.query(
        "SELECT id, type_name, default_amount FROM payment_types WHERE id = ?",
        [payment_type_id]
      );
      if (!payType) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Payment type ${payment_type_id} not found.` });
      }

      const amount = Number(payType.default_amount) || 0;
      totalAmount += amount;

      validatedItems.push({ pet_id, payment_type_id, amount, pet_name: pet.name, type_name: payType.type_name });
    }

    // Create official_receipts row
    let orPhotoPath = req.file ? `/uploads/payments/${req.file.filename}` : null;
    if (req.file) {
      try {
        const localAbs = path.join(__dirname, "../../uploads/payments", req.file.filename);
        const uploaded = await uploadLocalFile(localAbs, "pet-vet/payments");
        if (isAbsoluteUrl(uploaded)) orPhotoPath = uploaded;
      } catch (_) {}
    }

    const [orResult] = await conn.query(
      `INSERT INTO official_receipts (pet_owner_id, or_number, total_amount, or_photo_path, payment_date, status, ocr_text, ocr_confidence)
       VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [ownerId, or_number.trim(), totalAmount, orPhotoPath, payment_date || null, ocr_text || null, ocr_confidence != null ? Number(ocr_confidence) : null]
    );
    const orId = orResult.insertId;

    // Create payments rows
    const paymentIds = [];
    for (const item of validatedItems) {
      const [payResult] = await conn.query(
        `INSERT INTO payments (pet_owner_id, pet_id, payment_type_id, or_id, or_number, amount, payment_date, payment_status, validation_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', 'Pending Verification')`,
        [ownerId, item.pet_id, item.payment_type_id, orId, or_number.trim(), item.amount, payment_date || null]
      );
      paymentIds.push(payResult.insertId);
    }

    await conn.commit();

    // Generate QR codes (outside transaction — non-critical)
    const qrUrls = {};
    for (const payId of paymentIds) {
      try {
        const qrPath = await generatePaymentQR(payId);
        await db.query("UPDATE payments SET qr_code_path = ? WHERE id = ?", [qrPath, payId]);
        qrUrls[payId] = qrPath;
      } catch (qrErr) {
        console.warn(`QR generation failed for payment ${payId}:`, qrErr.message);
      }
    }

    // Notify staff
    await notifyUsersByRoles(
      ["Staff", "Admin"],
      "New Payment Submission",
      `A new OR (${or_number.trim()}) with ${validatedItems.length} payment(s) totaling ₱${totalAmount.toFixed(2)} is awaiting verification.`,
      "Payment"
    );

    res.status(201).json({
      success: true,
      message: "Official receipt and payments created.",
      officialReceipt: { id: orId, or_number: or_number.trim(), total_amount: totalAmount },
      payments: paymentIds.map((id, i) => ({
        id,
        pet_name: validatedItems[i].pet_name,
        type_name: validatedItems[i].type_name,
        amount: validatedItems[i].amount,
        qr_code_path: qrUrls[id] || null,
      })),
    });

    await logAudit(req, {
      action: 'CREATE',
      entity_type: 'official_receipt',
      entity_id: orId,
      new_value: { or_number: or_number.trim(), total_amount: totalAmount, items_count: validatedItems.length },
      description: `Submitted official receipt OR ${or_number.trim()} — ₱${totalAmount.toFixed(2)} (${validatedItems.length} item(s))`
    });
  } catch (error) {
    await conn.rollback();
    console.error("Create OR error:", error);
    res.status(500).json({ success: false, message: "Could not create official receipt.", error: error.message });
  } finally {
    conn.release();
  }
}

// =========================================
// OWNER: GET MY OFFICIAL RECEIPTS
// =========================================

async function getMyOfficialReceipts(req, res) {
  try {
    const [[ownerRow]] = await db.query(
      "SELECT id FROM pet_owners WHERE user_id = ?",
      [req.user.id]
    );
    if (!ownerRow) {
      return res.status(404).json({ success: false, message: "Pet owner profile not found." });
    }

    const [ors] = await db.query(
      "SELECT o.* FROM official_receipts o " +
      "WHERE o.pet_owner_id = ? " +
      "ORDER BY o.created_at DESC",
      [ownerRow.id]
    );

    // Get payments for each OR
    for (const or of ors) {
      const [payments] = await db.query(
        `SELECT py.*, p.name AS pet_name, pt.type_name
         FROM payments py
         JOIN pets p ON py.pet_id = p.id
         JOIN payment_types pt ON py.payment_type_id = pt.id
         WHERE py.or_id = ?
         ORDER BY py.created_at ASC`,
        [or.id]
      );
      or.payments = payments;
    }

    res.json({ success: true, officialReceipts: ors });
  } catch (error) {
    console.error("Get my ORs error:", error);
    res.status(500).json({ success: false, message: "Could not load official receipts.", error: error.message });
  }
}

// =========================================
// OWNER: UPDATE / RESUBMIT REJECTED OR
// =========================================

async function updateOfficialReceipt(req, res) {
  const { id } = req.params;
  const { or_number, payment_date, items, ocr_text, ocr_confidence } = req.body;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Verify OR belongs to owner and is rejected
    const [[or]] = await conn.query(
      "SELECT * FROM official_receipts WHERE id = ? AND pet_owner_id = (SELECT id FROM pet_owners WHERE user_id = ?)",
      [id, req.user.id]
    );
    if (!or) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Official receipt not found." });
    }

    // Only rejected ORs can be resubmitted
    const [[payStatus]] = await conn.query(
      "SELECT validation_status FROM payments WHERE or_id = ? LIMIT 1",
      [id]
    );
    if (payStatus && payStatus.validation_status === 'Verified') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Cannot edit a verified receipt." });
    }

    // Check new OR number uniqueness (if changed)
    if (or_number && or_number.trim() !== or.or_number) {
      const [[existingOR]] = await conn.query(
        "SELECT id FROM official_receipts WHERE or_number = ? AND id != ?",
        [or_number.trim(), id]
      );
      if (existingOR) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: "This OR number is already in use." });
      }
    }

    // Update OR
    let orPhotoPath = req.file ? `/uploads/payments/${req.file.filename}` : or.or_photo_path;
    if (req.file) {
      try {
        const localAbs = path.join(__dirname, "../../uploads/payments", req.file.filename);
        const uploaded = await uploadLocalFile(localAbs, "pet-vet/payments");
        if (isAbsoluteUrl(uploaded)) orPhotoPath = uploaded;
      } catch (_) {}
    }
    await conn.query(
      `UPDATE official_receipts SET or_number = ?, payment_date = ?, or_photo_path = ?, status = 'Pending', ocr_text = ?, ocr_confidence = ? WHERE id = ?`,
      [or_number?.trim() || or.or_number, payment_date || or.payment_date, orPhotoPath, ocr_text || null, ocr_confidence != null ? Number(ocr_confidence) : null, id]
    );

    // Delete existing payments and recreate
    await conn.query("DELETE FROM payments WHERE or_id = ?", [id]);

    if (items && Array.isArray(items) && items.length > 0) {
      let totalAmount = 0;

      for (const item of items) {
        const [[payType]] = await conn.query(
          "SELECT default_amount FROM payment_types WHERE id = ?",
          [item.payment_type_id]
        );
        const amount = Number(payType?.default_amount) || 0;
        totalAmount += amount;

        const [payResult] = await conn.query(
          `INSERT INTO payments (pet_owner_id, pet_id, payment_type_id, or_id, or_number, amount, payment_date, payment_status, validation_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', 'Pending Verification')`,
          [or.pet_owner_id, item.pet_id, item.payment_type_id, id, or_number?.trim() || or.or_number, amount, payment_date || or.payment_date]
        );

        // Generate QR for new payment
        try {
          const qrPath = await generatePaymentQR(payResult.insertId);
          await db.query("UPDATE payments SET qr_code_path = ? WHERE id = ?", [qrPath, payResult.insertId]);
        } catch (qrErr) {
          console.warn(`QR generation failed:`, qrErr.message);
        }
      }

      await conn.query("UPDATE official_receipts SET total_amount = ? WHERE id = ?", [totalAmount, id]);
    }

    await conn.commit();

    await notifyUsersByRoles(
      ["Staff", "Admin"],
      "Payment Resubmitted",
      `OR (${or_number?.trim() || or.or_number}) has been resubmitted and is awaiting verification.`,
      "Payment"
    );

    res.json({ success: true, message: "Official receipt updated and resubmitted." });

    await logAudit(req, {
      action: 'UPDATE',
      entity_type: 'official_receipt',
      entity_id: id,
      old_value: { or_number: or.or_number, total_amount: or.total_amount, status: or.status },
      new_value: { or_number: or_number?.trim() || or.or_number, status: 'Pending' },
      description: `Resubmitted official receipt OR ${or_number?.trim() || or.or_number}`
    });
  } catch (error) {
    await conn.rollback();
    console.error("Update OR error:", error);
    res.status(500).json({ success: false, message: "Could not update official receipt.", error: error.message });
  } finally {
    conn.release();
  }
}

// =========================================
// OWNER: DELETE PENDING OR
// =========================================

async function deleteOfficialReceipt(req, res) {
  const { id } = req.params;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[or]] = await conn.query(
      "SELECT * FROM official_receipts WHERE id = ? AND pet_owner_id = (SELECT id FROM pet_owners WHERE user_id = ?)",
      [id, req.user.id]
    );
    if (!or) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Official receipt not found." });
    }

    // Only allow deletion of pending ORs
    const [payments] = await conn.query(
      "SELECT validation_status FROM payments WHERE or_id = ?",
      [id]
    );
    const hasVerified = payments.some(p => p.validation_status === 'Verified');
    if (hasVerified) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Cannot delete a receipt with verified payments." });
    }

    // Delete QR codes
    for (const pay of payments) {
      try {
        const [[payRow]] = await conn.query("SELECT qr_code_path FROM payments WHERE or_id = ?", [id]);
        if (payRow?.qr_code_path) {
          deletePaymentQR(payRow.id);
        }
      } catch (_) {}
    }

    // Delete payments then OR (cascade handles this, but explicit for QR cleanup)
    await conn.query("DELETE FROM payments WHERE or_id = ?", [id]);
    await conn.query("DELETE FROM official_receipts WHERE id = ?", [id]);

    await conn.commit();
    res.json({ success: true, message: "Official receipt deleted." });

    await logAudit(req, {
      action: 'DELETE',
      entity_type: 'official_receipt',
      entity_id: id,
      old_value: { or_number: or.or_number, total_amount: or.total_amount, status: or.status },
      description: `Deleted official receipt OR ${or.or_number} — ₱${or.total_amount}`
    });
  } catch (error) {
    await conn.rollback();
    console.error("Delete OR error:", error);
    res.status(500).json({ success: false, message: "Could not delete official receipt.", error: error.message });
  } finally {
    conn.release();
  }
}

module.exports = {
  createOfficialReceipt,
  getMyOfficialReceipts,
  updateOfficialReceipt,
  deleteOfficialReceipt,
};
