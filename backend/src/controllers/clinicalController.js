const crypto = require('crypto');
const db = require('../config/db');
const { createNotification, notifyUsersByRoles } = require('../services/notificationService');
const { sendDueReminder } = require('../services/dueReminderService');
const {
  validationError,
  validateClinicalRecord,
} = require('../utils/validation');
const { logAudit } = require('../middleware/auditMiddleware');
const { vetNameExpr } = require('../utils/vetNameFormat');
const queueLock = require('../services/clinicQueueLock');

// GET /api/clinical/my-records  (Pet Owner view)
async function getMyClinicalRecords(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT cr.*, p.name AS pet_name, ${vetNameExpr('vet_name')}
       FROM consultation_records cr
       JOIN pets p ON cr.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       LEFT JOIN users u ON cr.vet_id = u.id
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
              ${vetNameExpr('vet_name')}
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

function clinicalError(statusCode, message, details = {}) {
  return Object.assign(new Error(message), { statusCode, ...details });
}

function parseMoneyToCents(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw clinicalError(500, 'A catalog product has an invalid price.');
  }
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 9999999999) {
    throw clinicalError(500, 'A catalog product price is outside the supported range.');
  }
  return cents;
}

function formatCents(cents) {
  return (cents / 100).toFixed(2);
}

