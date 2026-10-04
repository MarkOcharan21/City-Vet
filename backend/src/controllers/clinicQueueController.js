const crypto = require('crypto');
const db = require('../config/db');
const { notifyUsersByRoles } = require('../services/notificationService');
const { logAudit } = require('../middleware/auditMiddleware');
const queueLock = require('../services/clinicQueueLock');

const ACTIVE_STATUSES = ['Waiting', 'In Consultation'];
const VALID_STATUSES = ['Waiting', 'In Consultation', 'Completed', 'Cancelled'];

const QUEUE_SELECT = `
   SELECT q.id,
          q.pet_id,
          q.batch_id,
          q.status,
         q.notes,
         q.checked_in_by,
         q.veterinarian_id,
         q.checked_in_at,
         q.started_at,
         q.completed_at,
         q.created_at,
         p.name AS pet_name,
         p.pet_code,
         p.photo AS pet_photo,
         p.status AS pet_status,
         po.full_name AS owner_name,
         po.barangay,
         po.contact_number,
         COALESCE(check_in_user.full_name, check_in_user.email) AS checked_in_by_name,
         COALESCE(vet_user.full_name, vet_user.email) AS veterinarian_name
  FROM clinic_queue q
  JOIN pets p ON q.pet_id = p.id
  JOIN pet_owners po ON p.pet_owner_id = po.id
  LEFT JOIN users check_in_user ON q.checked_in_by = check_in_user.id
  LEFT JOIN users vet_user ON q.veterinarian_id = vet_user.id
`;

function getStatusError(status) {
  return VALID_STATUSES.includes(status)
    ? null
    : 'Status must be Waiting, In Consultation, Completed, or Cancelled.';
}

async function getEntry(id) {
  const [rows] = await db.query(`${QUEUE_SELECT} WHERE q.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

const BATCH_SELECT = `
  SELECT b.id,
         b.batch_token,
         b.created_by,
         b.status,
         b.created_at,
         b.updated_at,
         COALESCE(creator.full_name, creator.email) AS created_by_name,
         (SELECT COUNT(*) FROM clinic_queue bq WHERE bq.batch_id = b.id) AS item_count,
         (SELECT COUNT(*) FROM clinic_queue bq WHERE bq.batch_id = b.id AND bq.status = 'Waiting') AS waiting_count,
         (SELECT COUNT(*) FROM clinic_queue bq WHERE bq.batch_id = b.id AND bq.status = 'In Consultation') AS in_consultation_count
  FROM consultation_batches b
  LEFT JOIN users creator ON b.created_by = creator.id
`;

const BATCH_LOCK_SELECT = `
  SELECT b.id,
         b.batch_token,
         b.created_by,
         b.status,
         b.created_at,
         b.updated_at
  FROM consultation_batches b
`;

function getBatchIdentifier(value) {
  const raw = String(value || '').trim();
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

async function findBatch(value, connection = db) {
  const identifier = getBatchIdentifier(value);
  const [rows] = await connection.query(
    `${BATCH_SELECT} WHERE b.id = ? OR b.batch_token = ? LIMIT 1`,
    [identifier, String(value)],
  );
  return rows[0] || null;
}

async function getBatchPayload(batchId, connection = db) {
  const batch = await findBatch(batchId, connection);
  if (!batch) return null;
  const [items] = await connection.query(
    `${QUEUE_SELECT}
     WHERE q.batch_id = ?
     ORDER BY CASE q.status
       WHEN 'In Consultation' THEN 1
       WHEN 'Waiting' THEN 2
       WHEN 'Completed' THEN 3
       ELSE 4
     END, q.id ASC`,
    [batch.id],
  );
  return { ...batch, items, entries: items };
}

function parsePetIds(body) {
  const source = body.items ?? body.pets ?? body.pet_ids;
  const values = Array.isArray(source) ? source : source == null ? [] : [source];
  const ids = values.map((item) => {
    if (item && typeof item === 'object') return item.pet_id ?? item.petId ?? item.id;
    return item;
  });
  return [...new Set(ids.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];
}

function createBatchToken() {
  return `batch_${Date.now()}_${crypto.randomBytes(12).toString('hex')}`;
}

async function createBatch(req, res) {
  const suppliedToken = String(req.body?.batch_token || req.body?.token || '').trim();
  const batchToken = suppliedToken || createBatchToken();

  if (batchToken.length > 100) {
    return res.status(400).json({ success: false, message: 'Batch token must be 100 characters or fewer.' });
  }
  if (!Number.isInteger(Number(req.user.id))) {
    return res.status(401).json({ success: false, message: 'Authentication is required.' });
  }

  try {
    await db.query(
      `INSERT INTO consultation_batches (batch_token, created_by, status)
       VALUES (?, ?, 'Active')`,
      [batchToken, req.user.id],
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_ENTRY') {
      return res.status(500).json({ success: false, message: 'Could not create the consultation batch.', error: error.message });
    }
    const existing = await findBatch(batchToken);
    if (!existing) {
      return res.status(409).json({ success: false, message: 'The batch token is already in use.' });
    }
    return res.json({ success: true, message: 'Consultation batch already exists.', batch: await getBatchPayload(existing.id) });
  }

  const batch = await getBatchPayload(batchToken);
  res.status(201).json({ success: true, message: 'Consultation batch created.', batch });

  logAudit(req, {
    action: 'CREATE',
    entity_type: 'consultation_batch',
    entity_id: batch.id,
    new_value: { batch_token: batch.batch_token },
    description: `Consultation batch "${batch.batch_token}" created`,
  }).catch((error) => console.warn('Batch audit log failed:', error.message));
}

async function listBatches(req, res) {
  const status = String(req.query.status || '').trim();
  const validStatuses = ['Active', 'Completed', 'Cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid batch status.' });
  }
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '50', 10) || 50, 1), 200);
  const offset = Math.max(Number.parseInt(req.query.offset || '0', 10) || 0, 0);
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('b.status = ?');
    params.push(status);
  }

  try {
    const [batches] = await db.query(
      `${BATCH_SELECT}
       ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
       ORDER BY b.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    res.json({ success: true, batches });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load consultation batches.', error: error.message });
  }
}

