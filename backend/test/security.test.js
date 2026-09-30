const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../src/config/db');
const petController = require('../src/controllers/petController');
const medicineController = require('../src/controllers/medicineController');
const notificationController = require('../src/controllers/notificationController');
const auditController = require('../src/controllers/auditController');
const userController = require('../src/controllers/userController');

const originalQuery = db.query;

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test.afterEach(() => {
  db.query = originalQuery;
});

test('owner cannot report another owner\'s pet as lost', async () => {
  db.query = async (sql) => {
    if (sql.includes('JOIN pet_owners')) {
      return [[{ id: 99, name: 'Luna', is_lost: 0, user_id: 2 }]];
    }
    throw new Error(`Unexpected query: ${sql}`);
  };

  const res = response();
  await petController.reportLost(
    { params: { id: '99' }, body: { last_seen: 'Pulo', reward: null }, user: { id: 1, role: 'Owner' } },
    res,
  );

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /own pets/i);
});

test('prescription will not fabricate a consultation that skips billing', async () => {
  const queries = [];
  db.query = async (sql, params) => {
    queries.push({ sql, params });
    // No consultation that produced charges: the patient has not been consulted yet.
    if (sql.includes('FROM consultation_records cr')) return [[]];
    throw new Error(`Unexpected query: ${sql}`);
  };

  const res = response();
  await medicineController.addPrescription(
    {
      body: { pet_id: 7, items: [{ medicine_id: 1, quantity: '1' }] },
      user: { id: 3, role: 'Veterinarian' },
    },
    res,
  );

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /save the consultation first/i);
  assert.ok(
    !queries.some(({ sql }) => sql.includes('INSERT INTO consultation_records')),
    'must not insert a consultation row that would never get a payment transaction',
  );
});

test('notification deletion is scoped to the authenticated user', async () => {
  let query;
  db.query = async (sql, params) => {
    query = { sql, params };
    return [{ affectedRows: 1 }];
  };

  const res = response();
  await notificationController.deleteNotification(
    { params: { id: '12' }, user: { id: 4 } },
    res,
  );

  assert.match(query.sql, /user_id\s*=\s*\?/i);
  assert.deepEqual(query.params, ['12', 4]);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});

test('staff check-in records the authenticated registered name', async () => {
  const queries = [];
  db.query = async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes('SELECT full_name')) return [[{ full_name: 'Registered Staff' }]];
    if (sql.includes('INSERT INTO audit_logs')) return [{ affectedRows: 1 }];
    throw new Error(`Unexpected query: ${sql}`);
  };

  const res = response();
  await auditController.staffCheckIn(
    {
      body: { staff_name: 'Andrei Unregistered' },
      user: { id: 12, role: 'Staff' },
      ip: '127.0.0.1',
      get: () => 'test-agent',
    },
    res,
  );

  const insert = queries.find(({ sql }) => sql.includes('INSERT INTO audit_logs'));
  assert.equal(insert.params[1], 'Registered Staff');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.staff_name, 'Registered Staff');
});

test('user directory creates a staff account requiring activation via setup link', async () => {
  const originalEnv = {
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
  };
  process.env.EMAIL_HOST = '';
  process.env.EMAIL_USER = '';
  process.env.EMAIL_PASS = '';

  const queries = [];
  db.query = async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes('SELECT id, role, full_name FROM users')) return [[]];
    if (sql.includes('SUBSTRING_INDEX(account_id')) return [[{ maxSeq: 0 }]];
    if (sql.includes('INSERT INTO audit_logs')) return [{ affectedRows: 1 }];
    if (sql.includes('INSERT INTO users')) return [{ insertId: 20 }];
    throw new Error(`Unexpected query: ${sql}`);
  };

  try {
    const res = response();
    await userController.createStaffUser(
      {
        body: {
          full_name: 'Mark Lawrence Ocharan',
          email: 'mark.staff@example.com',
          role_name: 'Staff',
        },
        headers: { origin: 'http://localhost:5178' },
      },
      res,
    );

    const insert = queries.find(({ sql }) => sql.includes('INSERT INTO users'));
    assert.ok(insert, 'expected an INSERT of a new user');
    assert.equal(insert.params[0], 'Staff');
    assert.equal(insert.params[1], 'mark.staff@example.com');
    assert.equal(insert.params[2], 'Mark Lawrence Ocharan');
    assert.ok(/status,\s*account_id,\s*setup_token/.test(insert.sql), 'INSERT must set up the pending/setup flow');
    assert.equal(res.statusCode, 201);
    assert.match(res.body.account_id, /^STF-20\d\d-/);
    assert.match(res.body.setup_url, /account-setup\?token=/);
  } finally {
    process.env.EMAIL_HOST = originalEnv.EMAIL_HOST;
    process.env.EMAIL_USER = originalEnv.EMAIL_USER;
    process.env.EMAIL_PASS = originalEnv.EMAIL_PASS;
  }
});
