const db = require('../config/db');
const { logAudit } = require('../middleware/auditMiddleware');

// GET /api/qr/pet/:petId  (Staff/Admin/Vet - fetch QR token for a pet)
async function getQrByPet(req, res) {
  const { petId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT id, qr_token, status, issue_date
       FROM qr_codes
       WHERE pet_id = ?
       ORDER BY issue_date DESC
       LIMIT 1`,
      [petId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "No QR code found for this pet." });
    }
    if (rows[0].status !== "Generated") {
      return res.status(403).json({ success: false, message: "This QR code is no longer active." });
    }
    res.json({ success: true, qr: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load QR data.", error: error.message });
  }
}

// GET /api/qr/my-codes  (Pet Owner - QR codes for their own pets)
async function getMyQrCodes(req, res) {
  try {
    const [rows] = await db.query(
      `
      SELECT
        qc.id,
        qc.qr_token,
        qc.image_path,
        qc.status,
        qc.issue_date,

        p.id AS pet_id,
        p.pet_code,
        p.name AS pet_name,
        p.photo,
        p.sex,
        p.color,
        p.registration_date,
        p.is_lost,
        p.last_seen,
        p.reward,
        p.birthdate,

        s.species_name,

        COALESCE(
          b.breed_name,
          p.breed_custom
        ) AS breed_name,

        (SELECT COUNT(*) FROM vaccination_records vr WHERE vr.pet_id = p.id) AS vaccination_count,
        (SELECT COUNT(*) FROM vaccination_records vr
           WHERE vr.pet_id = p.id
             AND vr.next_due_date IS NOT NULL
             AND vr.next_due_date < CURDATE()
        ) AS overdue_vaccinations,
        (SELECT vr.date_administered FROM vaccination_records vr
           WHERE vr.pet_id = p.id
           ORDER BY vr.date_administered DESC LIMIT 1
        ) AS latest_vaccine_date,
        (SELECT v.vaccine_name FROM vaccination_records vr
           JOIN vaccines v ON vr.vaccine_id = v.id
           WHERE vr.pet_id = p.id
           ORDER BY vr.date_administered DESC LIMIT 1
        ) AS latest_vaccine_name,
        (SELECT vr.next_due_date FROM vaccination_records vr
           WHERE vr.pet_id = p.id
           ORDER BY vr.date_administered DESC LIMIT 1
        ) AS latest_next_due,

        po.full_name,
        po.contact_number

      FROM qr_codes qc

      JOIN pets p
        ON qc.pet_id = p.id

      JOIN pet_owners po
        ON p.pet_owner_id = po.id

      LEFT JOIN species s
        ON p.species_id = s.id

      LEFT JOIN breeds b
        ON p.breed_id = b.id

      WHERE po.user_id = ?

      ORDER BY qc.issue_date DESC
      `,
      [req.user.id]
    );

    res.json({
      success: true,
      qrCodes: rows
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Could not load QR codes.",
      error: error.message
    });

  }
}

// GET /api/qr/scan/:token  (anyone with a valid login can scan and trace a pet)
// This is the "trigger" described in the manuscript: scanning just retrieves
// the pet's full record — registration, vaccination, clinical, payment.
async function scanQrToken(req, res) {
  const { token } = req.params;
  try {
    const [petRows] = await db.query(
      `SELECT p.*, qc.issue_date, qc.status AS qr_status, qc.image_path, po.user_id AS owner_user_id, po.full_name AS owner_name, po.contact_number, po.address, po.barangay, po.emergency_contact_name, po.emergency_contact_number, s.species_name, COALESCE( b.breed_name, p.breed_custom ) AS breed_name
       FROM qr_codes qc
       JOIN pets p ON qc.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       LEFT JOIN species s ON p.species_id = s.id
       LEFT JOIN breeds b ON p.breed_id = b.id
       WHERE qc.qr_token = ?`,
      [token]
    );

    if (petRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Record not found. This QR code is not valid or active.' });
    }

    const pet = petRows[0];

    // Revoked / not-yet-issued codes must not resolve to a booklet.
    if (pet.qr_status !== 'Generated') {
      return res.status(403).json({ success: false, message: 'This QR code is no longer active.' });
    }

    // Owners can only view their own pets' records. Staff, Admin and
    // Veterinarians may trace any pet.
    const privilegedRoles = ['Staff', 'Admin', 'Veterinarian'];
    if (!privilegedRoles.includes(req.user.role) && pet.owner_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only view your own pets\' records.' });
    }

    const [vaccinations] = await db.query(
      `SELECT vr.*, v.vaccine_name FROM vaccination_records vr
       JOIN vaccines v ON vr.vaccine_id = v.id
       WHERE vr.pet_id = ?
       ORDER BY vr.date_administered DESC`,
      [pet.id]
    );

    const [consultations] = await db.query(
    `SELECT
        c.id,
        c.diagnosis,
        c.treatment_plan,
        c.consultation_date,
        c.follow_up_date,
        u.email AS veterinarian
    FROM consultation_records c
    LEFT JOIN users u
    ON c.vet_id = u.id
    WHERE c.pet_id = ?
    ORDER BY c.consultation_date DESC`,
    [pet.id]
    );

    const [prescriptions] = await db.query(
    `
    SELECT

    p.id,

    p.prescribed_date,

    m.medicine_name,

    pi.quantity,

    pi.dosage,

    pi.frequency,

    pi.duration,

    pi.instructions

    FROM prescriptions p

    JOIN prescription_items pi
    ON p.id = pi.prescription_id

    JOIN medicines m
    ON pi.medicine_id = m.id

    JOIN consultation_records c
    ON p.consultation_id = c.id

    WHERE c.pet_id = ?

    ORDER BY p.prescribed_date DESC
    `,
    [
    pet.id
    ]
    );

    const [payments] = await db.query(
    `
    SELECT

    p.payment_date,

    p.amount,

    p.payment_status,

    p.validation_status,

    p.or_number,

    pt.type_name

    FROM payments p

    JOIN payment_types pt
    ON p.payment_type_id = pt.id

    WHERE p.pet_id = ?

    ORDER BY p.payment_date DESC
    `,
    [
    pet.id
    ]
    );

    const [preventiveCare] = await db.query(
      `SELECT id, care_type, product_name, date_administered, next_due_date, administered_by, notes
       FROM preventive_care_records
       WHERE pet_id = ?
       ORDER BY date_administered DESC`,
      [pet.id]
    );

    const [procedures] = await db.query(
      `SELECT id, procedure_type, procedure_name, procedure_date, veterinarian, result_notes
       FROM pet_procedures
       WHERE pet_id = ?
       ORDER BY procedure_date DESC`,
      [pet.id]
    );

    res.json({

    success:true,

    pet,

    vaccinations,

    consultations,

    prescriptions,

    payments,

    preventiveCare,

    procedures

    });

    await logAudit(req, {
      action: 'VIEW',
      entity_type: 'qr',
      entity_id: pet.id,
      description: `QR scanned for "${pet.name}" (${pet.pet_code})`
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Trace lookup failed.', error: error.message });
  }
}

// ======================================================
// PUBLIC QR
// Accessible without login
// Shows limited pet information only
// ======================================================

async function scanPublicQr(req, res) {

    const { token } = req.params;

    try {

        const [rows] = await db.query(
        `
        SELECT

        p.id,

        p.pet_code,

        p.name,

        p.sex,

        p.color,

        p.registration_date,

        p.photo,

        p.is_lost,

        p.last_seen,

        p.reward,

        p.lost_date,

        p.status,

        qc.qr_token,

        qc.image_path,

        qc.issue_date,

        qc.status AS qr_status,

        s.species_name,

        COALESCE(
            b.breed_name,
            p.breed_custom
        ) AS breed_name,

        po.full_name,

        po.contact_number

    FROM qr_codes qc

    JOIN pets p
    ON qc.pet_id = p.id

    JOIN pet_owners po
    ON p.pet_owner_id = po.id

    LEFT JOIN species s
    ON p.species_id = s.id

    LEFT JOIN breeds b
    ON p.breed_id = b.id

    WHERE qc.qr_token = ?
        `,
        [token]
        );

        if(rows.length === 0){

            return res.status(404).json({
                success:false,
                message:"QR Code not found."
            });

        }

        const pet = rows[0];

        const [vaccinations] = await db.query(
        `
        SELECT
        vr.*, v.vaccine_name
        FROM vaccination_records vr
        JOIN vaccines v ON vr.vaccine_id = v.id
        WHERE vr.pet_id = ?
        ORDER BY vr.date_administered DESC
        `,
        [pet.id]
        );

        const [preventiveCare] = await db.query(
        `
        SELECT id, care_type, product_name, date_administered, next_due_date, administered_by, notes
        FROM preventive_care_records
        WHERE pet_id = ?
        ORDER BY date_administered DESC
        `,
        [pet.id]
        );

        const [procedures] = await db.query(
        `
        SELECT id, procedure_type, procedure_name, procedure_date, veterinarian, result_notes
        FROM pet_procedures
        WHERE pet_id = ?
        ORDER BY procedure_date DESC
        `,
        [pet.id]
        );

        res.json({
            success: true,
            pet,
            vaccinations,
          latestVaccination: vaccinations[0] || null,
          preventiveCare,
          procedures
        });

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            success:false,

            message:"Unable to retrieve public pet profile.",

            error:error.message

        });

    }

}

// GET /api/qr/owner/:token
// Resolves a QR token to the PET + its OWNER, in the same shape as the
// payment-monitoring owner search, so the staff can match + verify.
async function scanOwnerQr(req, res) {
  const { token } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT
         po.id AS owner_id,
         po.full_name,
         po.contact_number,
         po.address,
         po.barangay,
         p.id AS pet_id,
         p.name AS pet_name,
         p.pet_code AS pet_code,
         p.sex AS pet_sex,
         p.color AS pet_color,
         p.photo AS pet_photo,
         s.species_name AS pet_species,
         COALESCE(b.breed_name, p.breed_custom) AS pet_breed,
         (SELECT COUNT(*) FROM pets p2 WHERE p2.pet_owner_id = po.id) AS pet_count
       FROM qr_codes qc
       JOIN pets p ON qc.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       LEFT JOIN species s ON p.species_id = s.id
       LEFT JOIN breeds b ON p.breed_id = b.id
       WHERE qc.qr_token = ?
       LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'QR not recognized. This code is not registered in the system.' });
    }

    res.json({ success: true, owner: rows[0] });

    await logAudit(req, {
      action: 'VIEW',
      entity_type: 'qr',
      entity_id: rows[0].pet_id,
      description: `QR scanned to match owner "${rows[0].full_name}" — ${rows[0].pet_name} (${rows[0].pet_code})`
    });
  } catch (error) {
    console.error('Scan owner QR error:', error);
    res.status(500).json({ success: false, message: 'Could not look up the pet owner for this QR code.', error: error.message });
  }
}

module.exports = { getMyQrCodes, getQrByPet, scanQrToken, scanPublicQr, scanOwnerQr };
