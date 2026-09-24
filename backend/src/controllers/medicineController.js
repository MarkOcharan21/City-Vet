const db = require('../config/db');
const { createNotification } = require('../services/notificationService');
const {
  validationError,
  validatePrescription,
} = require('../utils/validation');
const { logAudit } = require('../middleware/auditMiddleware');
const { vetNameExpr } = require('../utils/vetNameFormat');

// GET /api/medicines/list  (dropdown data)
async function getMedicineList(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM medicines');
    res.json({ success: true, medicines: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load medicine list.', error: error.message });
  }
}

// GET /api/medicines/my-records  (Pet Owner - prescriptions for their pets)
async function getMyMedicineRecords(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT pi.*, m.medicine_name, pr.prescribed_date, p.name AS pet_name, ${vetNameExpr('vet_name')}
       FROM prescription_items pi
       JOIN medicines m ON pi.medicine_id = m.id
       JOIN prescriptions pr ON pi.prescription_id = pr.id
       JOIN consultation_records cr ON pr.consultation_id = cr.id
       JOIN pets p ON cr.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       LEFT JOIN users u ON cr.vet_id = u.id
       WHERE po.user_id = ?
       ORDER BY pr.prescribed_date DESC`,
      [req.user.id]
    );
    res.json({ success: true, records: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load medicine records.', error: error.message });
  }
}

// GET /api/medicines  (Staff/Vet - all prescription records)
async function getAllMedicineRecords(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT pi.*,
              pr.id AS prescription_id,
              pr.prescribed_date,
              m.medicine_name,
              p.name AS pet_name,
              p.pet_code,
              po.full_name AS owner_name,
              cr.consultation_date,
              cr.diagnosis,
              ${vetNameExpr('vet_name')}
       FROM prescription_items pi
       JOIN medicines m ON pi.medicine_id = m.id
       JOIN prescriptions pr ON pi.prescription_id = pr.id
       JOIN consultation_records cr ON pr.consultation_id = cr.id
       JOIN pets p ON cr.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       LEFT JOIN users u ON cr.vet_id = u.id
       ORDER BY pr.prescribed_date DESC, pi.id DESC`
    );
    res.json({ success: true, records: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load medicine records.', error: error.message });
  }
}

// POST /api/medicines/prescriptions  (Vet creates a prescription with items)
// Body: { consultation_id | pet_id, items: [{ medicine_id, quantity, dosage, frequency, duration, instructions }] }
async function addPrescription(req, res) {
  const { consultation_id, pet_id, items } = req.body;
  const validation = validatePrescription({ consultation_id, pet_id, items });

  if (!validation.valid) {
    return validationError(res, validation.message, validation.errors);
  }

  try {
    let resolvedConsultationId = consultation_id;

    if (!resolvedConsultationId) {
      const [[latestConsultation]] = await db.query(
        `SELECT id
         FROM consultation_records
         WHERE pet_id = ?
         ORDER BY consultation_date DESC, created_at DESC
         LIMIT 1`,
        [pet_id]
      );

      if (latestConsultation) {
        resolvedConsultationId = latestConsultation.id;
      } else {
        const today = new Date().toISOString().slice(0, 10);
        const [consultationResult] = await db.query(
          `INSERT INTO consultation_records (pet_id, consultation_date, vet_id)
           VALUES (?, ?, ?)`,
          [Number(pet_id), today, req.user.id]
        );
        resolvedConsultationId = consultationResult.insertId;
      }
    }

    if (!resolvedConsultationId) {
      return res.status(500).json({
        success: false,
        message: 'Could not link prescription to a consultation record.',
      });
    }

    const [prescriptionResult] = await db.query(
      'INSERT INTO prescriptions (consultation_id) VALUES (?)',
      [resolvedConsultationId]
    );
    const prescriptionId = prescriptionResult.insertId;

    if (!prescriptionId) {
      return res.status(500).json({
        success: false,
        message: 'Could not save prescription. Please restart the server and try again.',
      });
    }

    for (const item of items) {
      await db.query(
        `INSERT INTO prescription_items (prescription_id, medicine_id, quantity, dosage, frequency, duration, instructions)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          prescriptionId,
          Number(item.medicine_id),
          item.quantity || null,
          item.dosage || null,
          item.frequency || null,
          item.duration || null,
          item.instructions || null,
        ]
      );
    }

    const [[pet]] = await db.query(
      `SELECT p.name, po.user_id
       FROM consultation_records cr
       JOIN pets p ON cr.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE cr.id = ?`,
      [resolvedConsultationId]
    );

    if (pet?.user_id) {
      try {
        await createNotification(
          pet.user_id,
          'Medicine Record Added',
          `${pet.name} has a new medicine prescription.`,
          'System',
          false,
          'clinical-medicine'
        );
      } catch (notificationError) {
        console.warn('Prescription saved but notification failed:', notificationError.message);
      }
    }

    res.status(201).json({ success: true, message: 'Prescription saved.', prescriptionId });

    await logAudit(req, {
      action: 'CREATE',
      entity_type: 'prescription',
      entity_id: prescriptionId,
      new_value: { consultation_id: resolvedConsultationId, items_count: items.length },
      description: `Prescription saved for "${pet?.name || pet_id}" with ${items.length} item(s)`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not save prescription.', error: error.message });
  }
}

module.exports = { getMedicineList, getMyMedicineRecords, getAllMedicineRecords, addPrescription };
