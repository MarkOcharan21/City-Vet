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

/**
 * Joins the structured address pieces the same way in registration, the map,
 * and the backfill so every code path geocodes an identical string.
 * Accepts: { address, barangay, subdivision, block, lot }
 */
function buildSearchAddress({ address, barangay, subdivision, block, lot } = {}) {
  const parts = [];
  const blockLot = [block && `Blk ${block}`, lot && `Lot ${lot}`].filter(Boolean).join(' ');
  if (blockLot) parts.push(blockLot);
  if (address && String(address).trim()) parts.push(String(address).trim());
  if (subdivision && String(subdivision).trim()) parts.push(String(subdivision).trim());
  if (barangay && String(barangay).trim()) parts.push(`Barangay ${String(barangay).trim()}`);
  if (parts.length === 0) return null;
  parts.push('Cabuyao City', 'Laguna', 'Philippines');
  return parts.join(', ');
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
      const found = await throttle(async () => {
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
          return {
            lat,
            lon,
            display_name: item.display_name || null,
          };
        }
        return null;
      });
      cacheSet(candidateKey, found);
      if (found) result = found;
    } catch (e) {
      console.log(`[geocode] lookup failed for "${candidate.slice(0, 80)}": ${e && e.message ? e.message : e}`);
    }
  }

  cacheSet(key, result);
  return result;
}

module.exports = { geocode, buildSearchAddress, inBounds };