const db = require("../config/db");
const { createNotification, notifyUsersByRoles } = require("../services/notificationService");
const { jsPDF } = require("jspdf");
const {
  validationError,
  validateRecordRequest,
} = require("../utils/validation");
const { logAudit } = require("../middleware/auditMiddleware");
const {
  getLogoAsset,
  drawBrandedHeader,
  drawMetaBlock,
  drawSectionHeader,
  drawField,
  drawNotesBox,
  drawEmptyState,
  drawTableRow,
  drawFooter,
  ensurePageSpace,
} = require("../utils/recordPdfTheme");

// =========================================
// CREATE RECORD REQUEST
// =========================================

async function createRequest(req, res) {
  const { pet_id, request_type, purpose, format, comments } = req.body;
  const validation = validateRecordRequest({ pet_id, request_type, format });

  if (!validation.valid) {
    return validationError(res, validation.message, validation.errors);
  }

  try {
    const [ownerRows] = await db.query(
      "SELECT id FROM pet_owners WHERE user_id = ?",
      [req.user.id]
    );

    if (ownerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pet owner profile not found.",
      });
    }

    const ownerId = ownerRows[0].id;

    const [petRows] = await db.query(
      `
      SELECT
        p.id,
        p.name,
        po.user_id
      FROM pets p
      JOIN pet_owners po ON p.pet_owner_id = po.id
      WHERE p.id = ? AND po.user_id = ?
      `,
      [pet_id, req.user.id]
    );

    if (petRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You can only request records for your own pets.",
      });
    }

    const pet = petRows[0];

    const [result] = await db.query(
      `
      INSERT INTO record_requests
      (
        pet_owner_id,
        pet_id,
        request_type,
        purpose,
        format,
        comments
      )
      VALUES
      (?, ?, ?, ?, ?, ?)
      `,
      [
        ownerId,
        pet.id,
        request_type,
        purpose || null,
        format || null,
        comments || null,
      ]
    );

    try {
      await createNotification(
        pet.user_id,
        "Record Request Submitted",
        `${pet.name} record request has been submitted.`,
        "Record",
        false,
        "record-requests"
      );

      await notifyUsersByRoles(
        ["Staff", "Veterinarian", "Admin"],
        "New Record Request",
        `${pet.name} record request needs processing.`,
        "Record"
      );
    } catch (notificationError) {
      console.warn(
        "Record request saved but notification failed:",
        notificationError.message
      );
    }

    res.status(201).json({
      success: true,
      message: "Request submitted.",
      requestId: result.insertId,
    });

    await logAudit(req, {
      action: 'CREATE',
      entity_type: 'record_request',
      entity_id: result.insertId,
      new_value: { pet_id, request_type, purpose: purpose || null, format: format || null },
      description: `Record request submitted for "${pet.name}" (${request_type})`
    });
  } catch (error) {
    console.error("createRequest error:", error);
    res.status(500).json({
      success: false,
      message: "Could not submit request.",
      error: error.message,
    });
  }
}

// =========================================
// OWNER REQUESTS
// =========================================

async function getMyRequests(req, res) {
  try {
    const [rows] = await db.query(
      `
      SELECT
        rr.*,
        p.name AS pet_name

      FROM record_requests rr

      JOIN pets p
      ON rr.pet_id = p.id

      JOIN pet_owners po
      ON rr.pet_owner_id = po.id

      WHERE po.user_id = ?

      ORDER BY rr.requested_date DESC
      `,
      [req.user.id]
    );

    res.json({
      success: true,
      requests: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load your requests.",
      error: error.message,
    });
  }
}

// =========================================
// STAFF REQUESTS
// =========================================

async function getAllRequests(req, res) {
  try {
    const [rows] = await db.query(
      `
      SELECT
        rr.*,
        p.name AS pet_name,
        po.full_name AS owner_name

      FROM record_requests rr

      JOIN pets p
      ON rr.pet_id = p.id

      JOIN pet_owners po
      ON rr.pet_owner_id = po.id

      ORDER BY rr.requested_date DESC
      `
    );

    res.json({
      success: true,
      requests: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load requests.",
      error: error.message,
    });
  }
}

// =========================================
// ISSUE REQUEST
// =========================================

