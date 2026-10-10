'use strict';

/**
 * Server-side Nominatim geocoder for Cabuyao City addresses.
 *
 * The old client-side approach fired 5-6 requests back-to-back per page load,
 * busting Nominatim's usage policy (max 1 request/second, require a User-Agent)
 * so every lookup silently failed and pins collapsed onto barangay centroids.
 *
 * This module:
 *   - serialises requests with >= 1.25s spacing (fair to the public instance),
 *   - sends a proper User-Agent / Accept-Language,
 *   - caches results in an LRU so re-linking the same owner never re-queries,
 *   - rejects results outside from Cabuyao's known bounds so a lookalike
 *     "Cabuyao" elsewhere in the Philippines can never place a pin.
 */

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

const { barangayCoordinate, normalizeBarangay } = require('./cabuyaoBarangays');

// Cabuyao City rough bounding box (same as the frontend map's CABUYAO_BOUNDS).
const CABUYAO_LAT_MIN = 14.1500;
const CABUYAO_LAT_MAX = 14.3300;
const CABUYAO_LON_MIN = 121.0000;
const CABUYAO_LON_MAX = 121.2200;

const REQUEST_GAP_MS = 1250;
const CACHE_LIMIT = 500;

const cache = new Map();
let chain = Promise.resolve();
let lastCallAt = 0;

function throttle(fn) {
  const run = chain.then(async () => {
    const wait = REQUEST_GAP_MS - (Date.now() - lastCallAt);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallAt = Date.now();
    return fn();
  });
  chain = run.catch(() => {});
  return run;
}

function memoryKey(text) {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

function cacheGet(key) {
  if (!cache.has(key)) return undefined;
  const value = cache.get(key);
  cache.delete(key);
  cache.set(key, value); // refresh LRU recency
  return value;
}

function cacheSet(key, value) {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
}

function inBounds(lat, lon) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= CABUYAO_LAT_MIN &&
    lat <= CABUYAO_LAT_MAX &&
    lon >= CABUYAO_LON_MIN &&
    lon <= CABUYAO_LON_MAX
  );
}

// ---------------------------------------------------------------------------
// Block & lot positioning
//
// OpenStreetMap (and therefore Nominatim) has no block/lot parcel data for
// Philippine subdivisions, so a "Blk 5 Lot 10" query just degrades to the
// subdivision/barangay centroid — the pin never really followed the block or
// lot the owner typed. Instead we anchor on the geocoded subdivision/barangay
// and lay the household onto a deterministic grid: the LOT number walks along
// the street (east-west) and the BLOCK number steps between parallel streets
// (north-south). The same block/lot always lands on the same spot, so the pin
// visibly follows the block & lot fields rather than the free-text address.
// ---------------------------------------------------------------------------
const METERS_PER_DEG_LAT = 111320;
const LOT_STEP_METERS = 15;    // spacing between adjacent lots along a street
const BLOCK_STEP_METERS = 45;  // spacing between blocks (one street apart)
const MAX_GRID_STEPS = 60;     // clamp absurd block/lot numbers

function numericIndex(value) {
  const match = String(value == null ? '' : value).match(/\d+/);
  const n = match ? Number(match[0]) : 0;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n - 1, MAX_GRID_STEPS);
}

function clampToBounds(lat, lon) {
  return {
    lat: Math.min(Math.max(lat, CABUYAO_LAT_MIN), CABUYAO_LAT_MAX),
    lon: Math.min(Math.max(lon, CABUYAO_LON_MIN), CABUYAO_LON_MAX),
  };
}

function applyBlockLotGrid(anchor, block, lot) {
  const blockSteps = numericIndex(block);
  const lotSteps = numericIndex(lot);
  if (!blockSteps && !lotSteps) return anchor;
  const cosLat = Math.cos((anchor.lat * Math.PI) / 180) || 1;
  const dLat = (blockSteps * BLOCK_STEP_METERS) / METERS_PER_DEG_LAT;
  const dLon = (lotSteps * LOT_STEP_METERS) / (METERS_PER_DEG_LAT * cosLat);
  const { lat, lon } = clampToBounds(anchor.lat + dLat, anchor.lon + dLon);
  return { ...anchor, lat, lon };
}

/**
 * Anchor query for an owner location: the subdivision (most specific named
 * place OSM tends to know) then the barangay. Deliberately excludes the
 * free-text street address and the block/lot so the pin is positioned by the
 * block/lot grid, not by whatever text was typed.
 */
