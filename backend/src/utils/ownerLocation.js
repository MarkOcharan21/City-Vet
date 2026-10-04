'use strict';

/**
 * Owner location persistence helpers.
 *
 * The existing `owner_locations` table (pet_owner_id, latitude, longitude,
 * accuracy_meters, status, recorded_at) is now read by the Traceability map.
 * These helpers make one owner's LATEST active row the canonical pin: writing a
 * new location deactivates the previous ones, mirrored by the map reading only
 * `status = 'active' ORDER BY recorded_at DESC LIMIT 1`.
 */
const db = require('../config/db');
const { geocode, buildSearchAddress } = require('./geocode');

async function getLatestOwnerLocation(ownerId) {
  if (!ownerId) return null;
  const [rows] = await db.query(
    `SELECT id, latitude, longitude, accuracy_meters, source, recorded_at
     FROM owner_locations
     WHERE pet_owner_id = ? AND status = 'active'
     ORDER BY recorded_at DESC, id DESC
     LIMIT 1`,
    [ownerId],
  );
  return rows[0] || null;
}

async function recordOwnerLocation(
  ownerId,
  { latitude, longitude, accuracy_meters = null, source = 'seed', query_address = null },
) {
  if (!ownerId || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return null;
  await db.query('UPDATE owner_locations SET status = ? WHERE pet_owner_id = ?', ['inactive', ownerId]);
  const [res] = await db.query(
    `INSERT INTO owner_locations (pet_owner_id, latitude, longitude, accuracy_meters, source, query_address, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    [ownerId, Number(latitude), Number(longitude), accuracy_meters, source, query_address || null],
  );
  return res.insertId || null;
}

/**
 * Decides the best location for an owner and stores it:
 *   - explicit GPS coordinates win (exact household point),
 *   - otherwise the structured address is geocoded (street/subdivision level),
 *   - otherwise nothing is written and the existing coordinate (if any) stays.
 * Never throws: geocoding failures are swallowed so registration/profile saves
 * never fail because the map could not resolve an address.
 */
async function syncOwnerLocation(ownerId, ownerData, gps) {
  if (!ownerId) return null;
  ownerData = { address: '', barangay: '', subdivision: '', block: '', lot: '', ...(ownerData || {}) };

  if (gps && gps.latitude && gps.longitude) {
    const lat = Number(gps.latitude);
    const lon = Number(gps.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return recordOwnerLocation(ownerId, {
        latitude: lat,
        longitude: lon,
        accuracy_meters: gps.accuracy_meters == null ? null : Number(gps.accuracy_meters),
        source: 'gps',
      });
    }
  }

  try {
    const queryText = buildSearchAddress(ownerData);
    if (!queryText) return null;
    const geo = await geocode(queryText);
    if (!geo) return null;
    return recordOwnerLocation(ownerId, {
      latitude: geo.lat,
      longitude: geo.lon,
      source: 'geocode',
      query_address: queryText,
    });
  } catch (e) {
    console.log(`[ownerLocation] sync skipped for owner #${ownerId}: ${e && e.message ? e.message : e}`);
    return null;
  }
}

module.exports = { getLatestOwnerLocation, recordOwnerLocation, syncOwnerLocation };