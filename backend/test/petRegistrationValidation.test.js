const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isPetOlderThanThreeMonths,
  validatePetRegistration,
} = require('../src/utils/validation');

test('a pet exactly three months old is not old enough to register', () => {
  assert.equal(isPetOlderThanThreeMonths('2026-07-21', '2026-10-21'), false);
});

test('a pet younger than three months is not old enough to register', () => {
  assert.equal(isPetOlderThanThreeMonths('2026-07-22', '2026-10-21'), false);
});

test('a pet older than three months is old enough to register', () => {
  assert.equal(isPetOlderThanThreeMonths('2026-07-20', '2026-10-21'), true);
});

test('minimum age validation returns an error for pets three months old or younger', () => {
  const validation = validatePetRegistration({
    name: 'Milo',
    species_id: 1,
    sex: 'Male',
    birthdate: '2026-07-21',
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
    birthdate: '2026-07-21',
  });

  assert.equal(validation.valid, true);
});
