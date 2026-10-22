const test = require("node:test");
const assert = require("node:assert/strict");
const {
  defaultCatalogUnit,
  defaultCatalogExpiryDate,
} = require("../src/utils/catalogProductDefaults");

test("catalog defaults choose useful units by category and product name", () => {
  assert.equal(defaultCatalogUnit("Vaccines", "Anti-Rabies"), "dose");
  assert.equal(defaultCatalogUnit("Consultation", "Check-up"), "service");
  assert.equal(defaultCatalogUnit("Common Medicines", "Antibiotic Tablet"), "tablet");
  assert.equal(defaultCatalogUnit("Common Medicines", "Oral Solution"), "bottle");
  assert.equal(defaultCatalogUnit("Other Supplies", "Gauze"), "piece");
});

test("catalog sample expiry date is a valid date in the future", () => {
  const value = defaultCatalogExpiryDate();
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/);
  const expiry = new Date(`${value}T00:00:00`);
  assert.equal(Number.isNaN(expiry.getTime()), false);
  assert.ok(expiry > new Date());
});
