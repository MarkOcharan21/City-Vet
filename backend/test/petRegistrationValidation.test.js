const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isPetOlderThanThreeMonths,
  validatePetRegistration,
} = require('../src/utils/validation');

function manilaToday() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function shiftDays(iso, days) {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function shiftMonths(iso, months) {
  const [year, month, day] = iso.split('-').map(Number);
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = index % 12;
  const targetDay = Math.min(day, new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate());
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

test('a pet exactly three months old is not old enough to register', () => {
  const today = manilaToday();
  const birthdate = shiftMonths(today, -3);
  assert.equal(isPetOlderThanThreeMonths(birthdate, today), false);
});

test('a pet younger than three months is not old enough to register', () => {
  const today = manilaToday();
  const birthdate = shiftDays(shiftMonths(today, -3), 1);
  assert.equal(isPetOlderThanThreeMonths(birthdate, today), false);
});

test('a pet older than three months is old enough to register', () => {
  const today = manilaToday();
  const birthdate = shiftDays(shiftMonths(today, -3), -1);
  assert.equal(isPetOlderThanThreeMonths(birthdate, today), true);
});

test('minimum age validation returns an error for pets three months old or younger', () => {
  const birthdate = shiftMonths(manilaToday(), -3);
  const validation = validatePetRegistration({
    name: 'Milo',
    species_id: 1,
    sex: 'Male',
    birthdate,
  }, { requireMinimumAge: true });

  assert.equal(validation.valid, false);
  assert.equal(validation.errors.birthdate, 'Pets must be more than 3 months old to register.');
});

test('minimum age validation requires a birthdate', () => {
  const validation = validatePetRegistration({
    name: 'Milo',
    species_id: 1,
    sex: 'Male',
    birthdate: '',
  }, { requireMinimumAge: true });

  assert.equal(validation.valid, false);
  assert.equal(
    validation.errors.birthdate,
    'Birthdate is required to verify your pet is more than 3 months old.',
  );
});

test('minimum age validation allows existing pet data without enforcing registration age', () => {
  const validation = validatePetRegistration({
    name: 'Milo',
    species_id: 1,
    sex: 'Male',
    birthdate: shiftMonths(manilaToday(), -3),
  });

  assert.equal(validation.valid, true);
});
