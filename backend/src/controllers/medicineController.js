const db = require('../config/db');
const {
  validationError,
  validatePrescription,
} = require('../utils/validation');
const { insertPrescription, notifyPrescriptionOwner } = require('../services/prescriptionService');
const { logAudit } = require('../middleware/auditMiddleware');
const { vetNameExpr } = require('../utils/vetNameFormat');

// GET /api/medicines/list  (dropdown data + dosing defaults for the auto-fill)
async function getMedicineList(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT m.id, m.medicine_name, m.description, m.category,
              m.default_dosage, m.default_frequency, m.default_duration, m.default_instructions,
              cp.price AS price
       FROM medicines m
       LEFT JOIN catalog_products cp ON cp.medicine_id = m.id
       ORDER BY m.medicine_name`
    );
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
      // Only reuse a consultation that actually went through the billing pipeline.
      // A record with no charges is a leftover stub, not a billable visit.
      const [[latestConsultation]] = await db.query(
        `SELECT cr.id
         FROM consultation_records cr
         WHERE cr.pet_id = ?
           AND EXISTS (SELECT 1 FROM consultation_charges cc WHERE cc.consultation_id = cr.id)
         ORDER BY cr.consultation_date DESC, cr.created_at DESC
         LIMIT 1`,
        [pet_id]
      );

      if (latestConsultation) {
        resolvedConsultationId = latestConsultation.id;
      } else {
        // A prescription used to fabricate an empty consultation row here, which
        // produced no payment transaction and broke the one-consultation-one-payment
        // rule. Prescriptions now hang off a real saved consultation.
        return res.status(409).json({
          success: false,
          message:
            'This patient has no saved consultation yet. Save the consultation first so its payment transaction is created, then attach the prescription to it.',
        });
      }
    }

    if (!resolvedConsultationId) {
      return res.status(500).json({
        success: false,
        message: 'Could not link prescription to a consultation record.',
      });
    }

    const prescriptionId = await insertPrescription(db, resolvedConsultationId, items);

    const notifiedPetName = await notifyPrescriptionOwner(resolvedConsultationId);

    res.status(201).json({ success: true, message: 'Prescription saved.', prescriptionId });

    await logAudit(req, {
      action: 'CREATE',
      entity_type: 'prescription',
      entity_id: prescriptionId,
      new_value: { consultation_id: resolvedConsultationId, items_count: items.length },
      description: `Prescription saved for "${notifiedPetName || pet_id}" with ${items.length} item(s)`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not save prescription.', error: error.message });
  }
}

module.exports = { getMedicineList, getMyMedicineRecords, getAllMedicineRecords, addPrescription };