function buildAnchorAddress({ barangay, subdivision } = {}) {
  const parts = [];
  if (subdivision && String(subdivision).trim()) parts.push(String(subdivision).trim());
  if (barangay && String(barangay).trim()) parts.push(`Barangay ${String(barangay).trim()}`);
  if (parts.length === 0) return null;
  parts.push('Cabuyao City', 'Laguna', 'Philippines');
  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// Building-footprint snapping
//
// The block/lot grid gets the pin into the right neighbourhood; this nudges it
// onto the nearest real building footprint so it lands on a house rather than
// the middle of a block. Footprints come from OpenStreetMap via the Overpass
// API (free, no key). Coverage in Cabuyao is partial, so this is strictly
// best-effort: if nothing is found, unreachable, or farther than a small snap
// radius, the grid pin is kept untouched. Anchor query for an owner location.
// ---------------------------------------------------------------------------
const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const OVERPASS_UA = 'CityVetPetRegistration/1.0 (capstone; contact: cityvetoffice04@gmail.com)';
const SNAP_MAX_METERS = 80; // only refine when a footprint is genuinely nearby

// Building snapping needs the public Overpass API, which is frequently
// overloaded (504) and would add many seconds to every lookup for no gain.
// Off by default; set GEOCODE_BUILDING_SNAP=1 to enable it where Overpass is
// responsive.
const BUILDING_SNAP_ENABLED = /^(1|true|yes|on)$/i.test(String(process.env.GEOCODE_BUILDING_SNAP || ''));

// A subdivision result this far from its barangay centroid is treated as a
// wrong-name match and the authoritative barangay anchor is used instead.
const SUBDIVISION_MAX_FROM_BARANGAY_M = 3000;

function metersBetween(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Returns the centroid { lat, lon } of the nearest building footprint within
 * `radiusMeters` of (lat, lon), or null. Cached; never throws.
 */
async function nearestBuilding(lat, lon, radiusMeters = SNAP_MAX_METERS) {
  const key = `bld:${lat.toFixed(5)},${lon.toFixed(5)},${radiusMeters}`;
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;

  const query =
    `[out:json][timeout:8];` +
    `(way["building"](around:${radiusMeters},${lat},${lon});` +
    `node["building"](around:${radiusMeters},${lat},${lon});` +
    `relation["building"](around:${radiusMeters},${lat},${lon}););` +
    `out center 30;`;

  let result = null;
  try {
    result = await throttle(async () => {
      const response = await fetch(OVERPASS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': OVERPASS_UA,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return null;
      const json = await response.json();
      const elements = Array.isArray(json.elements) ? json.elements : [];
      let best = null;
      let bestDist = Infinity;
      for (const el of elements) {
        const center = el.center || (el.lat != null && el.lon != null ? el : null);
        if (!center) continue;
        const cLat = Number(center.lat);
        const cLon = Number(center.lon);
        if (!Number.isFinite(cLat) || !Number.isFinite(cLon)) continue;
        const d = metersBetween(lat, lon, cLat, cLon);
        if (d < bestDist) {
          bestDist = d;
          best = { lat: cLat, lon: cLon };
        }
      }
      return best;
    });
  } catch (e) {
    console.log(`[geocode] building snap failed: ${e && e.message ? e.message : e}`);
    result = null;
  }
  cacheSet(key, result);
  return result;
}

/**
 * Picks the best anchor point for an owner location.
 *
 * Nominatim cannot reliably resolve Cabuyao barangay names (it returns the city
 * centroid for many of them), so the barangay is anchored on the authoritative
 * PhilAtlas coordinate table instead. A named subdivision — the finest place OSM
 * tends to know — is preferred when it is consistent with the chosen barangay.
 * Returns { lat, lon, display_name } or null.
 */
async function resolveAnchor({ barangay, subdivision } = {}) {
  const known = barangayCoordinate(barangay);
  const knownPoint = known ? { lat: known[0], lon: known[1] } : null;

  if (subdivision && String(subdivision).trim()) {
    const subdivisionGeo = await geocodeOnce(`${String(subdivision).trim()}, Cabuyao City, Laguna, Philippines`);
    if (subdivisionGeo) {
      const consistent =
        !knownPoint ||
        metersBetween(knownPoint.lat, knownPoint.lon, subdivisionGeo.lat, subdivisionGeo.lon) <=
          SUBDIVISION_MAX_FROM_BARANGAY_M;
      if (consistent) return { ...subdivisionGeo, source: 'subdivision' };
    }
  }

  if (knownPoint) {
    return {
      lat: knownPoint.lat,
      lon: knownPoint.lon,
      display_name: `Barangay ${normalizeBarangay(barangay)}, Cabuyao City, Laguna`,
      source: 'barangay',
    };
  }

  const anchorQuery = buildAnchorAddress({ barangay, subdivision });
  if (!anchorQuery) return null;
  const geo = await geocode(anchorQuery);
  return geo ? { ...geo, source: 'geocode' } : null;
}

/**
 * Resolves an owner's pin from barangay/subdivision + block/lot. Returns
 * { lat, lon, display_name } or null. Never throws.
 */
async function geocodeOwnerLocation({ barangay, subdivision, block, lot } = {}) {
  const anchor = await resolveAnchor({ barangay, subdivision });
  if (!anchor) return null;

  const grid = applyBlockLotGrid(anchor, block, lot);
  let pin = grid;

  // Only refine a block/lot grid point, and only onto a nearby footprint, so
  // the pin still clearly follows the block & lot the owner typed.
  if (grid !== anchor && BUILDING_SNAP_ENABLED) {
    const building = await nearestBuilding(grid.lat, grid.lon);
    if (building) pin = { ...grid, ...building };
  }

  const blk = block != null && String(block).trim() ? String(block).trim() : '';
  const lt = lot != null && String(lot).trim() ? String(lot).trim() : '';
  const suffix = blk || lt ? ` (${blk ? `Blk ${blk}` : ''}${blk && lt ? ' ' : ''}${lt ? `Lot ${lt}` : ''})` : '';
  return {
    lat: pin.lat,
    lon: pin.lon,
    display_name: anchor.display_name ? `${anchor.display_name}${suffix}` : null,
  };
}

/**
 * Single Nominatim lookup for one candidate string (throttled + bounds-checked).
 * Returns { lat, lon, display_name } or null.
 */
async function queryNominatim(candidate) {
  return throttle(async () => {
    const url =
      `${NOMINATIM_ENDPOINT}?format=jsonv2&limit=5&countrycodes=ph` +
      `&q=${encodeURIComponent(candidate)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CityVetPetRegistration/1.0 (capstone; contact: cityvetoffice04@gmail.com)',
        'Accept-Language': 'en,ph;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const list = await response.json();
    if (!Array.isArray(list) || list.length === 0) return null;
    for (const item of list) {
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      if (!inBounds(lat, lon)) continue;
      return { lat, lon, display_name: item.display_name || null };
    }
    return null;
  });
}

/**
 * Geocodes a single exact string with no degradation (one request, cached).
 * Used for subdivision names, where a partial match would blur the pin back to
 * the city. Returns { lat, lon, display_name } or null.
 */
async function geocodeOnce(queryText) {
  const text = String(queryText || '').trim();
  if (!text) return null;
  const key = memoryKey(text);
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;
  let result = null;
  try {
    result = await queryNominatim(text);
  } catch (e) {
    console.log(`[geocode] lookup failed for "${text.slice(0, 80)}": ${e && e.message ? e.message : e}`);
  }
  cacheSet(key, result);
  return result;
}

/**
 * Geocodes a Cabuyao address to { lat, lon, display_name } or null.
 * Never throws: network/rate-limit problems return null so callers treat a
 * failed lookup as "fall back to barangay centroid", never as an error.
 *
 * OSM street data inside Philippine barangays is sparse, so a barbaray-scale
 * result is far better than giving up. The query is degraded progressively from
 * the front of the address onward: full address -> no block/lot -> no street ->
 * subdivision + barangay -> barangay + city. The first candidate that resolves
 * inside Cabuyao wins.
 */
async function geocode(queryText) {
  const text = String(queryText || '').trim();
  if (!text) return null;

  const key = memoryKey(text);
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;

  // Candidates ordered from most to least specific: drop one leading part at a
  // time ("Blk 1 Lot 2, 12 Street, San Antonio Village, Barangay San Isidro,
  // Cabuyao City, Laguna, Philippines" -> ... -> "Barangay San Isidro, ...").
  const parts = text.split(',').map((s) => s.trim()).filter(Boolean);
  const candidates = [];
  for (let drop = 0; drop <= Math.min(3, parts.length - 1); drop += 1) {
    const c = parts.slice(drop).join(', ');
    if (c && !candidates.includes(c)) candidates.push(c);
  }
  if (candidates.length === 0) candidates.push(text);
  // Validated fallback if every candidate misses: bare barangay + city.
  const brgyPart = parts.find((p) => /^barangay\b|^brgy\.?/i.test(p));
  if (brgyPart && !candidates.some((c) => c.startsWith(brgyPart))) {
    candidates.push(`${brgyPart.replace(/^brgy\.?\s+/i, 'Barangay ')}, Cabuyao City, Laguna, Philippines`);
  }
  // Nominatim inside Cabuyao does NOT index "Barangay X" for many barangays —
  // "Barangay Baclaran" returns nothing while "Baclaran" resolves. Add copies
  // of every candidate with the barangay prefix stripped ("Barangay " / "Brgy. ").
  const stripped = [];
  for (const c of candidates) {
    const v = c.replace(/\bBarangay\s+/gi, '').replace(/\bBrgy\.?\s+/gi, '');
    if (v !== c && !candidates.includes(v) && !stripped.includes(v)) stripped.push(v);
  }
  candidates.push(...stripped);

  let result = null;
  for (const candidate of candidates) {
    if (result) break;
    const candidateKey = memoryKey(candidate);
    const cached = cacheGet(candidateKey);
    if (cached !== undefined) {
      if (cached) result = cached;
      continue;
    }
    try {
      const found = await queryNominatim(candidate);
      cacheSet(candidateKey, found);
      if (found) result = found;
    } catch (e) {
      console.log(`[geocode] lookup failed for "${candidate.slice(0, 80)}": ${e && e.message ? e.message : e}`);
    }
  }

  cacheSet(key, result);
  return result;
}

module.exports = { geocode, buildAnchorAddress, geocodeOwnerLocation, inBounds };