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

function defaultCatalogExpiryDate(seed = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const id = Math.abs(Number(seed) || 0);
  const remainder = id % 8;
  let offsetDays;

  if (remainder === 0) {
    offsetDays = -(35 + (id % 45));
  } else if (remainder === 1) {
    offsetDays = -(1 + (id % 14));
  } else if (remainder === 2) {
    offsetDays = 1 + (id % 20);
  } else if (remainder === 3) {
    offsetDays = 21 + (id % 10);
  } else {
    offsetDays = 45 + ((id * 37) % 320);
  }

  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function defaultCatalogBatchNumber(seed) {
  const id = Math.abs(Number(seed) || 0);
  const suffix = ((id * 7919) % 46656).toString(36).toUpperCase().padStart(3, "0");
  return `CP-${String(id).padStart(4, "0")}-${suffix}`;
}

module.exports = {
  defaultCatalogUnit,
  defaultCatalogExpiryDate,
  defaultCatalogBatchNumber,
};