async function getBatch(req, res) {
  try {
    const batch = await getBatchPayload(req.params.batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Consultation batch not found.' });
    res.json({ success: true, batch });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load the consultation batch.', error: error.message });
  }
}

async function addBatchItems(req, res) {
  const petIds = parsePetIds(req.body || {});
  if (petIds.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one valid pet is required.' });
  }

  let connection;
  let lockAcquired = false;
  let transactionStarted = false;
  let batch;
  let addedQueueIds = [];

  try {
    connection = await db.getConnection();
    lockAcquired = await queueLock.acquire(connection);
    if (!lockAcquired) {
      return res.status(503).json({ success: false, message: 'Another queue update is in progress. Please try again.' });
    }

    await connection.beginTransaction();
    transactionStarted = true;
    const identifier = getBatchIdentifier(req.params.batchId);
    const [batchRows] = await connection.query(
      `${BATCH_LOCK_SELECT} WHERE b.id = ? OR b.batch_token = ? LIMIT 1 FOR UPDATE`,
      [identifier, String(req.params.batchId)],
    );
    batch = batchRows[0] || null;
    if (!batch) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ success: false, message: 'Consultation batch not found.' });
    }
    if (batch.status !== 'Active') {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({ success: false, message: 'Only active consultation batches can receive patients.' });
    }

    const placeholders = petIds.map(() => '?').join(', ');
    const [pets] = await connection.query(
      `SELECT p.id, p.name, p.pet_code, p.status
       FROM pets p
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE p.id IN (${placeholders})
       FOR UPDATE`,
      petIds,
    );
    if (pets.length !== petIds.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ success: false, message: 'One or more pets were not found.' });
    }
    const unverifiedPet = pets.find((pet) => pet.status !== 'Verified');
    if (unverifiedPet) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({ success: false, message: `${unverifiedPet.name} is not yet verified. Only verified pets can be added to the consultation batch.` });
    }

    const [existingRows] = await connection.query(
      `SELECT id, pet_id, batch_id, status
       FROM clinic_queue
       WHERE pet_id IN (${placeholders})
         AND (batch_id = ? OR status IN ('Waiting', 'In Consultation'))
       FOR UPDATE`,
      [...petIds, batch.id],
    );
    const existingByPet = new Map();
    for (const row of existingRows) {
      const key = Number(row.pet_id);
      const rows = existingByPet.get(key) || [];
      rows.push(row);
      existingByPet.set(key, rows);
    }

    for (const petId of petIds) {
      const rows = existingByPet.get(petId) || [];
      const activeElsewhere = rows.find(
        (row) => ['Waiting', 'In Consultation'].includes(row.status) && Number(row.batch_id) !== Number(batch.id),
      );
      if (activeElsewhere) {
        throw Object.assign(new Error('A selected pet is already in the active queue.'), {
          statusCode: 409,
          queueId: activeElsewhere.id,
          petId,
        });
      }
      const sameBatch = rows.find((row) => Number(row.batch_id) === Number(batch.id));
      if (sameBatch) {
        addedQueueIds.push(sameBatch.id);
        continue;
      }
      if (rows[0] && ['Waiting', 'In Consultation'].includes(rows[0].status)) {
        throw Object.assign(new Error('A selected pet is already in the active queue.'), {
          statusCode: 409,
          queueId: rows[0].id,
          petId,
        });
      }

      const veterinarianId = req.user.role === 'Veterinarian' ? req.user.id : null;
      const [insertResult] = await connection.query(
        `INSERT INTO clinic_queue (pet_id, batch_id, notes, checked_in_by, veterinarian_id)
         VALUES (?, ?, ?, ?, ?)`,
        [petId, batch.id, String(req.body?.notes || '').trim().slice(0, 500) || null, req.user.id, veterinarianId],
      );
      addedQueueIds.push(insertResult.insertId);
    }

    await connection.commit();
    transactionStarted = false;
    const payload = await getBatchPayload(batch.id);
    res.status(201).json({
      success: true,
      message: 'Patients added to the consultation batch.',
      batch: payload,
      queueIds: addedQueueIds,
    });

    notifyUsersByRoles(
      ['Veterinarian'],
      'Consultation Batch Updated',
      `${addedQueueIds.length} patient(s) were added to batch ${batch.batch_token}.`,
      'ClinicQueue',
      'queue',
      true,
    ).catch((error) => console.warn('Batch notification failed:', error.message));
    logAudit(req, {
      action: 'CREATE',
      entity_type: 'consultation_batch',
      entity_id: batch.id,
      new_value: { pet_ids: petIds },
      description: `Patients added to consultation batch "${batch.batch_token}"`,
    }).catch((error) => console.warn('Batch audit log failed:', error.message));
  } catch (error) {
    if (transactionStarted && connection) await connection.rollback().catch(() => {});
    if (!res.headersSent) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode ? error.message : 'Could not add patients to the consultation batch.',
        queueId: error.queueId,
        error: error.statusCode ? undefined : error.message,
      });
    }
  } finally {
    if (connection) {
      if (lockAcquired) await queueLock.release(connection);
      connection.release();
    }
  }
}

