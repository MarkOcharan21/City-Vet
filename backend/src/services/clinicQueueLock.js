const LOCK_NAME = 'pet_vet_clinic_queue_consultation';
const LOCK_TIMEOUT_SECONDS = 5;

async function acquire(connection) {
  const [[row]] = await connection.query(
    'SELECT GET_LOCK(?, ?) AS acquired',
    [LOCK_NAME, LOCK_TIMEOUT_SECONDS],
  );
  return Number(row?.acquired) === 1;
}

async function release(connection) {
  if (!connection) return;
  await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => {});
}

module.exports = {
  acquire,
  release,
};
