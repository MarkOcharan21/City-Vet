const test = require("node:test");
const assert = require("node:assert/strict");
const { createAnalyticsSeed2025, MARKER, PET_CODE_PREFIX } = require("../src/utils/analyticsSeed2025Data");

function monthsWithRecords(records, dateKey) {
  return new Set(records.map((record) => record[dateKey].slice(0, 7)));
}

test("2025 analytics seed is deterministic and contains every analytics category", () => {
  const seed = createAnalyticsSeed2025();

  assert.deepEqual(seed, createAnalyticsSeed2025());
  assert.equal(seed.year, 2025);
  assert.equal(seed.marker, MARKER);
  assert.equal(seed.owners.length, 24);
  assert.equal(seed.pets.length, 48);
  assert.ok(seed.vaccinations.length >= seed.pets.length);
  assert.equal(seed.payments.length, seed.pets.length);
  assert.ok(seed.pets.every((pet) => pet.key.startsWith("pet-")));
  assert.ok(seed.payments.every((payment) => payment.amount >= 250 && payment.amount <= 1000));
  assert.ok(PET_CODE_PREFIX.includes("2025"));
});

test("pet registrations, vaccinations, and payments cover all months of 2025", () => {
  const seed = createAnalyticsSeed2025();
  const months = Array.from({ length: 12 }, (_, index) => `2025-${String(index + 1).padStart(2, "0")}`);

  assert.deepEqual([...monthsWithRecords(seed.pets, "registrationDate")].sort(), months);
  assert.deepEqual([...monthsWithRecords(seed.vaccinations, "dateAdministered")].sort(), months);
  assert.deepEqual([...monthsWithRecords(seed.payments, "serviceDate")].sort(), months);
});

test("seeded pets and analytics events use synthetic records dated in 2025", () => {
  const seed = createAnalyticsSeed2025();
  const allDates = [
    ...seed.owners.map((owner) => owner.createdAt),
    ...seed.pets.map((pet) => pet.registrationDate),
    ...seed.vaccinations.map((vaccination) => vaccination.dateAdministered),
    ...seed.payments.map((payment) => payment.serviceDate),
  ];

  assert.ok(allDates.every((date) => date >= "2025-01-01" && date <= "2025-12-31"));
  assert.ok(seed.pets.every((pet) => pet.registrationDate >= "2025-01-01"));
});