async function issueRequest(req, res) {
  const { id } = req.params;

  try {
    await db.query(
      `
      UPDATE record_requests

      SET

      status='Issued',

      issued_date=NOW()

      WHERE id=?
      `,
      [id]
    );

    // =====================================
    // Notification
    // =====================================

    const [[request]] = await db.query(
      `
      SELECT

          p.name,

          po.user_id

      FROM record_requests rr

      JOIN pets p
      ON rr.pet_id = p.id

      JOIN pet_owners po
      ON rr.pet_owner_id = po.id

      WHERE rr.id = ?
        AND (? <> 'Owner' OR po.user_id = ?)
      `,
      [id, req.user.role, req.user.id]
    );

    if (request) {
      try {
        await createNotification(
          request.user_id,
          "Record Ready for Claim",
          `${request.name} record is now available for claiming.`,
          "Record",
          false,
          "record-requests"
        );

        await createNotification(
          req.user.id,
          "Record Issued Successfully",
          `You have successfully issued the record for ${request.name}.`,
          "Record",
          false,
          "issue-records"
        );
      } catch (notificationError) {
        console.warn(
          "Record issued but notification failed:",
          notificationError.message
        );
      }
    }

    res.json({
      success: true,
      message: "Record marked as issued.",
    });

    await logAudit(req, {
      action: 'APPROVE',
      entity_type: 'record_request',
      entity_id: id,
      new_value: { status: 'Issued' },
      description: `Record request #${id} marked as issued${request ? ` for "${request.name}"` : ''}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not update request.",
      error: error.message,
    });
  }
}

// =========================================
// GENERATE PDF FOR RECORD REQUEST
// =========================================

async function generateRecordPdf(req, res) {
  const { id } = req.params;

  try {
    const [[request]] = await db.query(
      `
      SELECT 
        rr.*,
        p.name AS pet_name,
        p.pet_code,
        p.species_id,
        p.breed_id,
        p.breed_custom,
        p.sex,
        p.color,
        p.birthdate,
        p.registration_date,
        p.status AS pet_status,
        p.photo,
        p.is_lost,
        po.full_name AS owner_name,
        po.contact_number,
        po.address,
        po.barangay,
        s.species_name,
        COALESCE(b.breed_name, p.breed_custom) AS breed_name
      FROM record_requests rr
      JOIN pets p ON rr.pet_id = p.id
      JOIN pet_owners po ON rr.pet_owner_id = po.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      WHERE rr.id = ?
      `,
      [id]
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Record request not found."
      });
    }

    const [vaccinations] = await db.query(
      `SELECT vr.*, v.vaccine_name 
       FROM vaccination_records vr 
       JOIN vaccines v ON vr.vaccine_id = v.id 
       WHERE vr.pet_id = ? 
       ORDER BY vr.date_administered DESC`,
      [request.pet_id]
    );

    const [consultations] = await db.query(
      `SELECT cr.*, u.email AS veterinarian 
       FROM consultation_records cr 
       LEFT JOIN users u ON cr.vet_id = u.id 
       WHERE cr.pet_id = ? 
       ORDER BY cr.consultation_date DESC`,
      [request.pet_id]
    );

    const [prescriptions] = await db.query(
      `SELECT p.id, p.prescribed_date, m.medicine_name, pi.quantity, pi.dosage, pi.frequency, pi.duration, pi.instructions
       FROM prescriptions p
       JOIN prescription_items pi ON p.id = pi.prescription_id
       JOIN medicines m ON pi.medicine_id = m.id
       JOIN consultation_records c ON p.consultation_id = c.id
       WHERE c.pet_id = ?
       ORDER BY p.prescribed_date DESC`,
      [request.pet_id]
    );

    const [payments] = await db.query(
      `SELECT py.*, pt.type_name 
       FROM payments py 
       JOIN payment_types pt ON py.payment_type_id = pt.id 
       WHERE py.pet_id = ? 
       ORDER BY py.payment_date DESC`,
      [request.pet_id]
    );

    const [[qrCode]] = await db.query(
      `SELECT qr_token, image_path, issue_date, status AS qr_status 
       FROM qr_codes WHERE pet_id = ?`,
      [request.pet_id]
    );

    const logoAsset = getLogoAsset();
    const doc = new jsPDF();
    const reportTitle = request.request_type || "Pet Record Request";

    let y = drawBrandedHeader(doc, logoAsset, reportTitle);

    y = drawMetaBlock(doc, [
      `Record Request #${request.id}`,
      `Request Type: ${request.request_type || "N/A"}`,
      `Purpose: ${request.purpose || "N/A"}`,
      `Format: ${request.format || "PDF"}`,
      `Status: ${request.status}`,
      `Requested: ${new Date(request.requested_date).toLocaleString()}${
        request.issued_date
          ? ` | Issued: ${new Date(request.issued_date).toLocaleString()}`
          : ""
      }`,
    ], y);

    y = drawNotesBox(doc, "Owner Comments / Additional Notes", request.comments, y, logoAsset);

    y = drawSectionHeader(doc, "1. PET IDENTITY", y, logoAsset);
    y = drawField(doc, "Name", request.pet_name, y, logoAsset);
    y = drawField(doc, "Pet Code", request.pet_code, y, logoAsset);
    y = drawField(doc, "Species", request.species_name, y, logoAsset);
    y = drawField(doc, "Breed", request.breed_name, y, logoAsset);
    y = drawField(doc, "Sex", request.sex, y, logoAsset);
    y = drawField(doc, "Color", request.color, y, logoAsset);
    y = drawField(
      doc,
      "Birthdate",
      request.birthdate ? new Date(request.birthdate).toLocaleDateString() : null,
      y,
      logoAsset,
    );
    y = drawField(
      doc,
      "Registration Date",
      request.registration_date
        ? new Date(request.registration_date).toLocaleDateString()
        : null,
      y,
      logoAsset,
    );
    y = drawField(doc, "Status", request.pet_status, y, logoAsset);

    if (request.is_lost) {
      y = drawField(doc, "Lost Status", "Reported Lost", y, logoAsset);
    }

    y += 2;
    y = drawSectionHeader(doc, "2. OWNER INFORMATION", y, logoAsset);
    y = drawField(doc, "Owner Name", request.owner_name, y, logoAsset);
    y = drawField(doc, "Contact", request.contact_number, y, logoAsset);
    y = drawField(doc, "Address", request.address, y, logoAsset);
    y = drawField(doc, "Barangay", request.barangay, y, logoAsset);

    if (qrCode) {
      y += 2;
      y = drawSectionHeader(doc, "3. QR CODE INFORMATION", y, logoAsset);
      y = drawField(doc, "QR Token", qrCode.qr_token, y, logoAsset);
      y = drawField(doc, "QR Status", qrCode.qr_status, y, logoAsset);
      y = drawField(
        doc,
        "Issue Date",
        qrCode.issue_date ? new Date(qrCode.issue_date).toLocaleDateString() : null,
        y,
        logoAsset,
      );
    }

    y += 2;
    y = drawSectionHeader(
      doc,
      `${qrCode ? "4" : "3"}. VACCINATION RECORDS`,
      y,
      logoAsset,
    );

    if (vaccinations.length === 0) {
      y = drawEmptyState(doc, "No vaccination records found.", y, logoAsset);
    } else {
      const vaccineColWidths = [40, 50, 35, 35, 30];
      const vaccineHeaders = ["Vaccine", "Date Administered", "Next Due", "Status", "Comments"];

      drawTableRow(doc, 14, y, vaccineHeaders, vaccineColWidths, true);
      y += 10;

      vaccinations.forEach((vac) => {
        y = ensurePageSpace(doc, y, logoAsset, 275);
        drawTableRow(
          doc,
          14,
          y,
          [
            vac.vaccine_name,
            vac.date_administered
              ? new Date(vac.date_administered).toLocaleDateString()
              : "—",
            vac.next_due_date ? new Date(vac.next_due_date).toLocaleDateString() : "—",
            vac.status || "Due",
            vac.comments || "—",
          ],
          vaccineColWidths,
          false,
        );
        y += 8;
      });
    }

    y += 4;
    const clinicalSectionNum = qrCode ? "5" : "4";
    y = drawSectionHeader(
      doc,
      `${clinicalSectionNum}. CLINICAL / CONSULTATION RECORDS`,
      y,
      logoAsset,
    );

    if (consultations.length === 0) {
      y = drawEmptyState(doc, "No clinical records found.", y, logoAsset);
    } else {
      const clinColWidths = [30, 50, 50, 30, 30];
      const clinHeaders = ["Date", "Diagnosis", "Treatment Plan", "Follow-up", "Veterinarian"];

      drawTableRow(doc, 14, y, clinHeaders, clinColWidths, true);
      y += 10;

      consultations.forEach((con) => {
        y = ensurePageSpace(doc, y, logoAsset, 275);
        drawTableRow(
          doc,
          14,
          y,
          [
            con.consultation_date
              ? new Date(con.consultation_date).toLocaleDateString()
              : "—",
            con.diagnosis || "—",
            con.treatment_plan || "—",
            con.follow_up_date ? new Date(con.follow_up_date).toLocaleDateString() : "—",
            con.veterinarian || "—",
          ],
          clinColWidths,
          false,
        );
        y += 8;
      });
    }

    y += 4;
    const medSectionNum = qrCode ? "6" : "5";
    y = drawSectionHeader(
      doc,
      `${medSectionNum}. MEDICINE / PRESCRIPTION RECORDS`,
      y,
      logoAsset,
    );

    if (prescriptions.length === 0) {
      y = drawEmptyState(doc, "No prescription records found.", y, logoAsset);
    } else {
      const medColWidths = [30, 40, 20, 25, 20, 40];
      const medHeaders = ["Date", "Medicine", "Dosage", "Frequency", "Duration", "Instructions"];

      drawTableRow(doc, 14, y, medHeaders, medColWidths, true);
      y += 10;

      prescriptions.forEach((pre) => {
        y = ensurePageSpace(doc, y, logoAsset, 275);
        drawTableRow(
          doc,
          14,
          y,
          [
            pre.prescribed_date ? new Date(pre.prescribed_date).toLocaleDateString() : "—",
            pre.medicine_name || "—",
            pre.dosage || "—",
            pre.frequency || "—",
            pre.duration || "—",
            pre.instructions || "—",
          ],
          medColWidths,
          false,
        );
        y += 8;
      });
    }

    y += 4;
    const paySectionNum = qrCode ? "7" : "6";
    y = drawSectionHeader(doc, `${paySectionNum}. PAYMENT RECORDS`, y, logoAsset);

    if (payments.length === 0) {
      y = drawEmptyState(doc, "No payment records found.", y, logoAsset);
    } else {
      const payColWidths = [30, 40, 30, 35, 35];
      const payHeaders = ["Date", "Type", "Amount", "Status", "OR Number"];

      drawTableRow(doc, 14, y, payHeaders, payColWidths, true);
      y += 10;

      payments.forEach((pay) => {
        y = ensurePageSpace(doc, y, logoAsset, 275);
        drawTableRow(
          doc,
          14,
          y,
          [
            pay.payment_date ? new Date(pay.payment_date).toLocaleDateString() : "—",
            pay.type_name || "—",
            pay.amount ? `₱${parseFloat(pay.amount).toFixed(2)}` : "—",
            pay.payment_status || "—",
            pay.or_number || "—",
          ],
          payColWidths,
          false,
        );
        y += 8;
      });
    }

    drawFooter(doc, y + 8, logoAsset);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="record-request-${request.pet_code}-${request.id}.pdf"`,
    );
    res.end(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({
      success: false,
      message: "Could not generate PDF.",
      error: error.message,
    });
  }
}

// =========================================
// DELETE RECORD REQUEST (Owner)
// =========================================

async function deleteRequest(req, res) {
  const requestId = req.params.id;

  try {
    const [rows] = await db.query(
      `
      SELECT rr.id
      FROM record_requests rr
      JOIN pet_owners po ON rr.pet_owner_id = po.id
      WHERE rr.id = ? AND po.user_id = ?
      `,
      [requestId, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Request not found.",
      });
    }

    await db.query("DELETE FROM record_requests WHERE id = ?", [requestId]);

    res.json({
      success: true,
      message: "Request deleted.",
    });

    await logAudit(req, {
      action: 'DELETE',
      entity_type: 'record_request',
      entity_id: requestId,
      description: `Deleted record request #${requestId}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not delete request.",
      error: error.message,
    });
  }
}

module.exports = {
  createRequest,
  getMyRequests,
  getAllRequests,
  issueRequest,
  generateRecordPdf,
  deleteRequest,
};   