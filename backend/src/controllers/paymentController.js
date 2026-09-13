const db = require("../config/db");
const { createNotification, notifyUsersByRoles } = require("../services/notificationService");
const { logAudit } = require("../middleware/auditMiddleware");

// =========================================
// GET PAYMENT TYPES
// =========================================

async function getPaymentTypes(req, res) {
  try {
    const [rows] = await db.query("SELECT * FROM payment_types");
    res.json({ success: true, paymentTypes: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load payment types.", error: error.message });
  }
}

// =========================================
// OWNER: GET MY PAYMENTS
// =========================================

async function getMyPayments(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT
        py.*,
        p.name AS pet_name,
        pt.type_name,
        or2.or_number AS or_num,
        or2.or_photo_path,
        or2.payment_date AS or_date,
        or2.status AS or_status
      FROM payments py
      JOIN pets p ON py.pet_id = p.id
      JOIN pet_owners po ON py.pet_owner_id = po.id
      JOIN payment_types pt ON py.payment_type_id = pt.id
      LEFT JOIN official_receipts or2 ON py.or_id = or2.id
      WHERE po.user_id = ?
      ORDER BY py.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, payments: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load payments.", error: error.message });
  }
}

// =========================================
// STAFF/ADMIN: GET ALL PENDING PAYMENTS
// =========================================

async function getAllPayments(req, res) {
  try {
    const { status } = req.query;

    let whereClause = "";
    const params = [];

    if (status) {
      whereClause = "WHERE py.validation_status = ?";
      params.push(status);
    }

    const [rows] = await db.query(
      `SELECT
        py.*,
        p.name AS pet_name,
        po.full_name AS owner_name,
        pt.type_name,
        or2.or_number AS or_num,
        or2.or_photo_path,
        or2.payment_date AS or_date,
        or2.status AS or_status
      FROM payments py
      JOIN pets p ON py.pet_id = p.id
      JOIN pet_owners po ON py.pet_owner_id = po.id
      JOIN payment_types pt ON py.payment_type_id = pt.id
      LEFT JOIN official_receipts or2 ON py.or_id = or2.id
      ${whereClause}
      ORDER BY py.created_at DESC`,
      params
    );

    res.json({ success: true, payments: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load payments.", error: error.message });
  }
}

// =========================================
// STAFF: VERIFY PAYMENT
// =========================================

async function verifyPayment(req, res) {
  const { id } = req.params;
  const staffUserId = req.user.id;

  try {
    const [[payment]] = await db.query(
      "SELECT * FROM payments WHERE id = ?",
      [id]
    );
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found." });
    }
    if (payment.validation_status === 'Verified') {
      return res.status(400).json({ success: false, message: "Payment is already verified." });
    }

    // Verify the payment
    await db.query(
      `UPDATE payments
       SET validation_status = 'Verified', payment_status = 'Paid',
           reviewed_at = NOW(), reviewed_by = ?
       WHERE id = ?`,
      [staffUserId, id]
    );

    // Update OR status
    if (payment.or_id) {
      const [[orStats]] = await db.query(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN validation_status = 'Verified' OR id = ? THEN 1 ELSE 0 END) AS verified_count
         FROM payments WHERE or_id = ?`,
        [id, payment.or_id]
      );

      const newORStatus = orStats.verified_count >= orStats.total ? 'Verified' : 'Partially Verified';
      await db.query("UPDATE official_receipts SET status = ? WHERE id = ?", [newORStatus, payment.or_id]);
    }

    // Update owner payment status
    await db.query(
      `UPDATE pet_owners SET is_payment_current = TRUE WHERE id = ?`,
      [payment.pet_owner_id]
    );

    // Notify owner
    const [[pet]] = await db.query("SELECT name FROM pets WHERE id = ?", [payment.pet_id]);
    await createNotification(
      payment.pet_owner_id,
      "Payment Verified",
      `${pet?.name || 'Your pet'} payment of ₱${payment.amount} has been verified.`,
      "Payment",
      false,
      "payments"
    );

    res.json({ success: true, message: "Payment verified." });

    await logAudit(req, {
      action: 'VERIFY',
      entity_type: 'payment',
      entity_id: payment.id,
      old_value: { validation_status: payment.validation_status, payment_status: payment.payment_status },
      new_value: { validation_status: 'Verified', payment_status: 'Paid' },
      description: `Payment verified for ${pet?.name || 'pet'} — ₱${payment.amount}`
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ success: false, message: "Could not verify payment.", error: error.message });
  }
}

// =========================================
// STAFF: REJECT PAYMENT
// =========================================

async function rejectPayment(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  const staffUserId = req.user.id;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, message: "Rejection reason is required." });
  }

  try {
    const [[payment]] = await db.query(
      "SELECT * FROM payments WHERE id = ?",
      [id]
    );
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found." });
    }
    if (payment.validation_status === 'Verified') {
      return res.status(400).json({ success: false, message: "Cannot reject a verified payment." });
    }

    await db.query(
      `UPDATE payments
       SET validation_status = 'Rejected', rejection_reason = ?,
           reviewed_at = NOW(), reviewed_by = ?
       WHERE id = ?`,
      [reason.trim(), staffUserId, id]
    );

    // Notify owner
    const [[pet]] = await db.query("SELECT name FROM pets WHERE id = ?", [payment.pet_id]);
    await createNotification(
      payment.pet_owner_id,
      "Payment Rejected",
      `${pet?.name || 'Your pet'} payment was rejected. Reason: ${reason.trim()}. Please resubmit.`,
      "Payment",
      false,
      "payments"
    );

    res.json({ success: true, message: "Payment rejected." });

    await logAudit(req, {
      action: 'REJECT',
      entity_type: 'payment',
      entity_id: payment.id,
      old_value: { validation_status: payment.validation_status },
      new_value: { validation_status: 'Rejected', rejection_reason: reason.trim() },
      description: `Payment rejected for ${pet?.name || 'pet'} — ₱${payment.amount}. Reason: ${reason.trim()}`
    });
  } catch (error) {
    console.error("Reject payment error:", error);
    res.status(500).json({ success: false, message: "Could not reject payment.", error: error.message });
  }
}

// =========================================
// STAFF: VERIFY ALL PAYMENTS UNDER OR
// =========================================

async function verifyAllPaymentsUnderOR(req, res) {
  const { id } = req.params; // official_receipt id
  const staffUserId = req.user.id;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[or]] = await conn.query("SELECT * FROM official_receipts WHERE id = ?", [id]);
    if (!or) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Official receipt not found." });
    }

    const [payments] = await conn.query(
      "SELECT * FROM payments WHERE or_id = ? AND validation_status != 'Verified'",
      [id]
    );

    if (payments.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "No pending payments to verify under this OR." });
    }

    for (const payment of payments) {
      await conn.query(
        `UPDATE payments
         SET validation_status = 'Verified', payment_status = 'Paid',
             reviewed_at = NOW(), reviewed_by = ?
         WHERE id = ?`,
        [staffUserId, payment.id]
      );
    }

    // Mark OR as fully verified
    await conn.query("UPDATE official_receipts SET status = 'Verified' WHERE id = ?", [id]);

    // Update owner payment status
    await conn.query(
      "UPDATE pet_owners SET is_payment_current = TRUE WHERE id = ?",
      [or.pet_owner_id]
    );

    await conn.commit();

    // Notify owner
    await createNotification(
      or.pet_owner_id,
      "Payment Verified",
      `All ${payments.length} payment(s) under OR (${or.or_number}) totaling ₱${or.total_amount} have been verified.`,
      "Payment",
      false,
      "payments"
    );

    res.json({ success: true, message: `${payments.length} payment(s) verified.` });

    await logAudit(req, {
      action: 'VERIFY',
      entity_type: 'official_receipt',
      entity_id: id,
      new_value: { status: 'Verified', payments_verified: payments.length, total_amount: or.total_amount },
      description: `Verified ${payments.length} payment(s) under OR ${or.or_number} — totaling ₱${or.total_amount}`
    });
  } catch (error) {
    await conn.rollback();
    console.error("Verify all payments error:", error);
    res.status(500).json({ success: false, message: "Could not verify payments.", error: error.message });
  } finally {
    conn.release();
  }
}

// =========================================
// STAFF/ADMIN: QR SCAN LOOKUP
// =========================================

async function scanPaymentQR(req, res) {
  const { id } = req.params; // payment id

  try {
    const [[payment]] = await db.query(
      `SELECT
        py.*,
        p.name AS pet_name,
        p.pet_code,
        po.full_name AS owner_name,
        po.contact_number,
        pt.type_name,
        or2.or_number AS or_num,
        or2.or_photo_path,
        or2.payment_date AS or_date,
        or2.total_amount AS or_total,
        or2.status AS or_status
      FROM payments py
      JOIN pets p ON py.pet_id = p.id
      JOIN pet_owners po ON py.pet_owner_id = po.id
      JOIN payment_types pt ON py.payment_type_id = pt.id
      LEFT JOIN official_receipts or2 ON py.or_id = or2.id
      WHERE py.id = ?`,
      [id]
    );

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found." });
    }

    // Also get all payments under the same OR for context
    let siblingPayments = [];
    if (payment.or_id) {
      const [siblings] = await db.query(
        `SELECT py.*, p.name AS pet_name, pt.type_name
         FROM payments py
         JOIN pets p ON py.pet_id = p.id
         JOIN payment_types pt ON py.payment_type_id = pt.id
         WHERE py.or_id = ? AND py.id != ?
         ORDER BY py.created_at ASC`,
        [payment.or_id, id]
      );
      siblingPayments = siblings;
    }

    res.json({
      success: true,
      payment,
      siblingPayments,
    });
  } catch (error) {
    console.error("Scan QR error:", error);
    res.status(500).json({ success: false, message: "Could not load payment details.", error: error.message });
  }
}

// =========================================
// ADMIN: OVERDUE OWNERS
// =========================================

async function getOverdueOwners(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT
        po.id AS owner_id,
        po.full_name,
        po.contact_number,
        po.barangay,
        u.email,
        COUNT(DISTINCT p.id) AS pet_count,
        COUNT(DISTINCT py.id) AS unpaid_count
      FROM pet_owners po
      JOIN users u ON po.user_id = u.id
      JOIN pets p ON p.pet_owner_id = po.id
      LEFT JOIN payments py ON py.pet_owner_id = po.id
        AND py.payment_type_id = 1
        AND py.validation_status = 'Verified'
      WHERE po.is_payment_current = FALSE
      GROUP BY po.id
      ORDER BY po.full_name ASC`
    );
    res.json({ success: true, overdueOwners: rows });
  } catch (error) {
    console.error("Get overdue owners error:", error);
    res.status(500).json({ success: false, message: "Could not load overdue owners.", error: error.message });
  }
}

// =========================================
// ADMIN: PAYMENT SUMMARY
// =========================================

async function getPaymentSummary(req, res) {
  try {
    const [byType] = await db.query(
      `SELECT
        pt.type_name,
        COUNT(py.id) AS total_count,
        SUM(CASE WHEN py.validation_status = 'Verified' THEN 1 ELSE 0 END) AS verified_count,
        SUM(CASE WHEN py.validation_status = 'Pending Verification' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN py.validation_status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_count,
        COALESCE(SUM(CASE WHEN py.validation_status = 'Verified' THEN py.amount ELSE 0 END), 0) AS total_collected
      FROM payment_types pt
      LEFT JOIN payments py ON py.payment_type_id = pt.id
      GROUP BY pt.id
      ORDER BY pt.id`
    );

    const [[overall]] = await db.query(
      `SELECT
        COUNT(*) AS total_payments,
        SUM(CASE WHEN validation_status = 'Verified' THEN 1 ELSE 0 END) AS verified,
        SUM(CASE WHEN validation_status = 'Pending Verification' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN validation_status = 'Rejected' THEN 1 ELSE 0 END) AS rejected,
        COALESCE(SUM(CASE WHEN validation_status = 'Verified' THEN amount ELSE 0 END), 0) AS total_collected
      FROM payments`
    );

    res.json({ success: true, byType, overall });
  } catch (error) {
    console.error("Payment summary error:", error);
    res.status(500).json({ success: false, message: "Could not load payment summary.", error: error.message });
  }
}

// =========================================
// OWNER: DELETE PENDING PAYMENT
// =========================================

async function deletePayment(req, res) {
  const { id } = req.params;

  try {
    const [[payment]] = await db.query(
      "SELECT * FROM payments WHERE id = ?",
      [id]
    );
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found." });
    }

    // Only owner can delete their own pending payments
    if (req.user.role === 'Owner') {
      const [[owner]] = await db.query(
        "SELECT id FROM pet_owners WHERE user_id = ? AND id = ?",
        [req.user.id, payment.pet_owner_id]
      );
      if (!owner) {
        return res.status(403).json({ success: false, message: "Not authorized." });
      }
    }

    if (payment.validation_status === 'Verified') {
      return res.status(400).json({ success: false, message: "Cannot delete a verified payment." });
    }

    await db.query("DELETE FROM payments WHERE id = ?", [id]);

    res.json({ success: true, message: "Payment deleted." });

    await logAudit(req, {
      action: 'DELETE',
      entity_type: 'payment',
      entity_id: payment.id,
      old_value: { validation_status: payment.validation_status, amount: payment.amount, payment_type_id: payment.payment_type_id },
      description: `Deleted payment of ₱${payment.amount}`
    });
  } catch (error) {
    console.error("Delete payment error:", error);
    res.status(500).json({ success: false, message: "Could not delete payment.", error: error.message });
  }
}

// =========================================
// OWNER: CHECK PAYMENT LOCK
// =========================================

async function checkPaymentLock(req, res) {
  try {
    const [[ownerRow]] = await db.query(
      "SELECT id, is_payment_current FROM pet_owners WHERE user_id = ?",
      [req.user.id]
    );
    if (!ownerRow) {
      return res.status(404).json({ success: false, message: "Pet owner profile not found." });
    }

    // Double-check: query actual verified registration payment
    const [[verified]] = await db.query(
      `SELECT py.id FROM payments py
       WHERE py.pet_owner_id = ?
         AND py.payment_type_id = 1
         AND py.validation_status = 'Verified'
       LIMIT 1`,
      [ownerRow.id]
    );

    const isCurrent = !!verified;
    if (isCurrent !== ownerRow.is_payment_current) {
      await db.query("UPDATE pet_owners SET is_payment_current = ? WHERE id = ?", [isCurrent, ownerRow.id]);
    }

    res.json({ success: true, isPaymentCurrent: isCurrent });
  } catch (error) {
    console.error("Check payment lock error:", error);
    res.status(500).json({ success: false, message: "Could not check payment status.", error: error.message });
  }
}

module.exports = {
  getPaymentTypes,
  getMyPayments,
  getAllPayments,
  verifyPayment,
  rejectPayment,
  verifyAllPaymentsUnderOR,
  scanPaymentQR,
  getOverdueOwners,
  getPaymentSummary,
  deletePayment,
  checkPaymentLock,
};
