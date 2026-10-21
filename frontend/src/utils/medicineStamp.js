const STAMP_COLORS = {
  antibiotic: "#DC2626",
  anti_inflammatory: "#D97706",
  antiparasitic: "#059669",
  pain: "#7C3AED",
  general: "#6B7280",
  vaccines: "#2563EB",
  "dewormers / antiparasitics": "#059669",
  "vitamins / supplements": "#D97706",
  "common medicines": "#DC2626",
  "topical / wound care": "#7C3AED",
  "other supplies": "#6B7280",
};

const MEDICINE_NAME_COLORS = {
  amoxicillin: STAMP_COLORS.antibiotic,
  ampicillin: STAMP_COLORS.antibiotic,
  doxycycline: STAMP_COLORS.antibiotic,
  metronidazole: STAMP_COLORS.antibiotic,
  metacam: STAMP_COLORS.anti_inflammatory,
  carprofen: STAMP_COLORS.anti_inflammatory,
  rimadyl: STAMP_COLORS.anti_inflammatory,
  prednisone: STAMP_COLORS.anti_inflammatory,
  fenbendazole: STAMP_COLORS.antiparasitic,
  pyrantel: STAMP_COLORS.antiparasitic,
  ivermectin: STAMP_COLORS.antiparasitic,
  tramadol: STAMP_COLORS.pain,
  gabapentin: STAMP_COLORS.pain,
};

export function getMedicineStampColor({ category, productCategory, medicineName } = {}) {
  const categoryKey = String(category || "").toLowerCase();
  const categoryColor = STAMP_COLORS[categoryKey];
  if (categoryColor && categoryKey !== "general") return categoryColor;

  const name = String(medicineName || "").toLowerCase();
  const matchingMedicine = Object.keys(MEDICINE_NAME_COLORS).find((medicine) =>
    name.includes(medicine),
  );
  if (matchingMedicine) return MEDICINE_NAME_COLORS[matchingMedicine];
  if (categoryColor) return categoryColor;

  const catalogCategory = String(productCategory || "").toLowerCase();
  return STAMP_COLORS[catalogCategory] || STAMP_COLORS.general;
}
