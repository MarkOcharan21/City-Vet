const test = require("node:test");
const assert = require("node:assert/strict");

const { buildEpisodeQuery } = require("../src/utils/vaccineEpisodes");

test("episode outcomes remain pending until the grace period has elapsed", () => {
  const sql = buildEpisodeQuery({ graceDays: 30 });
  assert.match(sql, /sr\.returned_same IS NULL AND CURRENT_DATE <= e\.next_due_date \+ 30 THEN 'Pending'/);
  assert.match(sql, /ar\.returned_any IS NULL AND CURRENT_DATE <= e\.next_due_date \+ 30 THEN 'Pending'/);
});

test("lost pets are excluded from vaccine follow-up compliance episodes", () => {
  const sql = buildEpisodeQuery({ graceDays: 30 });
  assert.match(sql, /COALESCE\(p\.is_lost, 0\) = 0/);
});
