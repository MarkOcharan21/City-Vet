export const CABUYAO_BARANGAYS = [
  'Baclaran',
  'Banaybanay',
  'Banlic',
  'Bigaa',
  'Butong',
  'Casile',
  'Diezmo',
  'Gulod',
  'Mamatid',
  'Marinig',
  'Niugan',
  'Pittland',
  'Pulo',
  'Sala',
  'San Isidro',
];

export const CABUYAO_POB_BARANGAYS = [
  'Barangay Uno (Pob.)',
  'Barangay Dos (Pob.)',
  'Barangay Tres (Pob.)',
];

export const ALL_CABUYAO_BARANGAYS = [
  ...CABUYAO_BARANGAYS,
  ...CABUYAO_POB_BARANGAYS,
];

// Maps every stored/display name variant to a single canonical name so the map
// coordinates, heatmap radius and DB joins all agree regardless of which form
// the barangay name was captured in.
const BARANGAY_ALIASES = {
  'Barangay 1 (Poblacion)': 'Barangay 1 (Poblacion)',
  'Barangay 2 (Poblacion)': 'Barangay 2 (Poblacion)',
  'Barangay 3 (Poblacion)': 'Barangay 3 (Poblacion)',
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
  'Poblacion': 'Barangay 1 (Poblacion)',
  'Banaybanay': 'Banaybanay',
  'Banay-banay': 'Banaybanay',
  'Banay Banay': 'Banaybanay',
};

export function normalizeBarangay(name) {
  if (!name) return name;
  const trimmed = String(name).trim();
  if (!trimmed) return trimmed;
  const exact = BARANGAY_ALIASES[trimmed];
  if (exact) return exact;
  const lower = trimmed.toLowerCase();
  for (const [variant, canonical] of Object.entries(BARANGAY_ALIASES)) {
    if (variant.toLowerCase() === lower) return canonical;
  }
  return trimmed;
}
