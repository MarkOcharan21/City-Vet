const db = require('../config/db');
const { createNotification } = require('../services/notificationService');
const { sendDueReminder } = require('../services/dueReminderService');
const {
  validationError,
  validateClinicalRecord,
} = require('../utils/validation');
const { logAudit } = require('../middleware/auditMiddleware');

// GET /api/clinical/my-records  (Pet Owner view)
async function getMyClinicalRecords(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT cr.*, p.name AS pet_name
       FROM consultation_records cr
       JOIN pets p ON cr.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE po.user_id = ?
       ORDER BY cr.consultation_date DESC`,
      [req.user.id]
    );
    res.json({ success: true, records: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load consultation records.', error: error.message });
  }
}

// GET /api/clinical  (Staff/Vet - all consultation records)
async function getAllClinicalRecords(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT cr.*,
              p.name AS pet_name,
              p.pet_code,
              po.full_name AS owner_name,
              COALESCE(u.full_name, u.email) AS vet_name
       FROM consultation_records cr
       JOIN pets p ON cr.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       LEFT JOIN users u ON cr.vet_id = u.id
       ORDER BY cr.consultation_date DESC, cr.created_at DESC`
    );
    res.json({ success: true, records: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load consultation records.', error: error.message });
  }
}

// POST /api/clinical  (Vet adds a consultation record)
async function addClinicalRecord(req, res) {
  const { pet_id, diagnosis, treatment_plan, consultation_date, follow_up_date } = req.body;
  const validation = validateClinicalRecord({ pet_id, consultation_date, follow_up_date });

  if (!validation.valid) {
    return validationError(res, validation.message, validation.errors);
  }

  try {
    const [result] = await db.query(
      `INSERT INTO consultation_records (pet_id, diagnosis, treatment_plan, consultation_date, follow_up_date, vet_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pet_id, diagnosis || null, treatment_plan || null, consultation_date, follow_up_date || null, req.user.id]
    );

    const [[pet]] = await db.query(
      `SELECT p.name, po.user_id
       FROM pets p
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE p.id = ?`,
      [pet_id]
    );

    if (pet?.user_id) {
      await createNotification(
        pet.user_id,
        'Consultation Record Added',
        `${pet.name} has a new consultation record.`,
        'System',
        false,
        'clinical-medicine'
      );

      if (follow_up_date) {
        await sendDueReminder({
          userId: pet.user_id,
          petName: pet.name,
          dueDate: follow_up_date,
          category: 'Follow-Up Visit',
          type: 'System',
          link: 'clinical-medicine',
        });
      }
    }

    res.status(201).json({ success: true, message: 'Consultation record saved.', consultationId: result.insertId });

    await logAudit(req, {
      action: 'CREATE',
      entity_type: 'clinical_record',
      entity_id: result.insertId,
      new_value: { pet_id, diagnosis: diagnosis || null, treatment_plan: treatment_plan || null, consultation_date, follow_up_date: follow_up_date || null },
      description: `Consultation record added for "${pet?.name || pet_id}" on ${consultation_date}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not save consultation record.', error: error.message });
  }
}

module.exports = { getMyClinicalRecords, getAllClinicalRecords, addClinicalRecord };
