const db = require('../config/db');
const { createNotification } = require('./notificationService');

/**
 * Writes a prescription and its items through the caller's connection, so the
 * surrounding transaction decides whether the rows survive. The consultation
 * path passes its own transaction, which is what makes a consultation and its
 * prescription commit or roll back together. Callers with no transaction to
 * join can pass the `db` pool directly.
 */
function assignStampColor(category) {
  const palette = {
    antibiotic: '#DC2626',
    anti_inflammatory: '#D97706',
    antiparasitic: '#059669',
    pain: '#7C3AED',
    general: '#6B7280',
  };
  return palette[category] || palette.general;
}

async function insertPrescription(connection, consultationId, items) {
  const [prescriptionResult] = await connection.query(
    'INSERT INTO prescriptions (consultation_id) VALUES (?)',
    [consultationId]
  );
  const prescriptionId = prescriptionResult.insertId;

  if (!prescriptionId) {
    throw new Error('Could not save prescription. Please restart the server and try again.');
  }

  for (const item of items) {
    const medicineId = Number(item.medicine_id);
    const [medicine] = await connection.query(
      `SELECT m.medicine_name, m.category, m.expiry_date,
              COALESCE(
                (SELECT cp.stamp_color FROM catalog_products cp
                 WHERE cp.medicine_id = m.id AND cp.stamp_color IS NOT NULL
                 ORDER BY cp.id LIMIT 1),
                m.stamp_color
              ) AS stamp_color
       FROM medicines m WHERE m.id = ?`,
      [medicineId]
    );
    const stampColor =
      medicine?.[0]?.stamp_color || assignStampColor(medicine?.[0]?.category || 'general');
    if (medicine?.[0] && !medicine[0].stamp_color) {
      await connection.query(
        'UPDATE medicines SET stamp_color = ? WHERE id = ? AND stamp_color IS NULL',
        [stampColor, medicineId]
      );
    }

    const batchNumber = `MED-${medicineId}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 8)}`;

    await connection.query(
      `INSERT INTO prescription_items (prescription_id, medicine_id, quantity, dosage, frequency, duration, instructions, batch_number, expiry_date, dispensed_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prescriptionId,
        medicineId,
        item.quantity || null,
        item.dosage || null,
        item.frequency || null,
        item.duration || null,
        item.instructions || null,
        batchNumber,
        medicine?.[0]?.expiry_date || null,
        new Date().toISOString().slice(0, 10),
      ]
    );
  }

  return prescriptionId;
}

/**
 * Best-effort owner notification. The owner portal, digital pet booklet and
 * public QR profile all read prescriptions, but none of them should be able to
 * fail an already-committed save. Returns the pet name for audit copy.
 */
async function notifyPrescriptionOwner(consultationId) {
  try {
    const [[pet]] = await db.query(
      `SELECT p.name, po.user_id
       FROM consultation_records cr
       JOIN pets p ON cr.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE cr.id = ?`,
      [consultationId]
    );

    if (!pet?.user_id) return null;

    await createNotification(
      pet.user_id,
      'Medicine Record Added',
      `${pet.name} has a new medicine prescription.`,
      'System',
      false,
      'clinical-medicine'
    );

    return pet.name;
  } catch (error) {
    console.warn('Prescription saved but notification failed:', error.message);
    return null;
  }
}

module.exports = { insertPrescription, notifyPrescriptionOwner };
