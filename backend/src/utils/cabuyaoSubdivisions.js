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

// Bounding box [minLat, minLon, maxLat, maxLon] of each subdivision's real OSM
// footprint. The block/lot grid is laid inside this box so a pin can never
// drift outside the subdivision the owner actually chose. Degenerate entries
// (a mapped point, not a polygon) are treated as "no bounds".
const SUBDIVISION_BOUNDS = {
  'Alegria at Dos Rios': [14.21835, 121.06985, 14.22328, 121.07851],
  'Amaia Scapes Cabuyao': [14.27201, 121.13286, 14.27748, 121.1376],
  'Bamboo Orchard Subdivision': [14.25248, 121.13696, 14.25597, 121.13895],
  'Baroro Compound': [14.28568, 121.12623, 14.28621, 121.12731],
  'Bella Solana': [14.2772, 121.12797, 14.28007, 121.13096],
  'Birmingham Village': [14.24294, 121.13438, 14.24807, 121.13993],
  'Birminghan Village (Extension)': [14.2418, 121.13533, 14.24382, 121.13787],
  'Brillianz Recidences': [14.23661, 121.16394, 14.23945, 121.16548],
  'Buena Rosario': [14.23661, 121.16494, 14.23984, 121.16639],
  'Cabuyao Central Subdivision': [14.2408, 121.12566, 14.24386, 121.1312],
  'Camella Bermuda 1': [14.22733, 121.13514, 14.23011, 121.13867],
  'Camella Bermuda 2': [14.22513, 121.13451, 14.22865, 121.13747],
  'Camella Dos Rios': [14.22498, 121.08757, 14.22966, 121.09236],
  'Camella Dos Rios Trails': [14.23024, 121.08743, 14.23244, 121.09167],
  'Canaan Homes': [14.24071, 121.1424, 14.24242, 121.14337],
  'Casa Esperanza': [14.26899, 121.12639, 14.27251, 121.12861],
  'Celestine Homes': [14.27166, 121.14784, 14.27574, 121.15108],
  'Centennial Homes II': [14.25086, 121.13861, 14.25435, 121.14151],
  'Centennial Townhomes 1': [14.23859, 121.13446, 14.24198, 121.13941],
  'Centerra Cabuyao': [14.24921, 121.15645, 14.252, 121.15955],
  'Ciudad Montrina': [14.23302, 121.14885, 14.23405, 121.15013],
  'Don Onofre Subdivision': [14.24966, 121.12879, 14.25631, 121.13436],
  'Don Vicente Villas': [14.24829, 121.13885, 14.25256, 121.14557],
  'Ebron-Tenorio Compound': [14.24738, 121.12972, 14.24772, 121.13096],
  'Evergreen Subdivision': [14.24969, 121.1343, 14.25317, 121.13771],
  'Felicias Village': [14.23154, 121.13613, 14.23335, 121.13817],
  'Fortezza Phase 1': [14.2367, 121.12423, 14.2403, 121.12651],
  'Fortezza Phase 2': [14.23851, 121.12089, 14.24117, 121.12463],
  'Fortezza Subdivision': [14.2367, 121.12089, 14.24117, 121.12651],
  'Grand Acacia Grove Subdivision': [14.24831, 121.12346, 14.25053, 121.12904],
  'Grand Seville Subdivision': [14.23256, 121.13488, 14.23854, 121.14239],
  'Greencrest Ville': [14.23346, 121.15841, 14.23478, 121.16014],
  'Hana Garden Villas': [14.21787, 121.06816, 14.22002, 121.07096],
  'Hong Kong Village': [14.24867, 121.12126, 14.25219, 121.12888],
  'Idesia Cabuyao': [14.25843, 121.14393, 14.26223, 121.14583],
  'Katapatan Mutual Homes': [14.25477, 121.12834, 14.26281, 121.13538],
  'Katapatan Village': [14.26143, 121.13381, 14.26143, 121.13381],
  'La Bella Homes': [14.27339, 121.12871, 14.27609, 121.13308],
  'Lynville Enclave': [14.2387, 121.15705, 14.24171, 121.16026],
  'Lynville Residences Marinig': [14.27387, 121.13871, 14.27834, 121.14248],
  'Mabitac Phase 1 Niugan': [14.25935, 121.12779, 14.26088, 121.12896],
  'Mabitac Phase 2 Niugan': [14.26069, 121.12767, 14.2619, 121.12952],
  'Mahogany Village 2': [14.2364, 121.1213, 14.23932, 121.12358],
  'Mahogany Village Phase 2': [14.23439, 121.12136, 14.23662, 121.12323],
  'Maripaz Ville': [14.27877, 121.14309, 14.28113, 121.14568],
  'Mariquita Pueblo': [14.28073, 121.11894, 14.28386, 121.12204],
  'Mercedes Village': [14.26582, 121.12704, 14.2676, 121.12887],
  'Millwood Ville Subdivision': [14.24587, 121.12994, 14.24856, 121.13911],
  'Multiland IV Subdivision': [14.24304, 121.14532, 14.2452, 121.14656],
  'Oroville Subdivision': [14.23523, 121.14982, 14.23669, 121.15107],
  'Palmsville Subdivision': [14.22835, 121.14155, 14.23011, 121.14473],
  'Phase 1 Mabuhay City': [14.23863, 121.15961, 14.24747, 121.1704],
  'Phase 2, Mabuhay City': [14.2356, 121.15746, 14.23987, 121.1614],
  'Prince Village': [14.22998, 121.13975, 14.23206, 121.14126],
  'Realica Village': [14.24491, 121.12788, 14.24613, 121.12951],
  'Regatta South Subdivision': [14.25887, 121.1286, 14.2611, 121.13011],
  'Saint Joseph Village': [14.27757, 121.13571, 14.28107, 121.13741],
  'Saint Joseph Village 4': [14.28826, 121.13433, 14.28973, 121.13747],
  'Saint Joseph Village 5': [14.28604, 121.13764, 14.28772, 121.13918],
  'Saint Joseph Village 6': [14.28127, 121.13589, 14.28127, 121.13589],
  'Saint Joseph Village 8': [14.27985, 121.13663, 14.27985, 121.13663],
  'San Isidro Heights': [14.23492, 121.1343, 14.24057, 121.14175],
  'San Isidro Homes': [14.23935, 121.14295, 14.24297, 121.14473],
  'Santierra Nuvali': [14.21341, 121.05355, 14.22428, 121.06458],
  'Shineland Village': [14.27006, 121.12522, 14.27506, 121.1291],
  'Sierra Madre Village': [14.24026, 121.10231, 14.24626, 121.10755],
  'Southpoint Village': [14.24323, 121.10551, 14.25275, 121.11689],
  'Southville 1': [14.25897, 121.1372, 14.27808, 121.14722],
  'Southville I-A': [14.25654, 121.14442, 14.25851, 121.14615],
  'St. Francis Homes': [14.26317, 121.12731, 14.26575, 121.12945],
  'St. Isidore Executive Village': [14.24063, 121.13606, 14.24322, 121.14096],
  'St. Joseph Homes 1': [14.25941, 121.1496, 14.26419, 121.15346],
  'St. Joseph Homes 2': [14.2583, 121.15035, 14.25979, 121.15316],
  'St. Joseph Village 3': [14.23621, 121.15299, 14.23621, 121.15299],
  'St. Joseph Village 7 Phase 1': [14.26638, 121.15542, 14.26895, 121.15972],
  'St. Joseph Village 7 Phase 2': [14.26603, 121.15353, 14.26859, 121.15625],
  'St. Joseph Village 7 Phase 3': [14.26415, 121.15353, 14.26638, 121.15584],
  'St. Joseph Village 7 Phase 4': [14.26816, 121.15435, 14.27019, 121.15652],
  'St. Joseph Village 7 Phase 5': [14.259, 121.15376, 14.26516, 121.15678],
  'St. Joseph Windfield 1': [14.26008, 121.15298, 14.26405, 121.15501],
  'St. Joseph Windfield 2': [14.25872, 121.14479, 14.26381, 121.15278],
  'StoneRidge Ville': [14.282, 121.1249, 14.28547, 121.12732],
  'Terelay Subdivision': [14.23032, 121.0904, 14.23444, 121.0924],
  'Tierra Allegra Subdivision': [14.24125, 121.13865, 14.24367, 121.14158],
  'Value Homes 2': [14.23654, 121.14629, 14.23763, 121.14733],
  'Vanessa Homes': [14.24243, 121.14202, 14.2442, 121.14316],
  'Villa Adelina II': [14.24318, 121.11655, 14.24571, 121.12155],
  'Villa Estella': [14.24587, 121.16361, 14.24859, 121.16868],
  'Willow Park Homes': [14.24774, 121.13024, 14.25039, 121.13822],
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

const INDEX = Object.create(null); // normalized full name -> canonical name
const CORE_INDEX = Object.create(null); // generic tail stripped -> canonical name
const ENTRIES = [];
for (const name of Object.keys(SUBDIVISION_COORDINATES)) {
  const norm = normalizeSubdivision(name);
  if (!norm) continue;
  INDEX[norm] = name;
  const core = norm.replace(GENERIC_TAIL, '').trim();
  if (core && core !== norm && !CORE_INDEX[core]) CORE_INDEX[core] = name;
  ENTRIES.push({ norm, core, canonical: name });
}

/**
 * Resolves a free-text subdivision name to the canonical table key (tolerant of
 * abbreviation, an optional trailing "Subdivision"/"Village", and unique
 * prefixes), or null.
 */
function resolveSubdivision(name) {
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
  if (matches.length === 1) return matches[0].canonical;
  return null;
}

/** Returns [lat, lon] for a subdivision name, or null. */
function subdivisionCoordinate(name) {
  const canonical = resolveSubdivision(name);
  return canonical ? SUBDIVISION_COORDINATES[canonical] : null;
}

/**
 * Returns [minLat, minLon, maxLat, maxLon] footprint for a subdivision name, or
 * null when unknown or only mapped as a point (degenerate box).
 */
function subdivisionBounds(name) {
  const canonical = resolveSubdivision(name);
  const b = canonical ? SUBDIVISION_BOUNDS[canonical] : null;
  if (!b || b[2] <= b[0] || b[3] <= b[1]) return null;
  return b;
}

module.exports = {
  SUBDIVISION_COORDINATES,
  SUBDIVISION_BOUNDS,
  normalizeSubdivision,
  subdivisionCoordinate,
  subdivisionBounds,
};
