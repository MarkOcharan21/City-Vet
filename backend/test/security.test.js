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
    if (sql.includes('UPDATE pets')) return [{ affectedRows: 0 }];
    throw new Error(`Unexpected query: ${sql}`);
  };

  const res = response();
  await petController.reportLost(
    { params: { id: '99' }, body: { last_seen: 'Pulo', reward: null }, user: { id: 1 } },
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

test('user directory creates an active staff account usable by staff login', async () => {
  const queries = [];
  db.query = async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes('SELECT id, role, full_name FROM users')) return [[]];
    if (sql.includes('INSERT INTO users')) return [{ insertId: 20 }];
    throw new Error(`Unexpected query: ${sql}`);
  };

  const res = response();
  await userController.createStaffUser(
    {
      body: {
        full_name: 'Mark Lawrence Ocharan',
        email: 'mark.staff@example.com',
        password: 'ValidPass1!',
        role_name: 'Staff',
      },
    },
    res,
  );

  const insert = queries.find(({ sql }) => sql.includes('INSERT INTO users'));
  assert.equal(insert.params[0], 'Staff');
  assert.equal(insert.params[3], 'Mark Lawrence Ocharan');
  assert.equal(insert.params[4], 'active');
  assert.equal(res.statusCode, 201);
});
