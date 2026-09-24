const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../src/config/db');
const petController = require('../src/controllers/petController');
const officialReceiptController = require('../src/controllers/officialReceiptController');
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

test('owner cannot create a payment for another owner\'s pet', async () => {
  const mockConn = {
    query: async (sql, params) => {
      if (sql.includes('SELECT id FROM pet_owners WHERE user_id')) return [[{ id: 5 }]];
      if (sql.includes('SELECT id FROM official_receipts WHERE or_number')) return [[]];
      if (sql.includes('SELECT p.id, p.name FROM pets p')) return [[]]; // pet not found
      return [[]];
    },
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  };
  db.getConnection = async () => mockConn;

  const res = response();
  await officialReceiptController.createOfficialReceipt(
    {
      body: {
        or_number: 'OR-TEST-99',
        payment_date: '2026-08-20',
        items: [{ pet_id: 99, payment_type_id: 1 }],
      },
      user: { id: 1, role: 'Owner' },
    },
    res,
  );

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /not found or not yours/i);
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
