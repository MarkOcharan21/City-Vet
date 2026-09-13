const db = require('../src/config/db');

(async () => {
  await db.query('DELETE FROM draft_registrations WHERE id = 0');
  await db.query(
    'ALTER TABLE draft_registrations MODIFY id INT(11) NOT NULL AUTO_INCREMENT',
  );

  const [[{ maxId }]] = await db.query(
    'SELECT IFNULL(MAX(id), 0) AS maxId FROM draft_registrations',
  );
  await db.query(
    `ALTER TABLE draft_registrations AUTO_INCREMENT = ${Number(maxId) + 1}`,
  );

  const [result] = await db.query(
    `INSERT INTO draft_registrations (pet_owner_id, temp_reg_info, device_id, payload, sync_state)
     VALUES (2, '{}', 'test', '{}', 'Draft')`,
  );

  console.log('insertId:', result.insertId);
  await db.query('DELETE FROM draft_registrations WHERE id = ?', [result.insertId]);
  console.log('Draft fix verified');
  process.exit(0);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
