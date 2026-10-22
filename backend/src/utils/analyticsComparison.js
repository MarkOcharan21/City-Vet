/**
 * Shared analytics comparison core.
 *
 * The Analytics page needs one comparison engine that every metric can ride
 * on: registrations, vaccinations, consultations, QR issuance, revenue and
 * lost pets all have to answer the same two questions -- "how does this
 * period compare to the one before it" and "how does this year compare to
 * last year".
 *
 * This module holds the pure part of that engine: the metric catalogue, the
 * bucketing, the window totals and the delta maths. The database queries live
 * in `controllers/comparisonController.js`; keeping the maths here means it
 * can be unit tested without a database.
 *
 * Rows arrive in a single merged array with two shapes:
 *
 *   sum rows     { date: 'YYYY-MM-DD', doses: 3, registrations: 2, ... }
 *   distinct rows{ date: 'YYYY-MM-DD', pets: 'pet-12', owners: 'owner-4' }
 *
 * Sum rows add up. Distinct rows count unique ids inside a bucket, so a pet
 * vaccinated on three different days of the same month is one unique pet for
 * that month rather than three.
 */

const {
  aggregate,
  aggregateFlat,
  bucketAxis,
  pctChange,
} = require("./reportPeriods");

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Metrics whose day-level values are added up inside a bucket. */
const SUM_METRICS = [
  "registrations",
  "doses",
  "consultations",
  "qrIssued",
  "revenue",
  "lostPets",
  "newOwners",
  "evaluable",
  "onTime",
  "late",
  "lapsed",
  "noReturn",
];

/** Metrics counted as unique ids inside a bucket. */
const DISTINCT_METRICS = ["pets", "owners"];

/**
 * The metric catalogue. `invert` marks metrics where a drop is the good
 * news (fewer lost pets), so the UI can colour the badge accordingly.
 */
const METRICS = [
  { key: "registrations", label: "New Pet Registrations", unit: "count" },
  { key: "doses", label: "Vaccine Doses Administered", unit: "count" },
  { key: "pets", label: "Unique Pets Vaccinated", unit: "count" },
  { key: "owners", label: "Unique Owners Served", unit: "count" },
  { key: "consultations", label: "Consultations", unit: "count" },
  { key: "qrIssued", label: "QR Codes Issued", unit: "count" },
  { key: "revenue", label: "Revenue Collected", unit: "currency" },
  { key: "lostPets", label: "Lost Pets", unit: "count", invert: true },
  { key: "newOwners", label: "New Pet Owners", unit: "count" },
];

/** Derived metrics, computed from the summed counters. */
const RATE_METRICS = ["onTimeRate"];

const ALL_METRIC_KEYS = [...SUM_METRICS, ...DISTINCT_METRICS, ...RATE_METRICS];

/** The metric the headline bar chart and the series delta columns use. */
const DEFAULT_PRIMARY_METRIC = "doses";

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function emptyMetrics() {
  const entry = {};
  for (const key of ALL_METRIC_KEYS) entry[key] = 0;
  return entry;
}

/** Attach the derived rate to a metric bundle. */
function withRates(entry) {
  return {
    ...entry,
    onTimeRate: entry.evaluable ? round((entry.onTime / entry.evaluable) * 100) : 0,
  };
}

/**
 * Build the metric bundle for a set of buckets.
 * @param {Array<object>} buckets buckets produced by `aggregate`
 */
function metricsOf(buckets) {
  const totals = emptyMetrics();
  for (const bucket of buckets || []) {
    for (const key of SUM_METRICS) {
      totals[key] = (Number(totals[key]) || 0) + (Number(bucket[key]) || 0);
    }
  }
  return withRates(totals);
}

/**
 * The metric bundle for a whole date range.
 *
 * The distinct metrics are counted across the entire range, not summed from
 * the buckets, so a pet appearing in two months of the window is one pet.
 */
function rangeTotals(rows, range) {
  const inRange = (rows || []).filter(
    (row) => row.date >= range.from && row.date <= range.to
  );
  return withRates(
    aggregateFlat(inRange, { sum: SUM_METRICS, distinct: DISTINCT_METRICS })
  );
}

/**
 * A zero-filled series aligned to the bucket axis of a range, so the current
 * window and the baseline line up one-to-one.
 */
function buildSeries(rows, range, granularity, windowCount) {
  const inRange = (rows || []).filter(
    (row) => row.date >= range.from && row.date <= range.to
  );
  const rolled = aggregate(inRange, granularity, {
    sum: SUM_METRICS,
    distinct: DISTINCT_METRICS,
  });
  const byKey = new Map(rolled.map((bucket) => [bucket.key, bucket]));

  return bucketAxis(range, granularity, windowCount).map((slot) => {
    const data = byKey.get(slot.key);
    const entry = { key: slot.key, label: slot.label, start: slot.start, sort: slot.sort };
    for (const key of SUM_METRICS) entry[key] = data ? Number(data[key]) || 0 : 0;
    for (const key of DISTINCT_METRICS) entry[key] = data ? Number(data[key]) || 0 : 0;
    return withRates(entry);
  });
}

/**
 * The delta of every metric between two metric bundles.
 * @returns {Object<string, {delta: number|null, pctChange: number|null}>}
 */
function metricDeltas(current, baseline) {
  const deltas = {};
  for (const key of ALL_METRIC_KEYS) {
    const change = pctChange(current[key], baseline[key]);
    deltas[key] = { delta: change.delta, pctChange: change.pct };
  }
  return deltas;
}

/**
 * Every year on record, with the change against the year before it.
 */
