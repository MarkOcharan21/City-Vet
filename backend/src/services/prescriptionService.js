const db = require('../config/db');
const { createNotification } = require('./notificationService');

/**
 * Writes a prescription and its items through the caller's connection, so the
 * surrounding transaction decides whether the rows survive. The consultation
 * path passes its own transaction, which is what makes a consultation and its
 * prescription commit or roll back together. Callers with no transaction to
 * join can pass the `db` pool directly.
 */
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
    await connection.query(
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
