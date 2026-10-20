const db = require("../config/db");

/**
 * Idempotent startup migration adding 'manual' to owner_locations.source.
 *
 * Owners can confirm a pin they placed by tapping/dragging the satellite map
 * (an exact, hand-placed point) as well as a device GPS fix. That provenance is
 * stored as source='manual'. The original constraint only allowed
 * ('seed','gps','geocode'), so this widens it on both engines:
 *   - PostgreSQL (Supabase, the live DB): drop + recreate the CHECK constraint
 *   - MySQL: widen the ENUM
 *
 * Mirrors ensureSubdivisionLots — the live PostgreSQL database has no separate
 * migration runner, so schema changes that must exist on every deploy live here.
 */
async function ensureOwnerLocationSource() {
  try {
    if (db.dialect === "postgres") {
      await db.query(
        `ALTER TABLE owner_locations DROP CONSTRAINT IF EXISTS owner_locations_source_check`
      );
      await db.query(
        `ALTER TABLE owner_locations
           ADD CONSTRAINT owner_locations_source_check
           CHECK (source IN ('seed','gps','geocode','manual'))`
      );
    } else {
      await db.query(
        `ALTER TABLE owner_locations
           MODIFY COLUMN source ENUM('seed','gps','geocode','manual') NOT NULL DEFAULT 'seed'`
      );
    }
    console.log("✅ owner_locations.source allows 'manual'.");
    return true;
  } catch (error) {
    console.warn("⚠️ Failed to ensure owner_locations.source values:", error.message);
    return false;
  }
}

module.exports = { ensureOwnerLocationSource };
