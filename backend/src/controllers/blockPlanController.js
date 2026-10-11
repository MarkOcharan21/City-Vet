'use strict';

/**
 * Admin block-plan registry.
 *
 * OSM has no Philippine parcel data, so owner pins normally fall back to a
 * deterministic grid inside the subdivision. When the City provides real block
 * plans, an admin imports them here (CSV or GeoJSON) and the geocoder resolves
 * the exact lot instead. One shared table (`subdivision_lots`), created at boot
 * by src/db/ensureSubdivisionLots.js.
 */
const db = require('../config/db');
const { inBounds } = require('../utils/geocode');
const { logAudit } = require('../middleware/auditMiddleware');
const { subdivisionLotKey, normalizeSlot } = require('../utils/subdivisionLots');

const MAX_ROWS = 20000;

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function splitCsvLine(line) {
  const out = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      out.push(field);
      field = '';
    } else {
      field += c;
    }
  }
  out.push(field);
  return out;
}

const COLUMN_ALIASES = {
  subdivision: ['subdivision', 'subdivision_key', 'subdivisionkey', 'village', 'subd', 'name'],
  block: ['block', 'blk', 'blockno', 'block_no', 'blocknumber'],
  lot: ['lot', 'lotno', 'lot_no', 'lotnumber'],
  lat: ['lat', 'latitude', 'y'],
  lon: ['lon', 'lng', 'long', 'longitude', 'x'],
};

function aliasLookup(header) {
  const map = {};
  header.forEach((raw, index) => {
    const key = String(raw || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(key) && map[field] === undefined) map[field] = index;
    }
  });
  return map;
}

/**
 * Parses CSV text into raw row objects. Understands an optional header row;
 * without one, columns are assumed to be block,lot,lat,lon (or
 * subdivision,block,lot,lat,lon when five columns are present).
 */
function parseCsv(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  if (lines.length === 0) return [];

  const first = splitCsvLine(lines[0]);
  const hasHeader = first.some((cell) => {
    const k = String(cell).toLowerCase().replace(/[^a-z]/g, '');
    return ['subdivision', 'village', 'block', 'blk', 'lot', 'lat', 'latitude', 'lon', 'lng', 'long', 'longitude', 'x', 'y'].includes(k);
  });

  let map;
  let start;
  if (hasHeader) {
    map = aliasLookup(first);
    start = 1;
  } else if (first.length >= 5) {
    map = { subdivision: 0, block: 1, lot: 2, lat: 3, lon: 4 };
    start = 0;
  } else {
    map = { block: 0, lot: 1, lat: 2, lon: 3 };
    start = 0;
  }

  const rows = [];
  for (let i = start; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    const get = (field) => (map[field] === undefined ? '' : String(cells[map[field]] ?? '').trim());
    rows.push({
      subdivision: get('subdivision'),
      block: get('block'),
      lot: get('lot'),
      lat: get('lat'),
      lon: get('lon'),
    });
  }
  return rows;
}

// Average of a polygon ring's vertices — good enough for a lot footprint
// centroid and avoids pulling in a geometry dependency.
function ringCentroid(ring) {
  if (!Array.isArray(ring) || ring.length === 0) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const point of ring) {
    const lon = Number(point && point[0]);
    const lat = Number(point && point[1]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      sx += lon;
      sy += lat;
      n += 1;
    }
  }
  return n === 0 ? null : { lat: sy / n, lon: sx / n };
}

function geometryCentroid(geometry) {
  if (!geometry || typeof geometry !== 'object') return null;
  const { type, coordinates } = geometry;
  if (type === 'Point') {
    const lon = Number(coordinates && coordinates[0]);
    const lat = Number(coordinates && coordinates[1]);
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
  }
  if (type === 'Polygon') return ringCentroid(coordinates && coordinates[0]);
  if (type === 'MultiPolygon') {
    const first = coordinates && coordinates[0];
    return ringCentroid(first && first[0]);
  }
  return null;
}

