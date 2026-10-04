'use strict';

/**
 * One-off backfill: geocode every existing pet owner's registered address and
 * store the resolved coordinate as their latest active owner_location
 * (source = 'geocode'), so the Traceability map stops collapsing residents onto
 * barangay centroids.
 *
 * Owners already holding a GPS or geocoded pin are skipped (resumable). Runs at
 * Nominatim's polite pace — roughly 1.25s per NEW geocode plus a DB write per
 * owner — so ~700 owners take about 15 minutes. Safe to interrupt and re-run.
 *
 *   node scripts/geocodeExistingOwners.js [limit]
 */
const db = require('../src/config/db');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { getLatestOwnerLocation, syncOwnerLocation } = require('../src/utils/ownerLocation');

const LIMIT = Number(process.argv[2]) || null; // optional dev/test cap

// Persist processed owner ids in the OS temp dir so an interrupted run resumes
// without re-evaluating owners that already produced no result.
const PROGRESS_FILE = path.join(os.tmpdir(), 'cityvet-geocode-progress.json');

function loadProgress() {
  try {
    return new Set(JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')));
  } catch (e) {
    return new Set();
  }
}

function saveProgress(set) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...set]));
  } catch (e) {
    console.log('  (could not persist progress):', e.message);
  }
}

async function main() {
  const processed = loadProgress();
  if (LIMIT) console.log(`Backfill started (capped at ${LIMIT} owners).`);
  else console.log(`Backfill started (all owners). ${processed.size} already evaluated; removing progress file after a clean run.`);

  const [owners] = await db.query(
    `SELECT id, address, barangay, subdivision, block, lot
     FROM pet_owners
     WHERE (address IS NOT NULL AND TRIM(address) <> '')
        OR (barangay IS NOT NULL AND TRIM(barangay) <> '')
     ORDER BY id ASC`,
  );

  const rows = LIMIT ? owners.slice(0, LIMIT) : owners;
  const pending = rows.filter((o) => !processed.has(o.id));
  console.log(`Owners to evaluate: ${pending.length} (${rows.length} have an address or barangay)`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += 1) {
    const owner = pending[i];
    const current = await getLatestOwnerLocation(owner.id);
    if (current && (current.source === 'geocode' || current.source === 'gps')) {
      skipped += 1;
      processed.add(owner.id);
      if ((i + 1) % 25 === 0) { saveProgress(processed); console.log(`  ...${i + 1}/${pending.length} pending evaluated (skipped ${skipped}, updated ${updated})`); }
      continue;
    }

    const result = await syncOwnerLocation(owner.id, owner, null);
    processed.add(owner.id);
    if (result) updated += 1;
    else failed += 1;

    if ((i + 1) % 25 === 0) {
      saveProgress(processed);
      console.log(`  ...${i + 1}/${pending.length} pending evaluated (updated ${updated}, skipped ${skipped}, no result ${failed})`);
    }
  }

  saveProgress(processed);
  try { fs.unlinkSync(PROGRESS_FILE); } catch (e) { /* ignore */ }
  console.log(`Done. Updated ${updated}, already-located ${skipped}, unresolved ${failed}.`);
  await db.end();
}

main().catch(async (err) => {
  console.error('Backfill failed:', err && err.message ? err.message : err);
  try { await db.end(); } catch (e) { /* ignore */ }
  process.exit(1);
});