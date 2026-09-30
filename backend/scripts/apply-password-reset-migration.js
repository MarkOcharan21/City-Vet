// Idempotent runner for add_password_reset_requests.sql — creates the
// password_reset_requests table and adds the reset hardening columns to users
// if they are missing. Safe to run repeatedly.
// Usage: node scripts/apply-password-reset-migration.js
require('dotenv').config();
const db = require('../src/config/db');

async function tableExists(table) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS c FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return rows[0].c > 0;
}

async function columnExists(table, column) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].c > 0;
}

(async () => {
  const table = 'password_reset_requests';

  if (!(await tableExists(table))) {
    await db.query(`CREATE TABLE password_reset_requests (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      email VARCHAR(255) NOT NULL,
      status ENUM('pending','approved','denied') NOT NULL DEFAULT 'pending',
      approved_by INT DEFAULT NULL,
      approved_at DATETIME DEFAULT NULL,
      denied_by INT DEFAULT NULL,
      denied_at DATETIME DEFAULT NULL,
      decline_reason VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_user (user_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);
    console.log('Created table password_reset_requests');
  } else {
    console.log('password_reset_requests already exists');
  }

  const columns = [
    { name: 'reset_code_sent_at', type: 'DATETIME NULL', after: 'reset_code_expiry' },
    { name: 'reset_code_attempts', type: 'INT NOT NULL DEFAULT 0', after: 'reset_code_sent_at' },
  ];
  for (const { name, type, after } of columns) {
    if (!(await columnExists('users', name))) {
      await db.query(`ALTER TABLE users ADD COLUMN \`${name}\` ${type} AFTER \`${after}\``);
      console.log(`Added users.${name}`);
    } else {
      console.log(`users.${name} already exists`);
    }
  }

  await db.query('SELECT 1');
  console.log('Migration complete.');
  process.exit(0);
})().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});