function parseGeoJson(text) {
  const json = typeof text === 'string' ? JSON.parse(text) : text;
  let features = [];
  if (json && json.type === 'FeatureCollection' && Array.isArray(json.features)) {
    features = json.features;
  } else if (json && json.type === 'Feature') {
    features = [json];
  } else if (Array.isArray(json)) {
    features = json;
  } else if (json && json.geometry) {
    features = [json];
  }

  const rows = [];
  for (const feature of features) {
    const centroid = geometryCentroid(feature.geometry || feature);
    if (!centroid) continue;
    const props = feature.properties || {};
    const pick = (...keys) => {
      for (const k of keys) {
        if (props[k] !== undefined && props[k] !== null && String(props[k]).trim() !== '') {
          return String(props[k]).trim();
        }
      }
      return '';
    };
    rows.push({
      subdivision: pick('subdivision', 'subdivision_key', 'village', 'subd', 'name'),
      block: pick('block', 'blk', 'block_no', 'blockno'),
      lot: pick('lot', 'lot_no', 'lotno'),
      lat: centroid.lat,
      lon: centroid.lon,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

async function listPlans(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT subdivision_key AS subdivision, COUNT(*) AS lots, MIN(created_at) AS created_at
       FROM subdivision_lots
       GROUP BY subdivision_key
       ORDER BY subdivision_key ASC`,
    );
    const plans = (rows || []).map((row) => ({
      subdivision: row.subdivision,
      lots: Number(row.lots) || 0,
      created_at: row.created_at,
    }));
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getPlan(req, res) {
  try {
    const key = String(req.params.subdivision || '').trim();
    if (!key) return res.status(400).json({ success: false, message: 'Subdivision is required.' });
    const [rows] = await db.query(
      `SELECT id, block, lot, latitude, longitude
       FROM subdivision_lots
       WHERE subdivision_key = ?
       ORDER BY block ASC, lot ASC`,
      [key],
    );
    res.json({ success: true, subdivision: key, lots: rows || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function importPlan(req, res) {
  try {
    const body = req.body || {};
    const content = typeof body.content === 'string' ? body.content : '';
    const fallbackSubdivision = String(body.subdivision || '').trim();
    if (!content.trim()) {
      return res.status(400).json({ success: false, message: 'No file content received.' });
    }

    let rows;
    let format;
    try {
      // JSON (GeoJSON) is attempted first; CSV is the fallback.
      if (/^\s*[[{]/.test(content)) {
        rows = parseGeoJson(content);
        format = 'geojson';
      } else {
        rows = parseCsv(content);
        format = 'csv';
      }
    } catch (parseError) {
      return res.status(400).json({ success: false, message: `Could not parse the file: ${parseError.message}` });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows with coordinates were found in the file.' });
    }
    if (rows.length > MAX_ROWS) {
      return res.status(400).json({ success: false, message: `Too many rows (${rows.length}). The limit is ${MAX_ROWS}.` });
    }

    const isPg = db.dialect === 'postgres';
    const conflictClause = isPg
      ? `ON CONFLICT (subdivision_key, block, lot)
         DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude`
      : `ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude)`;
    const BATCH = 200;

    const valid = [];
    const skippedReasons = { missingSubdivision: 0, missingSlot: 0, badCoordinates: 0 };
    const touched = new Set();

    for (const row of rows) {
      const subdivisionName = String(row.subdivision || '').trim() || fallbackSubdivision;
      if (!subdivisionName) {
        skippedReasons.missingSubdivision += 1;
        continue;
      }
      const block = normalizeSlot(row.block);
      const lot = normalizeSlot(row.lot);
      if (!block || !lot) {
        skippedReasons.missingSlot += 1;
        continue;
      }
      const lat = Number(row.lat);
      const lon = Number(row.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inBounds(lat, lon)) {
        skippedReasons.badCoordinates += 1;
        continue;
      }
      const key = subdivisionLotKey(subdivisionName);
      valid.push([key, block, lot, lat, lon]);
      touched.add(key);
    }

    let imported = 0;
    for (let i = 0; i < valid.length; i += BATCH) {
      const batch = valid.slice(i, i + BATCH);
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const params = batch.flat();
      await db.query(
        `INSERT INTO subdivision_lots (subdivision_key, block, lot, latitude, longitude)
         VALUES ${placeholders} ${conflictClause}`,
        params,
      );
      imported += batch.length;
    }

    const skipped = rows.length - imported;
    logAudit(req, {
      action: 'Import',
      entity_type: 'BlockPlan',
      entity_id: null,
      new_value: `${imported} lots`,
      description: `Imported ${imported} block-plan lots (${format}) for ${[...touched].join(', ') || 'no subdivision'}`,
    }).catch(() => {});

    res.json({
      success: imported > 0,
      message: imported > 0
        ? `Imported ${imported} lot${imported === 1 ? '' : 's'}.`
        : 'No valid rows could be imported.',
      format,
      imported,
      skipped,
      skippedReasons,
      subdivisions: [...touched],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function deletePlan(req, res) {
  try {
    const key = String(req.params.subdivision || '').trim();
    if (!key) return res.status(400).json({ success: false, message: 'Subdivision is required.' });
    const [result] = await db.query('DELETE FROM subdivision_lots WHERE subdivision_key = ?', [key]);
    const deleted = result.affectedRows || 0;
    logAudit(req, {
      action: 'Delete',
      entity_type: 'BlockPlan',
      entity_id: null,
      old_value: key,
      description: `Deleted block plan for ${key} (${deleted} lots)`,
    }).catch(() => {});
    res.json({ success: true, message: `Removed ${deleted} lot${deleted === 1 ? '' : 's'}.`, deleted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { listPlans, getPlan, importPlan, deletePlan };
