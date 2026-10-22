const test = require("node:test");
const assert = require("node:assert/strict");
const {
  defaultCatalogUnit,
  defaultCatalogExpiryDate,
  defaultCatalogBatchNumber,
} = require("../src/utils/catalogProductDefaults");

test("catalog defaults choose useful units by category and product name", () => {
  assert.equal(defaultCatalogUnit("Vaccines", "Anti-Rabies"), "dose");
  assert.equal(defaultCatalogUnit("Consultation", "Check-up"), "service");
  assert.equal(defaultCatalogUnit("Common Medicines", "Antibiotic Tablet"), "tablet");
  assert.equal(defaultCatalogUnit("Common Medicines", "Oral Solution"), "bottle");
  assert.equal(defaultCatalogUnit("Other Supplies", "Gauze"), "piece");
});

test("catalog expiry defaults vary and include near-expiry and expired dates", () => {
  const expired = defaultCatalogExpiryDate(8);
  const nearExpiry = defaultCatalogExpiryDate(2);
  const future = defaultCatalogExpiryDate(4);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  assert.match(expired, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(new Date(`${expired}T00:00:00`) < today);
  assert.ok(new Date(`${nearExpiry}T00:00:00`) >= today);
  assert.ok(new Date(`${nearExpiry}T00:00:00`) <= new Date(today.getTime() + 30 * 86400000));
  assert.ok(new Date(`${future}T00:00:00`) > new Date(today.getTime() + 30 * 86400000));
  assert.notEqual(expired, nearExpiry);
  assert.notEqual(nearExpiry, future);
});

test("catalog batch numbers are unique-looking and do not expose demo labels", () => {
  const first = defaultCatalogBatchNumber(1);
  const second = defaultCatalogBatchNumber(2);
  assert.notEqual(first, second);
  assert.doesNotMatch(first, /DEMO|SAMPLE/i);
});

test("catalog expiry defaults are valid ISO calendar dates", () => {
  const value = defaultCatalogExpiryDate(4);
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/);
  const expiry = new Date(`${value}T00:00:00`);
  assert.equal(Number.isNaN(expiry.getTime()), false);
});
