const db = require("../config/db");
const { createNotification, notifyUsersByRoles } = require("../services/notificationService");
const { jsPDF } = require("jspdf");
const {
  validationError,
  validateRecordRequest,
} = require("../utils/validation");
const { logAudit } = require("../middleware/auditMiddleware");
const { vetNameExpr } = require("../utils/vetNameFormat");
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
  drawSignatureArea,
  ensurePageSpace,
} = require("../utils/recordPdfTheme");

// =========================================
// CREATE RECORD REQUEST
// =========================================

async function createRequest(req, res) {
  const { pet_id, request_type, request_types, purpose, format, comments } = req.body;
  const validation = validateRecordRequest({ pet_id, request_type, request_types, format });

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

    const types = [
      ...new Set(
        (Array.isArray(request_types)
          ? request_types
          : request_type
            ? [request_type]
            : []
        ).filter(Boolean).map((t) => String(t))
      ),
    ];

    const conn = await db.getConnection();
    let groupId = null;
    let firstInsertId = null;
    try {
      await conn.beginTransaction();

      for (let i = 0; i < types.length; i += 1) {
        const [insertResult] = await conn.query(
          `
          INSERT INTO record_requests
          (
            pet_owner_id,
            pet_id,
            request_group_id,
            request_type,
            purpose,
            format,
            comments
          )
          VALUES
          (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            ownerId,
            pet.id,
            groupId,
            types[i],
            purpose || null,
            format || null,
            comments || null,
          ]
        );

        if (i === 0) {
          firstInsertId = insertResult.insertId;
          groupId = insertResult.insertId;
          if (types.length > 1) {
            await conn.query(
              "UPDATE record_requests SET request_group_id = ? WHERE id = ?",
              [groupId, insertResult.insertId]
            );
          }
        }
      }

      await conn.commit();
    } catch (innerError) {
      await conn.rollback();
      throw innerError;
    } finally {
      conn.release();
    }

    try {
      await createNotification(
        pet.user_id,
        "Record Request Submitted",
        `${pet.name} record request (${types.length} record${types.length === 1 ? "" : "s"}) has been submitted.`,
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

    const summaryTypes = types.join(", ");

    res.status(201).json({
      success: true,
      message: "Request(s) submitted.",
      requestId: firstInsertId,
      requestIds: types.map((_, index) => firstInsertId + index),
      requestGroupId: groupId,
    });

    await logAudit(req, {
      action: 'CREATE',
      entity_type: 'record_request',
      entity_id: firstInsertId,
      new_value: { pet_id, request_types: types, purpose: purpose || null, format: format || null },
      description: `Record request submitted for "${pet.name}" (${summaryTypes})`
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
    const [[target]] = await db.query(
      `
      SELECT
        rr.id,
        rr.request_group_id,
        p.name AS pet_name,
        po.user_id
      FROM record_requests rr
      JOIN pets p ON rr.pet_id = p.id
      JOIN pet_owners po ON rr.pet_owner_id = po.id
      WHERE rr.id = ?
        AND (? <> 'Owner' OR po.user_id = ?)
      `,
      [id, req.user.role, req.user.id]
    );

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Request not found.",
      });
    }

    const groupId = target.request_group_id || target.id;

    const [affected] = await db.query(
      `
      UPDATE record_requests
      SET status='Issued', issued_date=NOW()
      WHERE request_group_id = ? OR id = ?
      `,
      [groupId, groupId]
    );

    const [batchRows] = await db.query(
      "SELECT request_type FROM record_requests WHERE request_group_id = ? OR id = ? ORDER BY id",
      [groupId, groupId]
    );
    const issuedTypes = batchRows.map((r) => r.request_type);

    try {
      await createNotification(
        target.user_id,
        "Record Ready for Claim",
        `${target.pet_name} record(s) are now available for claiming.`,
        "Record",
        false,
        "record-requests"
      );

      await createNotification(
        req.user.id,
        "Record Issued Successfully",
        `You have successfully issued the record(s) for ${target.pet_name}.`,
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

    res.json({
      success: true,
      message: `Records marked as issued (${batchRows.length} record${batchRows.length === 1 ? "" : "s"}).`,
      issuedTypes,
    });

    await logAudit(req, {
      action: 'APPROVE',
      entity_type: 'record_request',
      entity_id: groupId,
      new_value: { status: 'Issued', types: issuedTypes },
      description: `Record request batch #${groupId} for "${target.pet_name}" marked as issued`
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
`SELECT cr.*, ${vetNameExpr('veterinarian')}
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

    const groupId = request.request_group_id || request.id;

    const [batchRequests] = await db.query(
      `SELECT rr.id, rr.request_type, rr.status, rr.requested_date, rr.issued_date
       FROM record_requests rr
       WHERE rr.request_group_id = ? OR rr.id = ?
       ORDER BY rr.id`,
      [groupId, groupId]
    );

    const batchTypes = [
      ...new Set(batchRequests.map((r) => r.request_type).filter(Boolean)),
    ];
    const anyIssued = batchRequests.length > 0 &&
      batchRequests.every((r) => r.status === "Issued");
    const batchStatus = anyIssued ? "Issued" : "Pending";
    const batchIssuedDates = batchRequests
      .map((r) => r.issued_date)
      .filter(Boolean);

    const logoAsset = getLogoAsset();
    const doc = new jsPDF();
    const reportTitle = `Pet Record Request — ${request.pet_name}`;

    const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : "—");

    // Each record request type produces its own document containing ONLY the
    // sections the pet owner actually requested.
    const TYPE_SECTIONS = {
      "Vaccination Card": ["pet", "owner", "vaccination"],
      "Certificate of Registration": ["pet", "owner", "qr", "registration"],
      "Health Certificate": ["pet", "owner", "clinical", "vaccination"],
      "Medical Record": ["pet", "owner", "clinical", "medicine"],
      "Record Summary": ["pet", "owner", "qr", "vaccination", "clinical", "medicine", "payment"],
      "Prescription Record": ["pet", "owner", "medicine"],
      "Payment Record": ["pet", "owner", "payment"],
      "Pet Transfer Certificate": ["pet", "owner", "registration", "transfer"],
    };
    const sections = [
      ...new Set(
        batchTypes.flatMap(
          (type) =>
            TYPE_SECTIONS[type] ||
            ["pet", "owner", "vaccination", "clinical", "medicine", "payment"]
        )
      ),
    ];

    let y = 0;
    let sec = 0;
    const header = (text) => drawSectionHeader(doc, `${++sec}. ${text}`, y, logoAsset);

    y = drawBrandedHeader(doc, logoAsset, reportTitle);

    y = drawMetaBlock(doc, [
      `Record Request #${groupId}`,
      `Records Requested: ${batchTypes.join("; ") || "N/A"}`,
      `Purpose: ${request.purpose || "N/A"}`,
      `Format: ${request.format || "PDF"}`,
      `Status: ${batchStatus}`,
      `Requested: ${new Date(request.requested_date).toLocaleString()}${
        batchIssuedDates.length
          ? ` | Issued: ${new Date(batchIssuedDates[batchIssuedDates.length - 1]).toLocaleString()}`
          : ""
      }`,
    ], y);

    y = drawNotesBox(doc, "Pet Owner's Comments", request.comments, y, logoAsset);

    const renderPet = () => {
      y = header("PET IDENTITY");
      y = drawField(doc, "Name", request.pet_name, y, logoAsset);
      y = drawField(doc, "Pet Code", request.pet_code, y, logoAsset);
      y = drawField(doc, "Species", request.species_name, y, logoAsset);
      y = drawField(doc, "Breed", request.breed_name, y, logoAsset);
      y = drawField(doc, "Sex", request.sex, y, logoAsset);
      y = drawField(doc, "Color", request.color, y, logoAsset);
      y = drawField(doc, "Birthdate", fmtDate(request.birthdate), y, logoAsset);
      y = drawField(doc, "Registration Date", fmtDate(request.registration_date), y, logoAsset);
      y = drawField(doc, "Status", request.pet_status, y, logoAsset);
      if (request.is_lost) {
        y = drawField(doc, "Lost Status", "Reported Lost", y, logoAsset);
      }
      return y + 2;
    };

    const renderOwner = () => {
      y = header("OWNER INFORMATION");
      y = drawField(doc, "Owner Name", request.owner_name, y, logoAsset);
      y = drawField(doc, "Contact", request.contact_number, y, logoAsset);
      y = drawField(doc, "Address", request.address, y, logoAsset);
      y = drawField(doc, "Barangay", request.barangay, y, logoAsset);
      return y + 2;
    };

    const renderQr = () => {
      if (!qrCode) return y;
      y = header("QR CODE INFORMATION");
      y = drawField(doc, "QR Token", qrCode.qr_token, y, logoAsset);
      y = drawField(doc, "QR Status", qrCode.qr_status, y, logoAsset);
      y = drawField(doc, "Issue Date", fmtDate(qrCode.issue_date), y, logoAsset);
      return y + 2;
    };

    const renderRegistration = () => {
      y = header("REGISTRATION DETAILS");
      y = drawField(doc, "Pet Code", request.pet_code, y, logoAsset);
      y = drawField(doc, "Registration Date", fmtDate(request.registration_date), y, logoAsset);
      y = drawField(doc, "Status", request.pet_status, y, logoAsset);
      y = drawField(doc, "Registered Barangay", request.barangay, y, logoAsset);
      y += 2;
      y = drawNotesBox(
        doc,
        "Statement",
        "This certifies that the above-named pet has been duly registered with the City Veterinary Animal Clinic, Cabuyao City, Laguna.",
        y,
        logoAsset,
      );
      return y;
    };

    const renderTransfer = () => {
      y = header("TRANSFER OF OWNERSHIP");
      y = drawField(doc, "Current Owner", request.owner_name, y, logoAsset);
      y = drawField(doc, "Pet Code", request.pet_code, y, logoAsset);
      y = drawField(doc, "Registered Barangay", request.barangay, y, logoAsset);
      y += 2;
      y = drawNotesBox(
        doc,
        "Declaration",
        `This certifies that ownership of ${request.pet_name} is transferred through the City Veterinary Animal Clinic upon completion of the required documentation.`,
        y,
        logoAsset,
      );
      return y;
    };

    const renderVaccinations = () => {
      y = header("VACCINATION RECORDS");
      if (vaccinations.length === 0) {
        return drawEmptyState(doc, "No vaccination records found.", y, logoAsset);
      }
      const colWidths = [40, 50, 35, 35, 30];
      const headers = ["Vaccine", "Date Administered", "Next Due", "Status", "Comments"];
      drawTableRow(doc, 14, y, headers, colWidths, true);
      y += 10;
      vaccinations.forEach((vac) => {
        y = ensurePageSpace(doc, y, logoAsset, 275);
        drawTableRow(
          doc,
          14,
          y,
          [
            vac.vaccine_name,
            fmtDate(vac.date_administered),
            fmtDate(vac.next_due_date),
            vac.status || "Due",
            vac.comments || "—",
          ],
          colWidths,
          false,
        );
        y += 8;
      });
      return y + 4;
    };

    const renderClinical = () => {
      y = header("CLINICAL / CONSULTATION RECORDS");
      if (consultations.length === 0) {
        return drawEmptyState(doc, "No clinical records found.", y, logoAsset);
      }
      const colWidths = [30, 50, 50, 30, 30];
      const headers = ["Date", "Diagnosis", "Treatment Plan", "Follow-up", "Veterinarian"];
      drawTableRow(doc, 14, y, headers, colWidths, true);
      y += 10;
      consultations.forEach((con) => {
        y = ensurePageSpace(doc, y, logoAsset, 275);
        drawTableRow(
          doc,
          14,
          y,
          [
            fmtDate(con.consultation_date),
            con.diagnosis || "—",
            con.treatment_plan || "—",
            fmtDate(con.follow_up_date),
            con.veterinarian || "—",
          ],
          colWidths,
          false,
        );
        y += 8;
      });
      return y + 4;
    };

    const renderMedicine = () => {
      y = header("MEDICINE / PRESCRIPTION RECORDS");
      if (prescriptions.length === 0) {
        return drawEmptyState(doc, "No prescription records found.", y, logoAsset);
      }
      const colWidths = [30, 40, 20, 25, 20, 40];
      const headers = ["Date", "Medicine", "Dosage", "Frequency", "Duration", "Instructions"];
      drawTableRow(doc, 14, y, headers, colWidths, true);
      y += 10;
      prescriptions.forEach((pre) => {
        y = ensurePageSpace(doc, y, logoAsset, 275);
        drawTableRow(
          doc,
          14,
          y,
          [
            fmtDate(pre.prescribed_date),
            pre.medicine_name || "—",
            pre.dosage || "—",
            pre.frequency || "—",
            pre.duration || "—",
            pre.instructions || "—",
          ],
          colWidths,
          false,
        );
        y += 8;
      });
      return y + 4;
    };

    const renderPayment = () => {
      y = header("PAYMENT RECORDS");
      if (payments.length === 0) {
        return drawEmptyState(doc, "No payment records found.", y, logoAsset);
      }
      const colWidths = [30, 40, 30, 35, 35];
      const headers = ["Date", "Type", "Amount", "Status", "OR Number"];
      drawTableRow(doc, 14, y, headers, colWidths, true);
      y += 10;
      payments.forEach((pay) => {
        y = ensurePageSpace(doc, y, logoAsset, 275);
        drawTableRow(
          doc,
          14,
          y,
          [
            fmtDate(pay.payment_date),
            pay.type_name || "—",
            pay.amount ? `₱${parseFloat(pay.amount).toFixed(2)}` : "—",
            pay.payment_status || "—",
            pay.or_number || "—",
          ],
          colWidths,
          false,
        );
        y += 8;
      });
      return y + 4;
    };

    const RENDERERS = {
      pet: renderPet,
      owner: renderOwner,
      qr: renderQr,
      registration: renderRegistration,
      transfer: renderTransfer,
      vaccination: renderVaccinations,
      clinical: renderClinical,
      medicine: renderMedicine,
      payment: renderPayment,
    };

    for (const key of sections) {
      y = RENDERERS[key]();
    }

    const CERT_TYPES = [
      "Certificate of Registration",
      "Health Certificate",
      "Pet Transfer Certificate",
      "Vaccination Card",
    ];
    if (batchTypes.some((type) => CERT_TYPES.includes(type))) {
      y = drawSignatureArea(doc, y, logoAsset);
    }

    drawFooter(doc, y + 8, logoAsset);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const sanitize = (text) =>
      String(text || "")
        .replace(/[^A-Za-z0-9]+/g, "")
        .slice(0, 40);
    const fileName = batchTypes.length
      ? `PetRecord_${sanitize(request.pet_name)}_${batchTypes.map(sanitize).join("+")}.pdf`
      : `PetRecord_${sanitize(request.pet_name)}_${request.id}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${fileName}"`,
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
// PREVIEW DATA FOR RECORD REQUEST
// =========================================

async function getPreviewData(req, res) {
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

    const groupId = request.request_group_id || request.id;

    const [batchRequests] = await db.query(
      `SELECT rr.id, rr.request_type, rr.status, rr.requested_date, rr.issued_date
       FROM record_requests rr
       WHERE rr.request_group_id = ? OR rr.id = ?
       ORDER BY rr.id`,
      [groupId, groupId]
    );

    const [vaccinations] = await db.query(
      `SELECT vr.date_administered, v.vaccine_name, vr.next_due_date, vr.status, vr.comments
       FROM vaccination_records vr
       JOIN vaccines v ON vr.vaccine_id = v.id
       WHERE vr.pet_id = ?
       ORDER BY vr.date_administered DESC`,
      [request.pet_id]
    );

    const [consultations] = await db.query(
      `SELECT cr.consultation_date, cr.diagnosis, cr.treatment_plan, cr.follow_up_date, ${vetNameExpr('veterinarian')}
       FROM consultation_records cr
       LEFT JOIN users u ON cr.vet_id = u.id
       WHERE cr.pet_id = ?
       ORDER BY cr.consultation_date DESC`,
      [request.pet_id]
    );

    const [prescriptions] = await db.query(
      `SELECT p.prescribed_date, m.medicine_name, pi.dosage, pi.frequency, pi.duration, pi.instructions
       FROM prescriptions p
       JOIN prescription_items pi ON p.id = pi.prescription_id
       JOIN medicines m ON pi.medicine_id = m.id
       JOIN consultation_records c ON p.consultation_id = c.id
       WHERE c.pet_id = ?
       ORDER BY p.prescribed_date DESC`,
      [request.pet_id]
    );

    const [payments] = await db.query(
      `SELECT py.payment_date, pt.type_name, py.amount, py.payment_status, py.or_number
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

    const batchTypes = [...new Set(batchRequests.map((r) => r.request_type).filter(Boolean))];

    res.json({
      success: true,
      preview: {
        batchRequests,
        batchTypes,
        anchorId: groupId,
        purpose: request.purpose,
        format: request.format,
        comments: request.comments,
        pet: {
          id: request.pet_id,
          name: request.pet_name,
          pet_code: request.pet_code,
          species_name: request.species_name,
          breed_name: request.breed_name,
          sex: request.sex,
          color: request.color,
          birthdate: request.birthdate,
          registration_date: request.registration_date,
          pet_status: request.pet_status,
          is_lost: request.is_lost,
        },
        owner: {
          full_name: request.owner_name,
          contact_number: request.contact_number,
          address: request.address,
          barangay: request.barangay,
        },
        vaccinations,
        consultations,
        prescriptions,
        payments,
        qrCode,
      },
    });
  } catch (error) {
    console.error("getPreviewData error:", error);
    res.status(500).json({
      success: false,
      message: "Could not load preview data.",
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
      SELECT rr.id, rr.request_group_id
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

    const targetGroupId = rows[0].request_group_id || requestId;

    await db.query("DELETE FROM record_requests WHERE id = ?", [requestId]);

    const [siblings] = await db.query(
      "SELECT id FROM record_requests WHERE request_group_id = ? OR id = ? ORDER BY id LIMIT 1",
      [targetGroupId, targetGroupId]
    );
    if (siblings.length) {
      const newAnchor = siblings[0].id;
      await db.query(
        "UPDATE record_requests SET request_group_id = ? WHERE (request_group_id = ? OR id = ?) AND id <> ?",
        [newAnchor, targetGroupId, targetGroupId, newAnchor]
      );
    }

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
  getPreviewData,
  deleteRequest,
};   