const test = require("node:test");
const assert = require("node:assert/strict");

const {
  toDateRange,
  previousWindowRange,
  previousYearRange,
} = require("../src/controllers/comparisonController");
const { parseISODate } = require("../src/utils/reportPeriods");
const { isPartialWindow } = require("../src/utils/analyticsComparison");

test("monthly comparisons stop on the anchor and align the baseline to the same day", () => {
  const current = toDateRange(parseISODate("2026-10-22"), "monthly", 6);
  assert.deepEqual(current, { from: "2026-05-01", to: "2026-10-22" });
  assert.deepEqual(previousWindowRange(current, "monthly", 6), {
    from: "2025-11-01",
    to: "2026-04-22",
  });
});

test("year-over-year comparison uses the same year-to-date dates", () => {
  const current = toDateRange(parseISODate("2026-10-22"), "yearly", 1);
  assert.deepEqual(current, { from: "2026-01-01", to: "2026-10-22" });
  assert.deepEqual(previousYearRange(current), {
    from: "2025-01-01",
    to: "2025-10-22",
  });
});

test("daily and weekly windows preserve equal-length baseline periods", () => {
  const anchor = parseISODate("2026-10-21");
  const daily = toDateRange(anchor, "daily", 14);
  assert.deepEqual(daily, { from: "2026-10-08", to: "2026-10-21" });
  assert.deepEqual(previousWindowRange(daily, "daily", 14), {
    from: "2026-09-24",
    to: "2026-10-07",
  });

  test("partial ranges are detected at both boundaries", () => {
    assert.equal(isPartialWindow({ from: "2026-10-19", to: "2026-10-25" }, "weekly"), false);
    assert.equal(isPartialWindow({ from: "2026-10-21", to: "2026-10-25" }, "weekly"), true);
    assert.equal(isPartialWindow({ from: "2026-10-01", to: "2026-10-31" }, "monthly"), false);
    assert.equal(isPartialWindow({ from: "2026-10-01", to: "2026-10-22" }, "monthly"), true);
  });

  const weekly = toDateRange(anchor, "weekly", 2);
  assert.deepEqual(weekly, { from: "2026-10-12", to: "2026-10-21" });
  assert.deepEqual(previousWindowRange(weekly, "weekly", 2), {
    from: "2026-09-28",
    to: "2026-10-07",
  });
});