function buildYearly(rows, primaryMetric) {
  const buckets = aggregate(rows, "yearly", {
    sum: SUM_METRICS,
    distinct: DISTINCT_METRICS,
  });

  return buckets.map((bucket, index) => {
    const entry = withRates(bucket);
    const previous = index > 0 ? withRates(buckets[index - 1]) : null;
    const deltas = {};

    for (const key of ALL_METRIC_KEYS) {
      const change = previous
        ? pctChange(entry[key], previous[key])
        : { delta: null, pct: null };
      deltas[key] = { delta: change.delta, pctChange: change.pct };
    }

    return {
      year: entry.key,
      ...entry,
      delta: deltas[primaryMetric].delta,
      pctChange: deltas[primaryMetric].pctChange,
      deltas,
    };
  });
}

/**
 * A year-by-month matrix for every metric.
 *
 * The grouped bar charts need one series per year over a Jan..Dec axis, which
 * is exactly this shape: `values[metric][year][monthName]`.
 */
function buildMatrix(rows) {
  const monthly = aggregate(rows, "monthly", {
    sum: SUM_METRICS,
    distinct: DISTINCT_METRICS,
  });

  const years = Array.from(
    new Set(monthly.map((bucket) => bucket.key.slice(0, 4)))
  ).sort();

  const values = {};
  for (const metric of ALL_METRIC_KEYS) {
    values[metric] = {};
    for (const year of years) {
      values[metric][year] = {};
      for (const month of MONTH_LABELS) values[metric][year][month] = 0;
    }
  }

  for (const bucket of monthly) {
    const year = bucket.key.slice(0, 4);
    const month = MONTH_LABELS[Number(bucket.key.slice(5)) - 1];
    if (!month) continue;
    const entry = withRates(bucket);
    for (const metric of ALL_METRIC_KEYS) {
      values[metric][year][month] = Number(entry[metric]) || 0;
    }
  }

  return { months: MONTH_LABELS, years, values };
}

/**
 * Build the whole comparison payload.
 *
 * @param {object} params
 * @param {Array<object>} params.rows merged day-level rows
 * @param {string} params.granularity daily | weekly | monthly | yearly
 * @param {string} params.compare previous | previousYear
 * @param {{from: string, to: string}} params.currentRange
 * @param {{from: string, to: string}} params.baselineRange
 * @param {number} params.windowCount buckets per side
 * @param {string} params.currentLabel
 * @param {string} params.baselineLabel
 * @param {string} [params.primaryMetric]
 */
function buildComparison({
  rows,
  granularity,
  compare,
  currentRange,
  baselineRange,
  windowCount,
  currentLabel,
  baselineLabel,
  primaryMetric = DEFAULT_PRIMARY_METRIC,
}) {
  const currentSeries = buildSeries(rows, currentRange, granularity, windowCount);
  const baselineSeries = buildSeries(rows, baselineRange, granularity, windowCount);

  const currentTotals = rangeTotals(rows, currentRange);
  const baselineTotals = rangeTotals(rows, baselineRange);
  const totals = {
    current: currentTotals,
    baseline: baselineTotals,
  };
  for (const key of ALL_METRIC_KEYS) {
    totals[key] = {
      delta: pctChange(currentTotals[key], baselineTotals[key]).delta,
      pctChange: pctChange(currentTotals[key], baselineTotals[key]).pct,
    };
  }

  // Align the two axes one-to-one. The baseline can be shorter when the data
  // simply does not reach that far back.
  const series = [];
  const length = Math.max(currentSeries.length, baselineSeries.length);
  for (let i = 0; i < length; i += 1) {
    const current = currentSeries[i] || null;
    const baseline = baselineSeries[i] || null;
    if (!current && !baseline) continue;

    const currentValue = current ? current[primaryMetric] : 0;
    const baselineValue = baseline ? baseline[primaryMetric] : 0;
    const change = pctChange(currentValue, baselineValue);

    series.push({
      key: current ? current.key : `baseline-${i}`,
      label: current ? current.label : baseline.label,
      baselineKey: baseline ? baseline.key : null,
      baselineLabel: baseline ? baseline.label : "No data",
      current,
      baseline,
      delta: change.delta,
      pctChange: change.pct,
      deltas: metricDeltas(current || emptyMetrics(), baseline || emptyMetrics()),
    });
  }

  return {
    granularity,
    compare,
    windows: windowCount,
    primaryMetric,
    metrics: METRICS,
    current: { ...currentRange, label: currentLabel, partial: isPartialWindow(currentRange, granularity) },
    baseline: { ...baselineRange, label: baselineLabel, partial: isPartialWindow(baselineRange, granularity) },
    totals,
    series,
    yearly: buildYearly(rows, primaryMetric),
    matrix: buildMatrix(rows),
  };
}

function isPartialWindow(range, granularity) {
  if (granularity === "daily") return false;
  const start = new Date(`${range.from}T00:00:00`);
  const end = new Date(`${range.to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  if (granularity === "weekly") return start.getDay() !== 1 || end.getDay() !== 0;
  if (granularity === "monthly") {
    return start.getDate() !== 1 || end.getDate() !== new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
  }
  return start.getMonth() !== 0 || start.getDate() !== 1 || end.getMonth() !== 11 || end.getDate() !== 31;
}

module.exports = {
  METRICS,
  SUM_METRICS,
  DISTINCT_METRICS,
  RATE_METRICS,
  ALL_METRIC_KEYS,
  DEFAULT_PRIMARY_METRIC,
  MONTH_LABELS,
  buildComparison,
  buildSeries,
  buildMatrix,
  buildYearly,
  rangeTotals,
  metricDeltas,
  withRates,
  emptyMetrics,
  round,
  isPartialWindow,
};
