const db = require('../config/db');

const LOCK_NAME = 'pet_vet_clinic_queue_consultation';
const LOCK_TIMEOUT_SECONDS = 5;
const RETRY_MS = 100;

// pg advisory locks are keyed on a bigint. Must stay constant across restarts
// or two processes stop excluding each other.
const LOCK_KEY = '7316554209117334';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Acquires the cross-process consultation lock on the caller's connection.
 *
 * MySQL uses GET_LOCK(name, timeout). PostgreSQL has no equivalent, so this
 * polls pg_try_advisory_lock() until the same timeout elapses. The lock is
 * session-scoped, which is what we want: the caller holds this connection for
 * the whole request and unlocks it explicitly.
 *
 * @param {object} connection connection from db.getConnection()
 * @returns {Promise<boolean>} whether the lock was taken
 */
async function acquire(connection) {
  if (db.dialect === 'postgres') {
    const deadline = Date.now() + LOCK_TIMEOUT_SECONDS * 1000;
    for (;;) {
      const [[row]] = await connection.query('SELECT pg_try_advisory_lock($1) AS acquired', [
        LOCK_KEY,
      ]);
      if (Number(row?.acquired) === 1) return true;
      if (Date.now() >= deadline) return false;
      await sleep(RETRY_MS);
    }
  }

  const [[row]] = await connection.query('SELECT GET_LOCK(?, ?) AS acquired', [
    LOCK_NAME,
    LOCK_TIMEOUT_SECONDS,
  ]);
  return Number(row?.acquired) === 1;
}

/**
 * Releases the lock. Never throws: a failed unlock must not mask the original
 * error from the request handler.
 */
async function release(connection) {
  if (!connection) return;
  try {
    if (db.dialect === 'postgres') {
      await connection.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
    } else {
      await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]);
    }
  } catch (_) {
    /* the connection is about to go back to the pool, which also clears locks */
  }
}

module.exports = {
  LOCK_NAME,
  LOCK_KEY,
  LOCK_TIMEOUT_SECONDS,
  acquire,
  release,
};