function createPaymentReference() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `PM-${date}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function normalizeChargeInput(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw clinicalError(400, 'Charges must be an array.');
  const merged = new Map();
  for (const item of value) {
    const catalogProductId = Number(item?.catalog_product_id ?? item?.product_id);
    const quantity = Number(item?.quantity ?? 1);
    if (!Number.isInteger(catalogProductId) || catalogProductId < 1) {
      throw clinicalError(400, 'Each charge must have a valid catalog product.');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw clinicalError(400, 'Charge quantity must be an integer of at least 1.');
    }
    const current = merged.get(catalogProductId) || 0;
    const nextQuantity = current + quantity;
    if (!Number.isSafeInteger(nextQuantity)) {
      throw clinicalError(400, 'Charge quantity is too large.');
    }
    merged.set(catalogProductId, nextQuantity);
  }
  return [...merged.entries()].map(([catalogProductId, quantity]) => ({ catalogProductId, quantity }));
}

async function loadConsultationResponse(consultationId, queueId = null) {
  const [consultationRows] = await db.query(
    `SELECT cr.id,
            cr.pet_id,
            cr.queue_id,
            cr.complaint,
            cr.diagnosis,
            cr.treatment_plan,
            cr.consultation_date,
            cr.follow_up_date,
            cr.vet_id,
            cr.created_at,
            p.name AS pet_name,
            p.pet_code,
            po.id AS pet_owner_id,
            po.full_name AS owner_name,
            COALESCE(vet.full_name, vet.email) AS veterinarian_name
     FROM consultation_records cr
     JOIN pets p ON p.id = cr.pet_id
     JOIN pet_owners po ON po.id = p.pet_owner_id
     LEFT JOIN users vet ON vet.id = cr.vet_id
     WHERE cr.id = ?
     LIMIT 1`,
    [consultationId],
  );
  const consultation = consultationRows[0] || null;
  if (!consultation) return null;

  const [paymentRows] = await db.query(
    `SELECT id,
            consultation_id,
            payment_reference,
            payment_status,
            total_amount,
            consultation_date,
            status_updated_by,
            status_updated_at,
            created_at
     FROM payment_monitoring
     WHERE consultation_id = ?
     LIMIT 1`,
    [consultationId],
  );
  const paymentRow = paymentRows[0] || null;
  const [chargeRows] = await db.query(
    `SELECT id,
            catalog_product_id,
            description,
            quantity,
            unit_price,
            line_total
     FROM consultation_charges
     WHERE consultation_id = ?
     ORDER BY id ASC`,
    [consultationId],
  );
  const charges = chargeRows.map((charge) => ({
    ...charge,
    quantity: Number(charge.quantity),
    unit_price: Number(charge.unit_price),
    line_total: Number(charge.line_total),
  }));
  const payment = paymentRow
    ? {
        id: paymentRow.id,
        paymentId: paymentRow.id,
        consultationId: paymentRow.consultation_id,
        paymentReference: paymentRow.payment_reference,
        paymentStatus: paymentRow.payment_status,
        totalAmount: Number(paymentRow.total_amount),
        consultationDate: paymentRow.consultation_date,
        statusUpdatedBy: paymentRow.status_updated_by,
        statusUpdatedAt: paymentRow.status_updated_at,
        createdAt: paymentRow.created_at,
      }
    : null;

  return {
    consultation,
    charges,
    payment,
    consultationId: consultation.id,
    queueId: queueId ?? consultation.queue_id,
    paymentId: payment?.paymentId ?? null,
    paymentReference: payment?.paymentReference ?? null,
    paymentStatus: payment?.paymentStatus ?? 'Unpaid',
    totalAmount: payment?.totalAmount ?? 0,
  };
}

// POST /api/clinical  (Vet adds a consultation record)
async function addClinicalRecord(req, res) {
  const body = req.body || {};
  const petId = Number(body.pet_id);
  const queueId = Number(body.queue_id);
  const complaint = body.complaint === undefined || body.complaint === null ? null : String(body.complaint).trim().slice(0, 255) || null;
  const diagnosis = body.diagnosis || null;
  const treatmentPlan = body.treatment_plan || null;
  const consultationDate = body.consultation_date;
  const followUpDate = body.follow_up_date || null;
  const validation = validateClinicalRecord({ pet_id: petId, consultation_date: consultationDate, follow_up_date: followUpDate });

  if (!validation.valid) {
    return validationError(res, validation.message, validation.errors);
  }
  if (!Number.isInteger(queueId) || queueId < 1) {
    return validationError(res, 'A queue entry is required.', { queue_id: 'Select a queue entry.' });
  }

  let chargeInput;
  try {
    chargeInput = normalizeChargeInput(body.charges);
  } catch (error) {
    return validationError(res, error.message);
  }
  if (!chargeInput.length) {
    return validationError(res, 'At least one consultation charge is required.');
  }

  let connection;
  let lockAcquired = false;
  let transactionStarted = false;
  let consultationId;
  let paymentId;
  let paymentReference;
  let totalCents = 0;
  let pet;
  let queueRow;
  let queueCompleted = false;
  let idempotent = false;
  let created = false;

  try {
    connection = await db.getConnection();
    lockAcquired = await queueLock.acquire(connection);
    if (!lockAcquired) {
      return res.status(503).json({ success: false, message: 'Another queue update is in progress. Please try again.' });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    const [existingRows] = await connection.query(
      `SELECT id, pet_id
       FROM consultation_records
       WHERE queue_id = ?
       LIMIT 1
       FOR UPDATE`,
      [queueId],
    );
    if (existingRows[0]) {
      if (Number(existingRows[0].pet_id) !== petId) {
        throw clinicalError(409, 'The queue entry belongs to a different pet.');
      }
      consultationId = existingRows[0].id;
      idempotent = true;
      await connection.rollback();
      transactionStarted = false;
    } else {
      const [queueRows] = await connection.query(
        `SELECT q.id,
                q.pet_id,
                q.batch_id,
                q.status,
                q.veterinarian_id,
                p.name AS pet_name,
                p.pet_code,
                p.pet_owner_id,
                po.user_id AS owner_user_id
         FROM clinic_queue q
         JOIN pets p ON p.id = q.pet_id
         JOIN pet_owners po ON po.id = p.pet_owner_id
         WHERE q.id = ?
         LIMIT 1
         FOR UPDATE`,
        [queueId],
      );
      queueRow = queueRows[0] || null;
      if (!queueRow) {
        throw clinicalError(404, 'Queue entry not found.');
      }
      if (Number(queueRow.pet_id) !== petId) {
        throw clinicalError(409, 'The queue entry does not match the selected pet.');
      }
      if (!['Waiting', 'In Consultation'].includes(queueRow.status)) {
        throw clinicalError(409, 'The queue entry has already been finalized.');
      }
      if (
        req.user.role === 'Veterinarian' &&
        queueRow.veterinarian_id != null &&
        Number(queueRow.veterinarian_id) !== Number(req.user.id)
      ) {
        throw clinicalError(409, 'This queue entry is assigned to another veterinarian.');
      }

      const productIds = chargeInput.map((charge) => charge.catalogProductId);
      const products = [];
      if (productIds.length > 0) {
        const placeholders = productIds.map(() => '?').join(', ');
        const [productRows] = await connection.query(
          `SELECT id, product_name, price
           FROM catalog_products
           WHERE id IN (${placeholders}) AND active = 1
           FOR UPDATE`,
          productIds,
        );
        products.push(...productRows);
      }
      const productMap = new Map(products.map((product) => [Number(product.id), product]));
      if (products.length !== productIds.length) {
        const missing = productIds.find((productId) => !productMap.has(productId));
        throw clinicalError(400, `Catalog product ${missing} is unavailable.`);
      }

      const lines = chargeInput.map((charge) => {
        const product = productMap.get(charge.catalogProductId);
        const unitPriceCents = parseMoneyToCents(product.price);
        const lineTotalCents = unitPriceCents * charge.quantity;
        if (!Number.isSafeInteger(lineTotalCents) || lineTotalCents > 9999999999) {
          throw clinicalError(400, 'The charge total is outside the supported range.');
        }
        return {
          catalogProductId: charge.catalogProductId,
          description: product.product_name,
          quantity: charge.quantity,
          unitPrice: unitPriceCents,
          lineTotal: lineTotalCents,
        };
      });
      totalCents = lines.reduce((sum, line) => sum + line.lineTotal, 0);
      if (!Number.isSafeInteger(totalCents) || totalCents > 9999999999) {
        throw clinicalError(400, 'The consultation total is outside the supported range.');
      }

      const assignedVeterinarianId = queueRow.veterinarian_id || (req.user.role === 'Veterinarian' ? req.user.id : null);
      const recordedBy = assignedVeterinarianId || req.user.id;
      const [consultationResult] = await connection.query(
        `INSERT INTO consultation_records
           (pet_id, queue_id, complaint, diagnosis, treatment_plan, consultation_date, follow_up_date, vet_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [petId, queueId, complaint, diagnosis, treatmentPlan, consultationDate, followUpDate, assignedVeterinarianId],
      );
      consultationId = consultationResult.insertId;
      pet = {
        name: queueRow.pet_name,
        pet_code: queueRow.pet_code,
        pet_owner_id: queueRow.pet_owner_id,
        user_id: queueRow.owner_user_id,
      };

      for (const line of lines) {
        await connection.query(
          `INSERT INTO consultation_charges
             (consultation_id, catalog_product_id, description, quantity, unit_price, line_total)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            consultationId,
            line.catalogProductId,
            line.description,
            line.quantity,
            formatCents(line.unitPrice),
            formatCents(line.lineTotal),
          ],
        );
      }

      paymentReference = createPaymentReference();
      const totalAmount = formatCents(totalCents);
      const paymentItems = JSON.stringify(
        lines.map((line) => ({
          catalog_product_id: line.catalogProductId,
          description: line.description,
          quantity: line.quantity,
          unit_price: formatCents(line.unitPrice),
          line_total: formatCents(line.lineTotal),
        })),
      );
      const [paymentResult] = await connection.query(
        `INSERT INTO payment_monitoring
           (payment_items, pet_owner_id, pet_id, payment_type, recorded_by, consultation_id,
            payment_reference, payment_status, total_amount, consultation_date,
            status_updated_by, status_updated_at)
         VALUES (?, ?, ?, 'Consultation', ?, ?, ?, 'Unpaid', ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          paymentItems,
          queueRow.pet_owner_id,
          petId,
          recordedBy,
          consultationId,
          paymentReference,
          totalAmount,
          consultationDate,
          recordedBy,
        ],
      );
      paymentId = paymentResult.insertId;

      const queueVeterinarianId = assignedVeterinarianId;
      const [queueResult] = await connection.query(
        `UPDATE clinic_queue
         SET status = 'Completed',
             veterinarian_id = COALESCE(veterinarian_id, ?),
             completed_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status IN ('Waiting', 'In Consultation')`,
        [queueVeterinarianId, queueId],
      );
      if (queueResult.affectedRows === 0) {
        throw clinicalError(409, 'The queue entry changed while the consultation was being saved.');
      }
      queueCompleted = true;

      if (queueRow.batch_id) {
        const [[remaining]] = await connection.query(
          `SELECT COUNT(*) AS count
           FROM clinic_queue
           WHERE batch_id = ? AND status IN ('Waiting', 'In Consultation')`,
          [queueRow.batch_id],
        );
        if (Number(remaining.count) === 0) {
          await connection.query(
            `UPDATE consultation_batches SET status = 'Completed' WHERE id = ? AND status = 'Active'`,
            [queueRow.batch_id],
          );
        }
      }

      await connection.commit();
      transactionStarted = false;
      created = true;
    }
  } catch (error) {
    if (transactionStarted && connection) {
      await connection.rollback().catch(() => {});
    }
    if (!res.headersSent) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode ? error.message : 'Could not save consultation record.',
        ...(error.statusCode ? {} : { error: error.message }),
      });
    }
    return;
  } finally {
    if (connection) {
      if (lockAcquired) await queueLock.release(connection);
      connection.release();
    }
  }

  let responseData;
  try {
    responseData = await loadConsultationResponse(consultationId, queueId);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Consultation was saved but could not be reloaded.', error: error.message });
  }
  if (!responseData) {
    return res.status(500).json({ success: false, message: 'Consultation was saved but could not be reloaded.' });
  }

  res.status(idempotent ? 200 : 201).json({
    success: true,
    message: idempotent ? 'Consultation record already exists.' : 'Consultation record saved.',
    ...responseData,
  });

  if (!created) return;
  if (pet?.user_id) {
    createNotification(
      pet.user_id,
      'Consultation Record Added',
      `${pet.name} has a new consultation record.`,
      'System',
      false,
      'clinical-medicine',
    ).catch((error) => console.warn('Consultation notification failed:', error.message));
    if (followUpDate) {
      sendDueReminder({
        userId: pet.user_id,
        petName: pet.name,
        dueDate: followUpDate,
        category: 'Follow-Up Visit',
        type: 'System',
        link: 'clinical-medicine',
      }).catch((error) => console.warn('Consultation follow-up reminder failed:', error.message));
    }
  }
  if (queueCompleted) {
    notifyUsersByRoles(
      ['Staff'],
      'Consultation Completed',
      `${pet?.name || 'The patient'} has a saved consultation record.`,
      'ClinicQueue',
      'queue',
      true,
    ).catch((error) => console.warn('Queue completion notification failed:', error.message));
  }
  logAudit(req, {
    action: 'CREATE',
    entity_type: 'clinical_record',
    entity_id: consultationId,
    new_value: {
      pet_id: petId,
      queue_id: queueId,
      payment_reference: paymentReference,
      payment_id: paymentId,
      total_amount: formatCents(totalCents),
    },
    description: `Consultation record added for "${pet?.name || petId}" on ${consultationDate}`,
  }).catch((error) => console.warn('Consultation audit log failed:', error.message));
}

module.exports = { getMyClinicalRecords, getAllClinicalRecords, addClinicalRecord };
