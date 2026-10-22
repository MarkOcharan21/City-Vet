const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildEpisodeQuery,
  buildServiceEventsCTE,
} = require("../src/utils/vaccineEpisodes");
const db = require("../src/config/db");
const { loadDayRows } = require("../src/controllers/comparisonController");
const { getReturnRate } = require("../src/controllers/complianceController");

const originalQuery = db.query;

test.afterEach(() => {
  db.query = originalQuery;
});

test("synthetic episodes are excluded by default from compliance queries", () => {
  const query = buildEpisodeQuery({ graceDays: 30 });

  assert.match(query, /COALESCE\(LEFT\(p\.pet_code, 9\), ''\) <> 'ANL-2025-'/);
  assert.match(query, /COALESCE\(LEFT\(vr\.comments, 20\), ''\) <> 'ANALYTICS_SEED_2025:'/);
  assert.match(buildServiceEventsCTE(), /ANL-2025-/);
});

test("synthetic episodes can be explicitly included in compliance queries", () => {
  const query = buildEpisodeQuery({ graceDays: 30, includeSynthetic: true });

  assert.doesNotMatch(query, /ANL-2025-|ANALYTICS_SEED_2025:/);
  assert.doesNotMatch(buildServiceEventsCTE(true), /ANL-2025-|ANALYTICS_SEED_2025:/);
});

test("comparison metrics exclude synthetic data by default and include it only by opt-in", async () => {
  const queries = [];
  db.query = async (sql) => {
    queries.push(sql);
    return [[], []];
  };

  await loadDayRows({ includeEpisodes: false });
  assert.equal(queries.length, 8);
  assert.ok(queries.slice(0, 7).every((sql) => sql.includes("ANL-2025-") || sql.includes("ANALYTICS_SEED_2025:")));
  assert.match(queries[7], /Analytics Seed Owner/);

  queries.length = 0;
  await loadDayRows({ includeEpisodes: false, includeSynthetic: true });
  assert.equal(queries.length, 8);
  assert.ok(queries.every((sql) => !/ANL-2025-|ANALYTICS_SEED_2025:|Analytics Seed Owner/.test(sql)));
});

test("service-return queries use the same default-off synthetic filter", async () => {
  const queries = [];
  db.query = async (sql) => {
    queries.push(sql);
    return [[], []];
  };
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };

  await getReturnRate({ query: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(queries.length, 2);
  assert.ok(queries.every((sql) => sql.includes("ANL-2025-")));
  assert.ok(queries[0].includes("ANALYTICS_SEED_2025:"));
});
