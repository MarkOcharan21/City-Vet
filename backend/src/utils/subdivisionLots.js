'use strict';

/**
 * Exact block/lot coordinate registry (admin-imported block plans).
 *
 * OpenStreetMap has no Philippine parcel data, so the geocoder normally lays an
 * owner's Blk/Lot onto a deterministic grid centred on the subdivision. When an
 * admin imports the City's real block plan, this module resolves the exact
 * per-lot coordinate first, so the pin lands on the actual lot.
 *
 * The registry is keyed by the canonical subdivision name (see
 * resolveSubdivision) plus a normalized block/lot slot.
 */
const db = require('../config/db');
const { resolveSubdivision, normalizeSubdivision } = require('./cabuyaoSubdivisions');

/**
 * Canonical lookup key for a subdivision: the resolved canonical name when the
 * subdivision is one of the curated Cabuyao entries, otherwise a normalized
 * form of whatever the admin typed. Stable across import and lookup so both
 * halves agree.
 */
function subdivisionLotKey(name) {
  const canonical = resolveSubdivision(name);
  if (canonical) return canonical;
  const norm = normalizeSubdivision(name);
  return norm || String(name == null ? '' : name).trim();
}

/**
 * Normalizes a block or lot value to a comparable slot. Owners type "27",
 * "Blk 27", "27-A" or "Lot 4"; the plan may store any of those forms. A digit
 * run plus an optional letter suffix ("27a") is the stable middle ground.
 */
function normalizeSlot(value) {
  const s = String(value == null ? '' : value).toLowerCase().trim();
  if (!s) return '';
  const m = s.match(/(\d+)\s*[-–]?\s*([a-z])?/);
  if (m) return m[1] + (m[2] || '');
  return s.replace(/[^a-z0-9]/g, '');
}

/**
 * Returns { lat, lon } for an exact block/lot when the admin has imported it,
 * or null. Never throws: a missing table or DB hiccup must not break address
 * saving, so callers treat null as "fall back to the grid".
 */
async function lookupLot(subdivision, block, lot) {
  const key = subdivisionLotKey(subdivision);
  const b = normalizeSlot(block);
  const l = normalizeSlot(lot);
  if (!key || !b || !l) return null;
  try {
    const [rows] = await db.query(
      `SELECT latitude, longitude FROM subdivision_lots
       WHERE subdivision_key = ? AND block = ? AND lot = ?
       LIMIT 1`,
      [key, b, l],
    );
    const row = rows && rows[0];
    if (!row) return null;
    const lat = Number(row.latitude);
    const lon = Number(row.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch (error) {
    console.log(`[subdivisionLots] lookup skipped: ${error && error.message ? error.message : error}`);
    return null;
  }
}

module.exports = { subdivisionLotKey, normalizeSlot, lookupLot };
