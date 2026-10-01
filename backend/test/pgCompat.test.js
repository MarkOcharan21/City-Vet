const test = require('node:test');
const assert = require('node:assert');
const { translate, buildResult, normalizeValue } = require('../src/config/pgCompat');

test('plain placeholders become numbered params in order', () => {
  const r = translate('SELECT * FROM users WHERE id = ? AND email = ?', [7, 'a@b.c']);
  assert.equal(r.text, 'SELECT * FROM users WHERE id = $1 AND email = $2');
  assert.deepEqual(r.values, [7, 'a@b.c']);
});

test('? inside string literals is left alone', () => {
  const r = translate("SELECT * FROM pets WHERE name LIKE '%?%' AND id = ?", [5]);
  assert.equal(
    r.text,
    'SELECT * FROM pets WHERE name COLLATE "und-x-icu" ILIKE \'%?%\' AND id = $1'
  );
  assert.deepEqual(r.values, [5]);
});

test('LIKE becomes ILIKE pinned to a deterministic collation', () => {
  // The "ci" collation is nondeterministic, which PostgreSQL refuses to use for
  // pattern matching, so the operand gets an explicit deterministic collation.
  const r = translate('SELECT id FROM pets WHERE name LIKE ?', ['%a%']);
  assert.equal(r.text, 'SELECT id FROM pets WHERE name COLLATE "und-x-icu" ILIKE $1');
  assert.deepEqual(r.values, ['%a%']);
});

test('every LIKE in a multi-clause query is rewritten', () => {
  const r = translate('SELECT id FROM pets WHERE name LIKE ? OR code LIKE ? OR x = ?', [
    '%a%',
    '%b%',
    1,
  ]);
  assert.equal(
    r.text,
    'SELECT id FROM pets WHERE name COLLATE "und-x-icu" ILIKE $1 ' +
      'OR code COLLATE "und-x-icu" ILIKE $2 OR x = $3'
  );
});

test('the word LIKE inside a string literal is not rewritten', () => {
  const r = translate("SELECT * FROM t WHERE note = 'LIKE this' AND a = ?", [1]);
  assert.equal(r.text, 'SELECT * FROM t WHERE note = \'LIKE this\' AND a = $1');
});

test('NOT LIKE is rejected rather than silently mistranslated', () => {
  assert.throws(() => translate("SELECT * FROM t WHERE a NOT LIKE ?", ['x']), /NOT LIKE/);
});

test('? inside quoted identifiers, line and block comments is left alone', () => {
  const r = translate('SELECT "we?ird" FROM t -- ? nope\n/* ? nope */ WHERE a = ?', [1]);
  assert.equal(r.text, 'SELECT "we?ird" FROM t -- ? nope\n/* ? nope */ WHERE a = $1');
  assert.equal(r.values.length, 1);
});

test('escaped quotes do not break the tokenizer', () => {
  const r = translate("SELECT 'it''s ? fine', `odd?col` FROM t WHERE a = ?", [3]);
  assert.equal(r.text, "SELECT 'it''s ? fine', `odd?col` FROM t WHERE a = $1");
  assert.equal(r.values.length, 1);
});

test('array param expands for IN (?)', () => {
  const r = translate('SELECT id FROM pets WHERE pet_owner_id IN (?)', [[1, 2, 3]]);
  assert.equal(r.text, 'SELECT id FROM pets WHERE pet_owner_id IN ($1, $2, $3)');
  assert.deepEqual(r.values, [1, 2, 3]);
});

test('empty array expands to NULL so IN () never matches', () => {
  const r = translate('SELECT id FROM pets WHERE pet_owner_id IN (?)', [[]]);
  assert.equal(r.text, 'SELECT id FROM pets WHERE pet_owner_id IN (NULL)');
  assert.deepEqual(r.values, []);
});

test('array expansion does not shift later placeholders', () => {
  const r = translate('SELECT * FROM t WHERE a IN (?) AND b = ? AND c = ?', [[9, 8], 'x', 'y']);
  assert.equal(r.text, 'SELECT * FROM t WHERE a IN ($1, $2) AND b = $3 AND c = $4');
  assert.deepEqual(r.values, [9, 8, 'x', 'y']);
});

test('LIMIT ? is inlined because pg forbids bound limits', () => {
  const r = translate('SELECT * FROM audit_logs ORDER BY id LIMIT ? OFFSET ?', [25, 50]);
  assert.equal(r.text, 'SELECT * FROM audit_logs ORDER BY id LIMIT 25 OFFSET 50');
  assert.deepEqual(r.values, []);
});

test('LIMIT with a non-placeholder count is untouched', () => {
  const r = translate('SELECT * FROM t LIMIT 10', []);
  assert.equal(r.text, 'SELECT * FROM t LIMIT 10');
});

