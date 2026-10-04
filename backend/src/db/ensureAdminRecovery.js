const db = require("../config/db");

/**
 * Idempotent startup migration for offline admin password recovery.
 *
 * Creates the `admin_recovery_keys` table if it is missing (harmless to run
 * every boot). Each row holds the bcrypt hash of one single-use recovery key
 * for an admin; the plaintext is shown once at generation and never stored.
 */
async function ensureAdminRecoveryKeys() {
  try {
    if (db.dialect === "postgres") {
      await db.query(
        `CREATE TABLE IF NOT EXISTS admin_recovery_keys (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          key_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          used_at TIMESTAMP NULL DEFAULT NULL
        )`
      );
    } else if (db.dialect === "mysql") {
      await db.query(
        `CREATE TABLE IF NOT EXISTS admin_recovery_keys (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          key_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          used_at TIMESTAMP NULL DEFAULT NULL
        )`
      );
    } else {
      console.warn("[migrate] unknown dialect; skipping admin_recovery_keys check");
      return false;
    }
    return true;
  } catch (error) {
    console.error("[migrate] admin_recovery_keys check failed:", error.message);
    return false;
  }
}

module.exports = { ensureAdminRecoveryKeys };
