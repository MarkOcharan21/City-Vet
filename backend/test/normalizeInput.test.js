const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeInput, titleCase } = require('../src/middleware/normalizeInputMiddleware');

test('titleCase capitalizes first letter of every word', () => {
  assert.equal(titleCase('browny'), 'Browny');
  assert.equal(titleCase('jun dela cruz'), 'Jun Dela Cruz');
  assert.equal(titleCase('BROWNIE'), 'BROWNIE');
  assert.equal(titleCase(''), '');
  assert.equal(titleCase('  pet  name '), '  Pet  Name ');
});

test('normalizeInput capitalizes only allowlisted keys', () => {
  const body = {
    full_name: 'jose rizal',
    barangay: 'bagong silang',
    owner_name: 'maria santos',
    pet_name: 'browny',
    email: 'jose@gmail.com',
    password: 'secret123',
    contact_number: '09171234567',
    description: 'lazy morning',
    serviceDate: '2026-09-11',
    status: 'Pending',
  };

  normalizeInput(body);

  assert.equal(body.full_name, 'Jose Rizal');
  assert.equal(body.barangay, 'Bagong Silang');
  assert.equal(body.owner_name, 'Maria Santos');
  assert.equal(body.pet_name, 'Browny');
  assert.equal(body.email, 'jose@gmail.com');
  assert.equal(body.password, 'secret123');
  assert.equal(body.contact_number, '09171234567');
  assert.equal(body.description, 'lazy morning');
  assert.equal(body.serviceDate, '2026-09-11');
  assert.equal(body.status, 'Pending');
});

test('normalizeInput recurses into nested arrays and objects', () => {
  const body = {
    items: [
      { service_name: 'anti-rabies vaccine', amount: 50 },
      { service_name: 'deworming', medicine_name: 'ivermectin' },
    ],
    pet_owner: { full_name: 'ana cruz', city: 'cabuyao' },
  };

  normalizeInput(body);

  assert.equal(body.items[0].service_name, 'Anti-rabies Vaccine');
  assert.equal(body.items[1].service_name, 'Deworming');
  assert.equal(body.items[1].medicine_name, 'Ivermectin');
  assert.equal(body.pet_owner.full_name, 'Ana Cruz');
  assert.equal(body.pet_owner.city, 'Cabuyao');
});

test('normalizeInputMiddleware applies to req.body', () => {
  const { normalizeInputMiddleware } = require('../src/middleware/normalizeInputMiddleware');
  const req = { body: { full_name: 'pedro penduko' } };
  let called = false;
  normalizeInputMiddleware(req, {}, () => { called = true; });
  assert.equal(req.body.full_name, 'Pedro Penduko');
  assert.equal(called, true);
});