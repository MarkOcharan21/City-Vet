'use strict';

/**
 * Authoritative barangay coordinates for Cabuyao City, Laguna.
 *
 * Source: PhilAtlas (https://www.philatlas.com/luzon/r04a/laguna/cabuyao.html).
 *
 * OpenStreetMap/Nominatim cannot reliably resolve Cabuyao barangay *names*, so
 * geocoding "Barangay Mamatid" often returns the Cabuyao City centroid and
 * every owner collapses onto the same wrong spot. These fixed coordinates give
 * every lookup a correct barangay anchor regardless of what OSM knows.
 */
const BARANGAY_COORDINATES = {
  Baclaran: [14.2451, 121.1698],
  Banaybanay: [14.2541, 121.1303],
  Banlic: [14.2311, 121.1367],
  'Barangay 1 (Poblacion)': [14.2471, 121.1367],
  'Barangay 2 (Poblacion)': [14.2475, 121.1371],
  'Barangay 3 (Poblacion)': [14.2468, 121.1363],
  Bigaa: [14.2909, 121.1288],
  Butong: [14.2899, 121.1374],
  Casile: [14.2380, 121.0830],
  Diezmo: [14.2310, 121.0940],
  Gulod: [14.2577, 121.1662],
  Mamatid: [14.2352, 121.1575],
  Marinig: [14.2794, 121.1464],
  Niugan: [14.2633, 121.1273],
  Pittland: [14.2206, 121.0738],
  Pulo: [14.2464, 121.1300],
  Sala: [14.2713, 121.1258],
  'San Isidro': [14.2401, 121.1398],
};

// Every stored/display name variant -> canonical coordinate key, so the form
// value, the Poblacion aliases and the map all resolve to one barangay.
const BARANGAY_ALIASES = {
  'Barangay Uno (Pob.)': 'Barangay 1 (Poblacion)',
  'Barangay Dos (Pob.)': 'Barangay 2 (Poblacion)',
  'Barangay Tres (Pob.)': 'Barangay 3 (Poblacion)',
  'Brgy. 1 (Pob.)': 'Barangay 1 (Poblacion)',
  'Brgy. 2 (Pob.)': 'Barangay 2 (Poblacion)',
  'Brgy. 3 (Pob.)': 'Barangay 3 (Poblacion)',
  'Barangay 1': 'Barangay 1 (Poblacion)',
  'Barangay 2': 'Barangay 2 (Poblacion)',
  'Barangay 3': 'Barangay 3 (Poblacion)',
  'Poblacion Uno': 'Barangay 1 (Poblacion)',
  'Poblacion Dos': 'Barangay 2 (Poblacion)',
  'Poblacion Tres': 'Barangay 3 (Poblacion)',
  Poblacion: 'Barangay 1 (Poblacion)',
  'Banay-banay': 'Banaybanay',
  'Banay Banay': 'Banaybanay',
};

function normalizeBarangay(name) {
  if (!name) return name;
  const trimmed = String(name).trim();
  if (!trimmed) return trimmed;
  if (BARANGAY_ALIASES[trimmed]) return BARANGAY_ALIASES[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [variant, canonical] of Object.entries(BARANGAY_ALIASES)) {
    if (variant.toLowerCase() === lower) return canonical;
  }
  return trimmed;
}

/**
 * Returns the [lat, lon] for a barangay name (any known alias), or null.
 */
function barangayCoordinate(name) {
  const canonical = normalizeBarangay(name);
  if (!canonical) return null;
  return BARANGAY_COORDINATES[canonical] || null;
}

module.exports = { BARANGAY_COORDINATES, normalizeBarangay, barangayCoordinate };
