'use strict';

/**
 * Cabuyao City subdivision / neighbourhood coordinates.
 *
 * Source: OpenStreetMap (Overpass API), named `place=neighbourhood|quarter|
 * suburb|village` and `landuse=residential` areas clipped to the Cabuyao
 * administrative boundary (OSM relation 1552431).
 *
 * Nominatim can't reliably resolve most Cabuyao subdivision names, so the pin
 * used to fall back to the barangay centroid. These fixed coordinates let an
 * owner's subdivision land on the actual village instead.
 */
const SUBDIVISION_COORDINATES = {
  'Alegria at Dos Rios': [14.22082, 121.07418],
  'Amaia Scapes Cabuyao': [14.27474, 121.13523],
  'Bamboo Orchard Subdivision': [14.25423, 121.13796],
  'Baroro Compound': [14.28594, 121.12677],
  'Bella Solana': [14.27863, 121.12946],
  'Birmingham Village': [14.2455, 121.13716],
  'Birminghan Village (Extension)': [14.24281, 121.1366],
  'Brillianz Recidences': [14.23803, 121.16471],
  'Buena Rosario': [14.23823, 121.16566],
  'Cabuyao Central Subdivision': [14.24233, 121.12843],
  'Camella Bermuda 1': [14.22872, 121.13691],
  'Camella Bermuda 2': [14.22689, 121.13599],
  'Camella Dos Rios': [14.22732, 121.08997],
  'Camella Dos Rios Trails': [14.23134, 121.08955],
  'Canaan Homes': [14.24156, 121.14288],
  'Casa Esperanza': [14.27075, 121.1275],
  'Celestine Homes': [14.2737, 121.14946],
  'Centennial Homes II': [14.25261, 121.14006],
  'Centennial Townhomes 1': [14.24029, 121.13693],
  'Centerra Cabuyao': [14.25061, 121.158],
  'Ciudad Montrina': [14.23354, 121.14949],
  'Don Onofre Subdivision': [14.25299, 121.13157],
  'Don Vicente Villas': [14.25042, 121.14221],
  'Ebron-Tenorio Compound': [14.24755, 121.13034],
  'Evergreen Subdivision': [14.25143, 121.13601],
  'Felicias Village': [14.23244, 121.13715],
  'Fortezza Phase 1': [14.2385, 121.12537],
  'Fortezza Phase 2': [14.23984, 121.12276],
  'Fortezza Subdivision': [14.23894, 121.1237],
  'Grand Acacia Grove Subdivision': [14.24942, 121.12625],
  'Grand Seville Subdivision': [14.23555, 121.13864],
  'Greencrest Ville': [14.23412, 121.15928],
  'Hana Garden Villas': [14.21894, 121.06956],
  'Hong Kong Village': [14.25043, 121.12507],
  'Idesia Cabuyao': [14.26033, 121.14488],
  'Katapatan Mutual Homes': [14.25879, 121.13186],
  'Katapatan Village': [14.26143, 121.13381],
  'La Bella Homes': [14.27474, 121.13089],
  'Lynville Enclave': [14.24021, 121.15866],
  'Lynville Residences Marinig': [14.27611, 121.14059],
  'Mabitac Phase 1 Niugan': [14.26012, 121.12837],
  'Mabitac Phase 2 Niugan': [14.26129, 121.12859],
  'Mahogany Village 2': [14.23786, 121.12244],
  'Mahogany Village Phase 2': [14.23551, 121.12229],
  'Maripaz Ville': [14.27995, 121.14439],
  'Mariquita Pueblo': [14.2823, 121.12049],
  'Mercedes Village': [14.26671, 121.12796],
  'Millwood Ville Subdivision': [14.24722, 121.13452],
  'Multiland IV Subdivision': [14.24412, 121.14594],
  'Oroville Subdivision': [14.23596, 121.15045],
  'Palmsville Subdivision': [14.22923, 121.14314],
  'Phase 1 Mabuhay City': [14.24305, 121.165],
  'Phase 2, Mabuhay City': [14.23773, 121.15943],
  'Prince Village': [14.23102, 121.14051],
  'Realica Village': [14.24552, 121.1287],
  'Regatta South Subdivision': [14.25999, 121.12935],
  'Saint Joseph Village': [14.28309, 121.13878],
  'Saint Joseph Village 4': [14.28899, 121.1359],
  'Saint Joseph Village 5': [14.28688, 121.13841],
  'Saint Joseph Village 6': [14.28127, 121.13589],
  'Saint Joseph Village 8': [14.27985, 121.13663],
  'San Isidro Heights': [14.23775, 121.13803],
  'San Isidro Homes': [14.24116, 121.14384],
  'Santierra Nuvali': [14.21885, 121.05906],
  'Shineland Village': [14.27256, 121.12716],
  'Sierra Madre Village': [14.24326, 121.10493],
  'Southpoint Village': [14.24799, 121.1112],
  'Southville 1': [14.26853, 121.14221],
  'Southville I-A': [14.25752, 121.14528],
  'St. Francis Homes': [14.26446, 121.12838],
  'St. Isidore Executive Village': [14.24192, 121.13851],
  'St. Joseph Homes 1': [14.2618, 121.15153],
  'St. Joseph Homes 2': [14.25905, 121.15175],
  'St. Joseph Village 3': [14.23638, 121.15301],
  'St. Joseph Village 7 Phase 1': [14.26766, 121.15757],
  'St. Joseph Village 7 Phase 2': [14.26731, 121.15489],
  'St. Joseph Village 7 Phase 3': [14.26526, 121.15468],
  'St. Joseph Village 7 Phase 4': [14.26917, 121.15543],
  'St. Joseph Village 7 Phase 5': [14.26208, 121.15527],
  'St. Joseph Windfield 1': [14.26206, 121.154],
  'St. Joseph Windfield 2': [14.26126, 121.14878],
  'StoneRidge Ville': [14.28373, 121.12611],
  'Terelay Subdivision': [14.23238, 121.0914],
  'Tierra Allegra Subdivision': [14.24246, 121.14012],
  'Value Homes 2': [14.23708, 121.14681],
  'Vanessa Homes': [14.24332, 121.14259],
  'Villa Adelina II': [14.24444, 121.11905],
  'Villa Estella': [14.24723, 121.16614],
  'Willow Park Homes': [14.24906, 121.13423],
};

