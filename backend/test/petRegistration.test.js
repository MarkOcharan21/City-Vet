const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../src/config/db');
const notificationService = require('../src/services/notificationService');
const qrGenerator = require('../src/utils/qrGenerator');

const originalDbQuery = db.query;
const originalCreateNotification = notificationService.createNotification;
const originalGenerateQrForPet = qrGenerator.generateQrForPet;

const resetStubs = () => {
  db.query = originalDbQuery;
  notificationService.createNotification = originalCreateNotification;
  qrGenerator.generateQrForPet = originalGenerateQrForPet;
};

test('registerPetForOwner does not generate QR before approval', async () => {
  const calls = [];

  db.query = async (sql, params) => {
    calls.push({ sql, params });

    if (sql.includes('SELECT id FROM pet_owners')) {
      return [[{ id: 99 }]];
    }

    if (sql.includes('SELECT id FROM pets WHERE pet_owner_id')) {
      return [[]];
    }

    if (sql.includes('SELECT pet_code FROM pets WHERE pet_code LIKE')) {
      return [[]];
    }

    if (sql.includes('INSERT INTO pets')) {
      return [{ insertId: 42 }];
    }

    if (sql.includes('SELECT full_name, user_id FROM pet_owners')) {
      return [[{ full_name: 'Test Owner', user_id: 7 }]];
    }

    return [[]];
  };

  notificationService.createNotification = async () => {};
  qrGenerator.generateQrForPet = async () => {
    throw new Error('QR generation should not happen before pet approval.');
  };

  delete require.cache[require.resolve('../src/services/petRegistrationService.js')];
  const { registerPetForOwner } = require('../src/services/petRegistrationService.js');

  try {
    const result = await registerPetForOwner(1, {
      name: 'Max',
      species_id: 1,
      breed_id: null,
      sex: 'Male',
      color: 'Black',
      birthdate: '2023-01-01',
    });

    assert.equal(result.petId, 42);
    assert.equal(calls.some((call) => call.sql.includes('INSERT INTO qr_codes')), false);
  } finally {
    resetStubs();
  }
});
