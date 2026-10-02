const db = require("../config/db");

const VALUES = ["Consultation", "Vaccination", "Medicine", "Outreach"];
const VALUES_SQL = VALUES.map((v) => `'${v}'`).join(", ");

/**
 * Idempotent startup migration.
 *
 * The "Outreach" payment type is written by verifyTransaction() into
 * payment_monitoring.payment_type, but the live database may still carry an
 * older constraint/enum without it, which makes that INSERT fail and rolls the
 * whole verification back. This runs once at boot (harmless to run every boot)
 * and adds the value on both engines:
 *   - PostgreSQL: CHECK constraint   -> drop + re-add with all four values
 *   - MySQL:      ENUM(...)          -> MODIFY column with all four values
 */
async function ensurePaymentTypeOutreach() {
  try {
    if (db.dialect === "postgres") return await ensurePostgres();
    if (db.dialect === "mysql") return await ensureMysql();
    console.warn("[migrate] unknown dialect; skipping payment_type check");
    return false;
  } catch (error) {
    console.error("[migrate] payment_type check failed:", error.message);
    return false;
  }
}

async function ensurePostgres() {
  const [rows] = await db.query(
    `SELECT c.conname, pg_get_constraintdef(c.oid) AS def
     FROM pg_catalog.pg_constraint c
     JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
     JOIN pg_catalog.pg_namespace n ON n.oid = c.connamespace
     WHERE t.relname = 'payment_monitoring'
       AND n.nspname = 'public'
       AND c.contype = 'c'`
  );

  const constraints = rows || [];
  const hasAll = constraints.some((r) => (
    r.def && r.def.includes("payment_type") && VALUES.every((v) => r.def.includes(v))
  ));
  if (hasAll) return true;

  const check = constraints.find((r) => r.def && r.def.includes("payment_type"));
  if (check && check.conname) {
    await db.query(`ALTER TABLE payment_monitoring DROP CONSTRAINT "${check.conname}"`);
  }
  await db.query(
    `ALTER TABLE payment_monitoring
     ADD CONSTRAINT payment_monitoring_payment_type_check
     CHECK ("payment_type" IS NULL OR "payment_type" IN (${VALUES_SQL}))`
  );
  console.log("[migrate] payment_monitoring.payment_type now allows 'Outreach' (postgres)");
  return true;
}

async function ensureMysql() {
  const [rows] = await db.query(
    `SELECT COLUMN_TYPE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_monitoring' AND COLUMN_NAME = 'payment_type'`
  );
  const columnType = (rows && rows[0] && rows[0].COLUMN_TYPE) || "";
  if (columnType.includes("Outreach")) return true;

  await db.query(
    `ALTER TABLE payment_monitoring MODIFY payment_type ENUM(${VALUES_SQL}) DEFAULT NULL`
  );
  console.log("[migrate] payment_monitoring.payment_type now allows 'Outreach' (mysql)");
  return true;
}

module.exports = { ensurePaymentTypeOutreach };