// Trailing generic words that owners routinely add or omit ("Bamboo Orchard"
// vs "Bamboo Orchard Subdivision"), so both forms resolve to the same place.
const GENERIC_TAIL =
  /\s+(subdivision|village|ville|villages|homes|home|compound|residences|recidences|enclave|heights|subd)$/;

function normalizeSubdivision(name) {
  let n = String(name == null ? '' : name).toLowerCase().trim();
  if (!n) return '';
  n = n.replace(/[.,'’`()\-/]/g, ' ');
  n = n.replace(/\bsubd\b|\bsubdv\b|\bsubdiv\b|\bsubdivision\b/g, 'subdivision');
  n = n.replace(/\bvill\b|\bvil\b|\bvillage\b/g, 'village');
  n = n.replace(/\bsta\b/g, 'santa').replace(/\bst\b/g, 'saint');
  n = n.replace(/\bbrgy\b|\bbarangay\b/g, ' ');
  n = n.replace(/\s+/g, ' ').trim();
  n = n.replace(/^the\s+/, '');
  return n;
}

const INDEX = Object.create(null); // normalized full name -> [lat, lon]
const CORE_INDEX = Object.create(null); // name with generic tail stripped -> [lat, lon]
const ENTRIES = [];
for (const [name, coord] of Object.entries(SUBDIVISION_COORDINATES)) {
  const norm = normalizeSubdivision(name);
  if (!norm) continue;
  INDEX[norm] = coord;
  const core = norm.replace(GENERIC_TAIL, '').trim();
  if (core && core !== norm && !CORE_INDEX[core]) CORE_INDEX[core] = coord;
  ENTRIES.push({ norm, core, coord });
}

/**
 * Returns [lat, lon] for a subdivision name (tolerant of abbreviation, the
 * optional trailing "Subdivision"/"Village", and unique prefixes), or null.
 */
function subdivisionCoordinate(name) {
  const q = normalizeSubdivision(name);
  if (!q || q.length < 3) return null;
  if (INDEX[q]) return INDEX[q];

  const core = q.replace(GENERIC_TAIL, '').trim();
  if (core && CORE_INDEX[core]) return CORE_INDEX[core];
  if (CORE_INDEX[q]) return CORE_INDEX[q];

  // Unique prefix match (e.g. owner typed "bamboo orchard" for the full name).
  const matches = ENTRIES.filter(
    (e) => e.norm.startsWith(`${q} `) || (e.core && (e.core.startsWith(`${q} `) || q.startsWith(`${e.core} `)))
  );
  if (matches.length === 1) return matches[0].coord;
  return null;
}

module.exports = { SUBDIVISION_COORDINATES, normalizeSubdivision, subdivisionCoordinate };
