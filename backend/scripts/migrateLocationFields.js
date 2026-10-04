'use strict';

/**
 * One-off, idempotent migration adding structured address fields to pet_owners
 * and geocoding metadata to owner_locations. Runs against whatever DATABASE_URL
 * is configured (PostgreSQL or MySQL) and is safe to re-run.
 *
 *   node scripts/migrateLocationFields.js
 */
const db = require('../src/config/db');

const PG = db.dialect === 'postgres';

async function columnExists(table, column) {
  if (PG) {
    const [rows] = await db.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = ? AND column_name = ?`,
      [table, column],
    );
    return rows.length > 0;
  }
  const [rows] = await db.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column],
  );
  return rows.length > 0;
}

async function constraintExists(name) {
  if (!PG) return true;
  const [rows] = await db.query(
    `SELECT 1 FROM pg_constraint c
     JOIN pg_class t ON c.conrelid = t.oid
     WHERE t.relname = 'owner_locations' AND c.conname = ?`,
    [name],
  );
  return rows.length > 0;
}

async function addColumn(table, column, ddl) {
  if (await columnExists(table, column)) {
    console.log(`  [skip] ${table}.${column} already exists`);
    return;
  }
  console.log(`  [add]  ${table}.${column}`);
  await db.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

async function main() {
  console.log(`Dialect: ${PG ? 'postgresql' : 'mysql'}`);

  console.log('pet_owners:');
  await addColumn('pet_owners', 'subdivision', PG ? `"subdivision" varchar(150) COLLATE "ci"` : 'subdivision varchar(150) DEFAULT NULL');
  await addColumn('pet_owners', 'block', PG ? `"block" varchar(20) COLLATE "ci"` : 'block varchar(20) DEFAULT NULL');
  await addColumn('pet_owners', 'lot', PG ? `"lot" varchar(20) COLLATE "ci"` : 'lot varchar(20) DEFAULT NULL');

  console.log('owner_locations:');
  await addColumn('owner_locations', 'source', PG ? `"source" text COLLATE "ci" NOT NULL DEFAULT 'seed'` : "source enum('seed','gps','geocode') NOT NULL DEFAULT 'seed'");
  await addColumn('owner_locations', 'query_address', PG ? `"query_address" varchar(500) COLLATE "ci"` : 'query_address varchar(500) DEFAULT NULL');

  if (PG && !(await constraintExists('owner_locations_source_check'))) {
    console.log('  [add]  check constraint owner_locations_source_check');
    await db.query(
      `ALTER TABLE "owner_locations" ADD CONSTRAINT "owner_locations_source_check" CHECK ("source" IN ('seed', 'gps', 'geocode'))`,
    );
  } else if (PG) {
    console.log('  [skip] check constraint owner_locations_source_check already exists');
  }

  console.log('Done.');
  await db.end();
}

main().catch(async (err) => {
  console.error('Migration failed:', err && err.message ? err.message : err);
  try { await db.end(); } catch (e) { /* ignore */ }
  process.exit(1);
});