test('MySQL "LIMIT offset, count" fails loudly instead of silently mis-paging', () => {
  assert.throws(
    () => translate('SELECT * FROM t LIMIT ?, ?', [20, 10]),
    /LIMIT <offset>, <count>/
  );
});

test('LIMIT rejects junk instead of interpolating it', () => {
  assert.throws(() => translate('SELECT * FROM t LIMIT ?', ['1; DROP TABLE users']), /LIMIT/);
  assert.throws(() => translate('SELECT * FROM t LIMIT ?', [-5]), /negative/);
});

test('too few / too many params fail loudly', () => {
  assert.throws(() => translate('SELECT * FROM t WHERE a = ? AND b = ?', [1]), /not enough/);
  assert.throws(() => translate('SELECT * FROM t WHERE a = ?', [1, 2]), /too many/);
});

test('booleans become 1/0 exactly like the mysql2 wire protocol', () => {
  const r = translate('UPDATE t SET active = ?, flag = ? WHERE id = ?', [true, false, 3]);
  assert.deepEqual(r.values, [1, 0, 3]);
});

test('undefined becomes null', () => {
  const r = translate('UPDATE t SET a = ?, b = ?', [undefined, 'x']);
  assert.deepEqual(r.values, [null, 'x']);
});

test('Date becomes a local wall-clock string, never an ISO/UTC string', () => {
  const d = new Date(2026, 8, 3, 14, 5, 9, 42); // local 14:05:09.042
  const r = translate('INSERT INTO t (created_at) VALUES (?)', [d]);
  assert.equal(r.values[0], '2026-09-03 14:05:09.042');
});

test('numeric columns keep numeric types', () => {
  const r = translate('INSERT INTO t (amount, lat) VALUES (?, ?)', [250.5, 14.5991]);
  assert.equal(r.values[0], 250.5);
  assert.equal(r.values[1], 14.5991);
});

test('insert detection ignores leading comments and whitespace', () => {
  assert.equal(translate('  /* note */ INSERT INTO t VALUES (?)', [1]).isInsert, true);
  assert.equal(translate('-- note\nUPDATE t SET a = ?', [1]).isInsert, false);
  assert.equal(translate('SELECT 1', []).isInsert, false);
});

test('result is array-destructurable like mysql2', () => {
  const res = buildResult({ rows: [{ id: 5 }], fields: [], rowCount: 1 }, true);
  const [rows, fields] = res;
  assert.deepEqual(fields, []);
  // mysql2 puts these on the rows array, which is what callers destructure
  assert.equal(rows.insertId, 5);
  assert.equal(rows.affectedRows, 1);
  assert.equal(res.insertId, 5);
  assert.equal(res.affectedRows, 1);
});

test('insertId is 0 for tables with no generated id', () => {
  assert.equal(buildResult({ rows: [{ id: 0 }], fields: [], rowCount: 1 }, true).insertId, 0);
  assert.equal(buildResult({ rows: [{}], fields: [], rowCount: 1 }, true).insertId, 0);
  assert.equal(buildResult({ rows: [], fields: [], rowCount: 0 }, true).insertId, 0);
});

test('update reports affectedRows and no insertId', () => {
  const res = buildResult({ rows: [], fields: [], rowCount: 3 }, false);
  assert.equal(res.affectedRows, 3);
  assert.equal(res.insertId, 0);
});

test('normalizeValue leaves strings, numbers and null alone', () => {
  assert.equal(normalizeValue('x'), 'x');
  assert.equal(normalizeValue(0), 0);
  assert.equal(normalizeValue(null), null);
});

test('native $n placeholders pass through with their params', () => {
  const { text, values } = translate('SELECT pg_try_advisory_lock($1) AS acquired', [
    '7316554209117334',
  ]);
  assert.equal(text, 'SELECT pg_try_advisory_lock($1) AS acquired');
  assert.deepEqual(values, ['7316554209117334']);
});

test('native $n params are still normalized', () => {
  const { values } = translate('SELECT * FROM t WHERE d = $1', [new Date(2026, 0, 2, 3, 4, 5)]);
  assert.deepEqual(values, ['2026-01-02 03:04:05.000']);
});

test('statement with no placeholders is left alone', () => {
  const { text, values } = translate('SELECT 1', []);
  assert.equal(text, 'SELECT 1');
  assert.deepEqual(values, []);
});

test('? inside a string literal does not count as a placeholder', () => {
  const { text, values } = translate('SELECT * FROM t WHERE a = ? AND b = ?', ['why?', 'ok']);
  assert.equal(text, 'SELECT * FROM t WHERE a = $1 AND b = $2');
  assert.deepEqual(values, ['why?', 'ok']);
});