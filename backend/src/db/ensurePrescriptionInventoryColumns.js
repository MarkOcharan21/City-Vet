const db = require("../config/db");

/**
 * Adds prescription inventory fields missing from the original PostgreSQL
 * schema conversion. MySQL's canonical schema already includes these columns.
 */
async function ensurePrescriptionInventoryColumns() {
  if (db.dialect !== "postgres") return true;

  try {
    await db.query(
      "ALTER TABLE medicines ADD COLUMN IF NOT EXISTS expiry_date date"
    );
    await db.query(`
      ALTER TABLE prescription_items
        ADD COLUMN IF NOT EXISTS batch_number varchar(50),
        ADD COLUMN IF NOT EXISTS expiry_date date,
        ADD COLUMN IF NOT EXISTS dispensed_date date
    `);
    console.log("✅ Prescription inventory columns verified.");
    return true;
  } catch (error) {
    console.error(
      "❌ Failed to ensure prescription inventory columns:",
      error.message
    );
    return false;
  }
}

module.exports = { ensurePrescriptionInventoryColumns };
