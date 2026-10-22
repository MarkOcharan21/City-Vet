function defaultCatalogUnit(category, productName) {
  const name = String(productName || "").toLowerCase();
  if (category === "Vaccines") return "dose";
  if (category === "Consultation") return "service";
  if (/\btablet|tablets|tab\b/.test(name)) return "tablet";
  if (/\bcapsule|capsules|cap\b/.test(name)) return "capsule";
  if (/\bsolution|syrup|suspension|drops|liquid\b/.test(name)) return "bottle";
  if (/\bcream|ointment|gel\b/.test(name)) return "tube";
  if (/\bpowder|sachet\b/.test(name)) return "sachet";
  return "piece";
}

function defaultCatalogExpiryDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

module.exports = { defaultCatalogUnit, defaultCatalogExpiryDate };
