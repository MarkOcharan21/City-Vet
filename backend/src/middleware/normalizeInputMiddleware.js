// Backend input normalization: capitalizes the first letter of every word for
// name-like string fields in request bodies, so records are stored with a
// consistent format regardless of how the value arrives. Passwords, emails,
// numbers, and free-text fields are never touched.

const CAP_KEYS = new Set([
  "name",
  "petname",
  "ownername",
  "fullname",
  "patientname",
  "requestername",
  "species",
  "breed",
  "color",
  "barangay",
  "address",
  "city",
  "district",
  "medicinename",
  "brandname",
  "drugname",
  "servicename",
  "vaccinename",
  "programname",
  "title",
  "contactperson",
]);

function normalizeKey(key) {
  return String(key).toLowerCase().replace(/[_\-]/g, "");
}

function titleCase(value) {
  return String(value)
    .split(" ")
    .map((word) => (word ? word.charAt(0).toLocaleUpperCase() + word.slice(1) : word))
    .join(" ");
}

function normalizeInput(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === "object") normalizeInput(item);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      const val = value[key];
      if (typeof val === "string" && CAP_KEYS.has(normalizeKey(key))) {
        value[key] = titleCase(val);
      } else if (Array.isArray(val) || (val && typeof val === "object")) {
        normalizeInput(val);
      }
    }
  }
}

function normalizeInputMiddleware(req, res, next) {
  if (req.body && typeof req.body === "object") {
    normalizeInput(req.body);
  }
  next();
}

module.exports = { normalizeInputMiddleware, normalizeInput, titleCase };