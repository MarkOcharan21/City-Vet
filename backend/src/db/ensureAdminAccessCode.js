const db = require("../config/db");

/**
 * Idempotent startup migration for the admin access code (login PIN).
 *
 * Adds `users.access_code_hash` when missing (harmless to run every boot).
 * Only Admin accounts use it: after the password step, admins must also enter
 * their personal 6-digit code before a session token is issued.
 */
async function ensureAdminAccessCode() {
  try {
    if (db.dialect === "postgres") {
      await db.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS access_code_hash VARCHAR(255)"
      );
    } else if (db.dialect === "mysql") {
      await db.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS access_code_hash VARCHAR(255)"
      );
    } else {
      console.warn("[migrate] unknown dialect; skipping access_code_hash check");
      return false;
    }
    return true;
  } catch (error) {
    console.error("[migrate] access_code_hash check failed:", error.message);
    return false;
  }
}

module.exports = { ensureAdminAccessCode };
