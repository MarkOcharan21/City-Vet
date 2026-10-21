const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolvePeriod,
  shiftPeriod,
  bucketKey,
  rollUp,
  pctChange,
  parseISODate,
  toISODate,
  normalizeGranularity,
  normalizeCompare,
} = require('../src/utils/reportPeriods');

test('resolvePeriod builds a daily window', () => {
  const period = resolvePeriod('daily', new Date(2026, 9, 21));
  assert.equal(period.from, '2026-10-21');
  assert.equal(period.to, '2026-10-21');
  assert.equal(period.label, '2026-10-21');
});

test('resolvePeriod builds a Monday-based weekly window', () => {
  // 2026-10-21 is a Wednesday; the week runs Mon 2026-10-19 .. Sun 2026-10-25.
  const period = resolvePeriod('weekly', new Date(2026, 9, 21));
  assert.equal(period.from, '2026-10-19');
  assert.equal(period.to, '2026-10-25');
  assert.equal(period.label, 'Week of 2026-10-19');
});

test('resolvePeriod week starting on a Monday stays on that Monday', () => {
  const period = resolvePeriod('weekly', new Date(2026, 9, 19));
  assert.equal(period.from, '2026-10-19');
  assert.equal(period.to, '2026-10-25');
});

test('resolvePeriod builds a monthly window that spans the whole month', () => {
  const period = resolvePeriod('monthly', new Date(2026, 9, 21));
  assert.equal(period.from, '2026-10-01');
  assert.equal(period.to, '2026-10-31');
  assert.equal(period.label, 'Oct 2026');
});

test('resolvePeriod builds a yearly window', () => {
  const period = resolvePeriod('yearly', new Date(2026, 9, 21));
  assert.equal(period.from, '2026-01-01');
  assert.equal(period.to, '2026-12-31');
  assert.equal(period.label, '2026');
});

test('resolvePeriod handles February in a leap year', () => {
  const period = resolvePeriod('monthly', new Date(2028, 1, 10));
  assert.equal(period.from, '2028-02-01');
  assert.equal(period.to, '2028-02-29');
});

test('shiftPeriod moves a monthly window to the previous calendar month', () => {
  const current = resolvePeriod('monthly', new Date(2026, 9, 21));
  const baseline = shiftPeriod(current, 'previous', 'monthly');
  assert.equal(baseline.from, '2026-09-01');
  assert.equal(baseline.to, '2026-09-30');
  assert.equal(baseline.label, 'Sep 2026');
});

test('shiftPeriod moves a yearly window to the previous year', () => {
  const current = resolvePeriod('yearly', new Date(2026, 9, 21));
  const baseline = shiftPeriod(current, 'previous', 'yearly');
  assert.equal(baseline.from, '2025-01-01');
  assert.equal(baseline.to, '2025-12-31');
  assert.equal(baseline.label, '2025');
});

test('shiftPeriod moves a daily window to the previous day', () => {
  const current = resolvePeriod('daily', new Date(2026, 9, 21));
  const baseline = shiftPeriod(current, 'previous', 'daily');
  assert.equal(baseline.from, '2026-10-20');
  assert.equal(baseline.to, '2026-10-20');
});

test('shiftPeriod moves a weekly window to the previous week', () => {
  const current = resolvePeriod('weekly', new Date(2026, 9, 21));
  const baseline = shiftPeriod(current, 'previous', 'weekly');
  assert.equal(baseline.from, '2026-10-12');
  assert.equal(baseline.to, '2026-10-18');
});

test('shiftPeriod moves a window to the same period last year', () => {
  const current = resolvePeriod('monthly', new Date(2026, 9, 21));
  const baseline = shiftPeriod(current, 'previousYear', 'monthly');
  assert.equal(baseline.from, '2025-10-01');
  assert.equal(baseline.to, '2025-10-31');
  assert.equal(baseline.label, 'Same period, 2025');
});

test('shiftPeriod keeps Feb 29 aligned when the baseline year is not a leap year', () => {
  const current = { from: '2024-02-29', to: '2024-02-29', label: '2024-02-29' };
  const baseline = shiftPeriod(current, 'previousYear', 'daily');
  assert.equal(baseline.from, '2023-02-28');
  assert.equal(baseline.to, '2023-02-28');
});

test('bucketKey groups weekdays into the same Monday-based week', () => {
  const monday = bucketKey('2026-10-19', 'weekly');
  const sunday = bucketKey('2026-10-25', 'weekly');
  const nextMonday = bucketKey('2026-10-26', 'weekly');
  assert.equal(monday.key, '2026-10-19');
  assert.equal(sunday.key, '2026-10-19');
  assert.equal(nextMonday.key, '2026-10-26');
});

test('bucketKey keeps months and years in chronological order', () => {
  const apr2025 = bucketKey('2025-04-10', 'monthly');
  const apr2026 = bucketKey('2026-04-10', 'monthly');
  assert.equal(apr2025.key, '2025-04');
  assert.equal(apr2026.key, '2026-04');
  assert.ok(apr2025.sort < apr2026.sort);
});

test('rollUp sums date-level rows into monthly buckets in chronological order', () => {
  const rows = [
    { date: '2026-04-02', doses: 3 },
    { date: '2026-03-11', doses: 5 },
    { date: '2026-04-20', doses: 4 },
    { date: '2025-12-31', doses: 1 },
  ];
  const buckets = rollUp(rows, 'monthly', ['doses']);
  assert.deepEqual(
    buckets.map((b) => b.key),
    ['2025-12', '2026-03', '2026-04']
  );
  assert.equal(buckets[2].doses, 7);
  assert.equal(buckets[2].label, 'Apr 2026');
});

test('rollUp keeps a full year of monthly labels sorted across years', () => {
  const rows = [
    { date: '2026-04-02', doses: 1 },
    { date: '2025-04-02', doses: 1 },
    { date: '2025-08-02', doses: 1 },
    { date: '2026-08-02', doses: 1 },
  ];
  const buckets = rollUp(rows, 'monthly', ['doses']);
  assert.deepEqual(
    buckets.map((b) => b.key),
    ['2025-04', '2025-08', '2026-04', '2026-08']
  );
});

test('pctChange computes delta and percentage', () => {
  assert.deepEqual(pctChange(120, 100), { delta: 20, pct: 20 });
  assert.deepEqual(pctChange(80, 100), { delta: -20, pct: -20 });
});

test('pctChange returns a null percentage when the baseline is zero', () => {
  assert.deepEqual(pctChange(5, 0), { delta: 5, pct: null });
  assert.deepEqual(pctChange(0, 0), { delta: 0, pct: 0 });
});

test('normalize helpers fall back to safe defaults', () => {
  assert.equal(normalizeGranularity('weekly'), 'weekly');
  assert.equal(normalizeGranularity('hourly'), 'monthly');
  assert.equal(normalizeCompare('previousYear'), 'previousYear');
  assert.equal(normalizeCompare('nonsense'), 'previous');
});

test('parseISODate rejects impossible dates and toISODate round-trips', () => {
  assert.equal(parseISODate('2026-02-30'), null);
  assert.equal(parseISODate('not-a-date'), null);
  const date = parseISODate('2026-10-21');
  assert.equal(toISODate(date), '2026-10-21');
});