async function removeBatchItem(req, res) {
  const queueId = Number(req.params.queueId);
  if (!Number.isInteger(queueId) || queueId < 1) {
    return res.status(400).json({ success: false, message: 'A valid queue entry is required.' });
  }

  let connection;
  let lockAcquired = false;
  let transactionStarted = false;
  let batch;
  let removedItem;

  try {
    connection = await db.getConnection();
    lockAcquired = await queueLock.acquire(connection);
    if (!lockAcquired) {
      return res.status(503).json({ success: false, message: 'Another queue update is in progress. Please try again.' });
    }
    await connection.beginTransaction();
    transactionStarted = true;

    const identifier = getBatchIdentifier(req.params.batchId);
    const [batchRows] = await connection.query(
      `${BATCH_LOCK_SELECT} WHERE b.id = ? OR b.batch_token = ? LIMIT 1 FOR UPDATE`,
      [identifier, String(req.params.batchId)],
    );
    batch = batchRows[0] || null;
    if (!batch) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ success: false, message: 'Consultation batch not found.' });
    }

    const [entryRows] = await connection.query(
      `SELECT id, pet_id, batch_id, status
       FROM clinic_queue
       WHERE id = ? AND batch_id = ?
       LIMIT 1
       FOR UPDATE`,
      [queueId, batch.id],
    );
    removedItem = entryRows[0] || null;
    if (!removedItem) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ success: false, message: 'Queue entry not found in this consultation batch.' });
    }
    if (removedItem.status !== 'Waiting') {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({ success: false, message: 'Only waiting patients can be removed from a consultation batch.' });
    }

    await connection.query('DELETE FROM clinic_queue WHERE id = ? AND batch_id = ? AND status = \'Waiting\'', [queueId, batch.id]);
    const [[remaining]] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM clinic_queue
       WHERE batch_id = ? AND status IN ('Waiting', 'In Consultation')`,
      [batch.id],
    );
    if (Number(remaining.count) === 0) {
      await connection.query('UPDATE consultation_batches SET status = \'Completed\' WHERE id = ?', [batch.id]);
    }
    await connection.commit();
    transactionStarted = false;
    const payload = await getBatchPayload(batch.id);
    res.json({ success: true, message: 'Patient removed from the consultation batch.', removedItemId: queueId, batch: payload });
    logAudit(req, {
      action: 'DELETE',
      entity_type: 'consultation_batch',
      entity_id: batch.id,
      old_value: removedItem,
      description: `Patient removed from consultation batch "${batch.batch_token}"`,
    }).catch((error) => console.warn('Batch audit log failed:', error.message));
  } catch (error) {
    if (transactionStarted && connection) await connection.rollback().catch(() => {});
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Could not remove the patient from the consultation batch.', error: error.message });
    }
  } finally {
    if (connection) {
      if (lockAcquired) await queueLock.release(connection);
      connection.release();
    }
  }
}

async function listEntries(req, res) {
  const requestedStatus = String(req.query.status || '').trim();
  if (requestedStatus && getStatusError(requestedStatus)) {
    return res.status(400).json({ success: false, message: getStatusError(requestedStatus) });
  }

  const conditions = [];
  const params = [];

  if (requestedStatus && ACTIVE_STATUSES.includes(requestedStatus)) {
    conditions.push('q.status = ?');
    params.push(requestedStatus);
  } else if (requestedStatus) {
    conditions.push('DATE(q.checked_in_at) = CURRENT_DATE');
    conditions.push('q.status = ?');
    params.push(requestedStatus);
  } else {
    conditions.push('(DATE(q.checked_in_at) = CURRENT_DATE OR q.status IN (?, ?))');
    params.push(...ACTIVE_STATUSES);
  }

  try {
    const [entries] = await db.query(
      `${QUEUE_SELECT}
       WHERE ${conditions.join(' AND ')}
       ORDER BY CASE q.status
         WHEN 'In Consultation' THEN 1
         WHEN 'Waiting' THEN 2
         WHEN 'Completed' THEN 3
         ELSE 4
       END, q.id ASC`,
      params,
    );
    res.json({ success: true, entries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load the clinic queue.', error: error.message });
  }
}

async function createEntry(req, res) {
  const petId = Number(req.body.pet_id);
  const notes = String(req.body.notes || '').trim().slice(0, 500) || null;

  if (!Number.isInteger(petId) || petId < 1) {
    return res.status(400).json({ success: false, message: 'A valid pet is required.' });
  }

  let connection;
  let lockAcquired = false;
  try {
    connection = await db.getConnection();
    lockAcquired = await queueLock.acquire(connection);
    if (!lockAcquired) {
      return res.status(503).json({ success: false, message: 'Another queue update is in progress. Please try again.' });
    }
    await connection.beginTransaction();

    const [[pet]] = await connection.query(
      `SELECT p.id, p.name, p.pet_code, p.status, po.full_name AS owner_name
       FROM pets p
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE p.id = ?
       FOR UPDATE`,
      [petId],
    );

    if (!pet) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Pet not found.' });
    }

    if (pet.status !== 'Verified') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: `${pet.name} is not yet verified. Only verified pets can be added to the clinic queue.` });
    }

    const [[activeEntry]] = await connection.query(
      `SELECT id
       FROM clinic_queue
       WHERE pet_id = ? AND status IN ('Waiting', 'In Consultation')
       LIMIT 1
       FOR UPDATE`,
      [petId],
    );

    if (activeEntry) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: `${pet.name} is already in the active queue.`,
        queueId: activeEntry.id,
      });
    }

    const [result] = await connection.query(
      `INSERT INTO clinic_queue (pet_id, notes, checked_in_by)
       VALUES (?, ?, ?)`,
      [petId, notes, req.user.id],
    );
    await connection.commit();

    const entry = await getEntry(result.insertId);
    res.status(201).json({
      success: true,
      message: `${pet.name} added to the walk-in queue.`,
      entry,
    });

    notifyUsersByRoles(
      ['Veterinarian'],
      'New Walk-in Patient',
      `${pet.name} (${pet.pet_code}) was checked in by ${req.user.full_name || req.user.email || 'clinic staff'}.`,
      'ClinicQueue',
      'queue',
      true,
    ).catch((error) => console.warn('Queue notification failed:', error.message));

    logAudit(req, {
      action: 'CREATE',
      entity_type: 'clinic_queue',
      entity_id: result.insertId,
      new_value: { pet_id: petId, notes },
      description: `Walk-in queue entry created for "${pet.name}"`,
    }).catch((error) => console.warn('Queue audit log failed:', error.message));
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    res.status(500).json({ success: false, message: 'Could not add the pet to the queue.', error: error.message });
  } finally {
    if (connection) {
      if (lockAcquired) await queueLock.release(connection);
      connection.release();
    }
  }
}

async function updateStatus(req, res) {
  const entryId = Number(req.params.id);
  const nextStatus = String(req.body.status || '').trim();
  const statusError = getStatusError(nextStatus);

  if (!Number.isInteger(entryId) || entryId < 1) {
    return res.status(400).json({ success: false, message: 'A valid queue entry is required.' });
  }
  if (statusError) {
    return res.status(400).json({ success: false, message: statusError });
  }

  const isStaff = req.user.role === 'Staff';
  const isVeterinarian = req.user.role === 'Veterinarian';
  const isAdmin = req.user.role === 'Admin';

  if (!isStaff && !isVeterinarian && !isAdmin) {
    return res.status(403).json({ success: false, message: 'You do not have permission to update the queue.' });
  }
  if (isStaff && nextStatus !== 'Cancelled') {
    return res.status(403).json({ success: false, message: 'Staff can only cancel a queue entry.' });
  }

  let connection;
  let lockAcquired = false;
  let transactionStarted = false;
  let current;
  let updated;

  try {
    connection = await db.getConnection();
    lockAcquired = await queueLock.acquire(connection);

    if (!lockAcquired) {
      return res.status(503).json({
        success: false,
        message: 'Another queue update is in progress. Please try again.',
      });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    const [currentRows] = await connection.query(
      `${QUEUE_SELECT} WHERE q.id = ? LIMIT 1 FOR UPDATE OF q`,
      [entryId],
    );
    current = currentRows[0] || null;

    if (!current) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ success: false, message: 'Queue entry not found.' });
    }

    if (current.status === nextStatus) {
      await connection.rollback();
      transactionStarted = false;
      return res.json({ success: true, message: 'Queue status is already up to date.', entry: current });
    }

    if (nextStatus === 'In Consultation' && current.pet_status !== 'Verified') {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        success: false,
        message: `${current.pet_name} is not yet verified. Only verified pets can be consulted.`,
      });
    }

    if (nextStatus === 'Completed') {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        success: false,
        message: 'Save the consultation record to complete the queue entry.',
      });
    }
    if (nextStatus === 'Waiting' && current.status !== 'Waiting') {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        success: false,
        message: 'A queue entry cannot be returned to waiting after the visit has started.',
      });
    }
    if (nextStatus === 'In Consultation' && current.status !== 'Waiting') {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        success: false,
        message: 'Only a waiting patient can start a consultation.',
      });
    }
    if (nextStatus === 'Cancelled' && ['Completed', 'Cancelled'].includes(current.status)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        success: false,
        message: 'A completed or cancelled entry cannot be cancelled again.',
      });
    }

    const assignedToAnotherVeterinarian =
      isVeterinarian &&
      current.veterinarian_id != null &&
      Number(current.veterinarian_id) !== Number(req.user.id);

    if (assignedToAnotherVeterinarian && ['In Consultation', 'Cancelled'].includes(nextStatus)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        success: false,
        message: 'This queue entry is assigned to another veterinarian.',
      });
    }

    if (nextStatus === 'In Consultation') {
      const [activeRows] = await connection.query(
        `SELECT id, pet_id
         FROM clinic_queue
         WHERE status = 'In Consultation' AND id <> ?
         LIMIT 1
         FOR UPDATE`,
        [entryId],
      );
      const activeConsultation = activeRows[0];
      if (activeConsultation) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(409).json({
          success: false,
          message: 'Another patient is currently in consultation.',
          queueId: activeConsultation.id,
        });
      }
    }

    const veterinarianId =
      nextStatus === 'In Consultation' && isVeterinarian
        ? req.user.id
        : current.veterinarian_id;

    const [updateResult] = await connection.query(
      `UPDATE clinic_queue
       SET status = ?,
           veterinarian_id = ?,
           started_at = CASE
             WHEN ? = 'In Consultation' AND started_at IS NULL THEN CURRENT_TIMESTAMP
             ELSE started_at
           END,
           completed_at = CASE
             WHEN ? = 'Completed' THEN CURRENT_TIMESTAMP
             ELSE completed_at
           END
       WHERE id = ? AND status = ?`,
      [nextStatus, veterinarianId, nextStatus, nextStatus, entryId, current.status],
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        success: false,
        message: 'This queue entry changed while you were updating it. Please refresh and try again.',
      });
    }

    if (nextStatus === 'Cancelled' && current.batch_id) {
      const [[remaining]] = await connection.query(
        `SELECT COUNT(*) AS count
         FROM clinic_queue
         WHERE batch_id = ? AND status IN ('Waiting', 'In Consultation')`,
        [current.batch_id],
      );
      if (Number(remaining.count) === 0) {
        await connection.query(
          `UPDATE consultation_batches SET status = 'Completed' WHERE id = ? AND status = 'Active'`,
          [current.batch_id],
        );
      }
    }

    const [updatedRows] = await connection.query(
      `${QUEUE_SELECT} WHERE q.id = ? LIMIT 1`,
      [entryId],
    );
    updated = updatedRows[0] || null;
    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted && connection) {
      await connection.rollback().catch(() => {});
    }
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Could not update the queue entry.',
        error: error.message,
      });
    }
    return;
  } finally {
    if (connection) {
      if (lockAcquired) await queueLock.release(connection);
      connection.release();
    }
  }

  if (!updated) {
    return res.status(500).json({ success: false, message: 'The queue entry could not be reloaded after the update.' });
  }

  res.json({
    success: true,
    message: `${updated.pet_name} is now ${nextStatus.toLowerCase()}.`,
    entry: updated,
  });

  notifyUsersByRoles(
    isStaff ? ['Veterinarian'] : ['Staff'],
    'Queue Status Updated',
    `${updated.pet_name} (${updated.pet_code}) is now ${nextStatus.toLowerCase()}.`,
    'ClinicQueue',
    'queue',
    true,
  ).catch((error) => console.warn('Queue notification failed:', error.message));

  try {
    await logAudit(req, {
      action: 'UPDATE',
      entity_type: 'clinic_queue',
      entity_id: entryId,
      old_value: { status: current.status },
      new_value: { status: nextStatus },
      description: `Queue entry for "${updated.pet_name}" changed to ${nextStatus}`,
    });
  } catch (error) {
    console.warn('Queue audit log failed:', error.message);
  }
}

module.exports = {
  listEntries,
  createEntry,
  updateStatus,
  createBatch,
  listBatches,
  getBatch,
  addBatchItems,
  removeBatchItem,
};
