/**
 * Period math for the Analytics & Reports page.
 *
 * Everything here is plain JavaScript on purpose: the analytics queries run on
 * both MySQL and PostgreSQL, and neither engine agrees on how to bucket a week
 * or order a month label. Bucketing in JS guarantees chronological ordering and
 * identical behaviour on both dialects.
 *
 * Weeks are Monday-based, matching `mondayIndex()` in `config/sql.js` (which
 * the existing "This Week" filter already uses).
 */

const GRANULARITIES = ["daily", "weekly", "monthly", "yearly"];

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function normalizeGranularity(value) {
  return GRANULARITIES.includes(value) ? value : "monthly";
}

function normalizeCompare(value) {
  return value === "previousYear" ? "previousYear" : "previous";
}

/** Parse a `YYYY-MM-DD` string into a local Date at midnight, or null. */
function parseISODate(value) {
  if (!value || typeof value !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(date.getTime())) return null;
  // Reject impossible dates (e.g. 2026-02-30) by round-tripping.
  if (date.getFullYear() !== Number(m[1]) || date.getMonth() !== Number(m[2]) - 1) {
    return null;
  }
  return date;
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const day = new Date(date.getTime());
  const dow = day.getDay(); // 0 = Sunday
  const offset = (dow + 6) % 7; // Monday-based
  return startOfDay(addDays(day, -offset));
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function endOfYear(date) {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

/**
 * Resolve the current reporting window for a granularity.
 * @param {'daily'|'weekly'|'monthly'|'yearly'} granularity
 * @param {Date} anchor the reference date (defaults to today)
 * @returns {{from: string, to: string, label: string}}
 */
function resolvePeriod(granularity, anchor = new Date()) {
  const g = normalizeGranularity(granularity);
  const ref = anchor instanceof Date && !Number.isNaN(anchor.getTime())
    ? anchor
    : new Date();

  let from;
  let to;
  let label;

  switch (g) {
    case "daily":
      from = startOfDay(ref);
      to = endOfDay(ref);
      label = toISODate(from);
      break;
    case "weekly": {
      from = startOfWeek(ref);
      to = endOfDay(addDays(from, 6));
      label = `Week of ${toISODate(from)}`;
      break;
    }
    case "monthly":
      from = startOfMonth(ref);
      to = endOfMonth(ref);
      label = `${MONTH_LABELS[ref.getMonth()]} ${ref.getFullYear()}`;
      break;
    case "yearly":
    default:
      from = startOfYear(ref);
      to = endOfYear(ref);
      label = String(ref.getFullYear());
      break;
  }

  return { from: toISODate(from), to: toISODate(to), label };
}

/**
 * Move a date by whole years, clamping the day to the target month so that
 * 29 Feb lands on 28 Feb instead of rolling forward into March.
 */
function shiftYears(date, delta) {
  const result = new Date(date.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setFullYear(result.getFullYear() + delta);
  const daysInMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, daysInMonth));
  return result;
}

/**
 * Shift a window backwards for the comparison baseline.
 *
 * `previous`      -> the calendar window immediately before this one
 *                    (previous day / previous week / previous month / previous year)
 * `previousYear`  -> the same calendar window one year earlier
 *
 * @param {{from: string, to: string, label: string}} period
 * @param {'previous'|'previousYear'} mode
 * @param {'daily'|'weekly'|'monthly'|'yearly'} granularity
 * @returns {{from: string, to: string, label: string}}
 */
function shiftPeriod(period, mode, granularity) {
  const compare = normalizeCompare(mode);
  const g = normalizeGranularity(granularity);
  const from = parseISODate(period.from);
  const to = parseISODate(period.to);
  if (!from || !to) return { ...period };

  if (compare === "previousYear") {
    const prevFrom = shiftYears(from, -1);
    const prevTo = shiftYears(to, -1);
    return {
      from: toISODate(prevFrom),
      to: toISODate(prevTo),
      label: `Same period, ${prevFrom.getFullYear()}`,
    };
  }

  switch (g) {
    case "daily": {
      const prev = addDays(from, -1);
      return { from: toISODate(prev), to: toISODate(prev), label: "Previous day" };
    }
    case "weekly": {
      const prevFrom = addDays(from, -7);
      const prevTo = addDays(to, -7);
      return {
        from: toISODate(prevFrom),
        to: toISODate(prevTo),
        label: `Week of ${toISODate(prevFrom)}`,
      };
    }
    case "monthly": {
      const prevFrom = new Date(from.getFullYear(), from.getMonth() - 1, 1);
      const prevTo = new Date(from.getFullYear(), from.getMonth(), 0, 23, 59, 59, 999);
      return {
        from: toISODate(prevFrom),
        to: toISODate(prevTo),
        label: `${MONTH_LABELS[prevFrom.getMonth()]} ${prevFrom.getFullYear()}`,
      };
    }
    case "yearly":
    default: {
      const prevFrom = new Date(from.getFullYear() - 1, 0, 1);
      const prevTo = new Date(from.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return {
        from: toISODate(prevFrom),
        to: toISODate(prevTo),
        label: String(from.getFullYear() - 1),
      };
    }
  }
}

/**
 * The bucket a date belongs to for a given granularity.
 * @returns {{key: string, label: string, sort: number, start: string}}
 */
function bucketKey(date, granularity) {
  const g = normalizeGranularity(granularity);
  const d = date instanceof Date ? date : parseISODate(date);
  if (!d) return null;

  if (g === "daily") {
    const iso = toISODate(d);
    return { key: iso, label: `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`, sort: d.getTime(), start: iso };
  }

  if (g === "weekly") {
    const start = startOfWeek(d);
    const end = addDays(start, 6);
    const iso = toISODate(start);
    const endLabel = end.getMonth() === start.getMonth()
      ? String(end.getDate())
      : `${MONTH_LABELS[end.getMonth()]} ${end.getDate()}`;
    return {
      key: iso,
      label: `${MONTH_LABELS[start.getMonth()]} ${start.getDate()}-${endLabel}`,
      sort: start.getTime(),
      start: iso,
    };
  }

  if (g === "yearly") {
    const year = d.getFullYear();
    return { key: String(year), label: String(year), sort: year, start: `${year}-01-01` };
  }

  const year = d.getFullYear();
  const month = d.getMonth();
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  return {
    key,
    label: `${MONTH_LABELS[month]} ${year}`,
    sort: new Date(year, month, 1).getTime(),
    start: `${key}-01`,
  };
}

/**
 * Roll date-level rows up into buckets.
 *
 * `sum` metrics are added up. `distinct` metrics count the number of unique
 * ids seen inside the bucket, which is NOT the same as summing a per-day
 * distinct count: a pet vaccinated on three different days of the same month
 * is one unique pet for that month, not three.
 *
 * @param {Array<{date: string, ...metrics}>} rows date-level rows
 * @param {'daily'|'weekly'|'monthly'|'yearly'} granularity
 * @param {object} [spec]
 * @param {string[]} [spec.sum] numeric fields to add up
 * @param {string[]} [spec.distinct] fields holding an id to count uniquely
 * @returns {Array<{key,label,start,sort, ...metrics}>} chronologically ordered
 */
function aggregate(rows, granularity, spec = {}) {
  const sumKeys = spec.sum || [];
  const distinctKeys = spec.distinct || [];
  const buckets = new Map();

  for (const row of rows || []) {
    const date = parseISODate(row.date);
    if (!date) continue;
    const bucket = bucketKey(date, granularity);
    if (!bucket) continue;

    if (!buckets.has(bucket.key)) {
      const entry = { key: bucket.key, label: bucket.label, start: bucket.start, sort: bucket.sort };
      for (const key of sumKeys) entry[key] = 0;
      for (const key of distinctKeys) entry[key] = 0;
      buckets.set(bucket.key, entry);
    }

    const entry = buckets.get(bucket.key);

    for (const key of sumKeys) {
      entry[key] = (Number(entry[key]) || 0) + (Number(row[key]) || 0);
    }

    for (const key of distinctKeys) {
      const value = row[key];
      if (value === null || value === undefined || value === "") continue;
      // Kept off the entry until the bucket is finalised, so the id sets never
      // leak into the JSON payload.
      if (!entry.distinctSets) entry.distinctSets = new Map();
      let set = entry.distinctSets.get(key);
      if (!set) {
        set = new Set();
        entry.distinctSets.set(key, set);
      }
      set.add(String(value));
    }
  }

  const result = [];
  for (const entry of buckets.values()) {
    if (entry.distinctSets) {
      for (const key of distinctKeys) {
        const set = entry.distinctSets.get(key);
        entry[key] = set ? set.size : 0;
      }
    }
    delete entry.distinctSets;
    result.push(entry);
  }

  return result.sort((a, b) => a.sort - b.sort);
}

/**
 * Aggregate a set of rows into a single total, ignoring time entirely.
 *
 * Used for window totals: the "unique pets" of a three-month window is the
 * number of distinct pets anywhere in that window, not the sum of the monthly
 * unique-pet counts.
 *
 * @param {Array<object>} rows rows carrying a `date` plus the metric fields
 * @param {object} [spec]
 * @param {string[]} [spec.sum] numeric fields to add up
 * @param {string[]} [spec.distinct] fields holding an id to count uniquely
 */
function aggregateFlat(rows, spec = {}) {
  const sumKeys = spec.sum || [];
  const distinctKeys = spec.distinct || [];
  const total = {};
  for (const key of sumKeys) total[key] = 0;
  for (const key of distinctKeys) total[key] = 0;

  const sets = new Map();
  for (const row of rows || []) {
    for (const key of sumKeys) {
      total[key] = (Number(total[key]) || 0) + (Number(row[key]) || 0);
    }
    for (const key of distinctKeys) {
      const value = row[key];
      if (value === null || value === undefined || value === "") continue;
      if (!sets.has(key)) sets.set(key, new Set());
      sets.get(key).add(String(value));
    }
  }

  for (const key of distinctKeys) {
    total[key] = sets.has(key) ? sets.get(key).size : 0;
  }

  return total;
}

/**
 * Roll date-level rows up into buckets, adding up every listed metric.
 *
 * @param {Array<{date: string, ...metrics}>} rows date-level aggregates
 * @param {'daily'|'weekly'|'monthly'|'yearly'} granularity
 * @param {string[]} metricKeys numeric fields to sum
 * @returns {Array<{key,label,start,sort, ...metrics}>} chronologically ordered
 */
function rollUp(rows, granularity, metricKeys) {
  return aggregate(rows, granularity, { sum: metricKeys });
}

/**
 * Start of the bucket `delta` steps away from the anchor.
 * delta is negative to look back (e.g. -1 = previous month).
 */
function shiftBuckets(anchor, granularity, delta) {
  const g = normalizeGranularity(granularity);
  const ref = anchor instanceof Date && !Number.isNaN(anchor.getTime())
    ? anchor
    : parseISODate(anchor) || new Date();

  switch (g) {
    case "daily":
      return addDays(startOfDay(ref), delta);
    case "weekly":
      return addDays(startOfWeek(ref), delta * 7);
    case "monthly":
      return new Date(ref.getFullYear(), ref.getMonth() + delta, 1);
    case "yearly":
    default:
      return new Date(ref.getFullYear() + delta, 0, 1);
  }
}

/** Inclusive date range covered by the `count` buckets ending at the anchor. */
function trailingRange(anchor, granularity, count) {
  const g = normalizeGranularity(granularity);
  const ref = anchor instanceof Date && !Number.isNaN(anchor.getTime())
    ? anchor
    : parseISODate(anchor) || new Date();

  const from = shiftBuckets(ref, g, -(Math.max(1, count) - 1));

  let to;
  switch (g) {
    case "daily":
      to = endOfDay(ref);
      break;
    case "weekly":
      to = endOfDay(addDays(startOfWeek(ref), 6));
      break;
    case "monthly":
      to = endOfMonth(ref);
      break;
    case "yearly":
    default:
      to = endOfYear(ref);
      break;
  }

  return { from: toISODate(from), to: toISODate(to) };
}

/**
 * The baseline window the current window is compared against.
 *
 * `previous`     -> the `count` buckets immediately before the current window
 * `previousYear` -> the current window shifted back exactly one year
 */
function baselineRange(anchor, granularity, count, compare) {
  const g = normalizeGranularity(granularity);

  if (normalizeCompare(compare) === "previousYear") {
    const current = trailingRange(anchor, g, count);
    const from = shiftYears(parseISODate(current.from), -1);
    const to = shiftYears(parseISODate(current.to), -1);
    return { from: toISODate(from), to: toISODate(to) };
  }

  const previousAnchor = shiftBuckets(anchor, g, -Math.max(1, count));
  return trailingRange(previousAnchor, g, count);
}

/** How many buckets a comparison window shows for a granularity. */
const DEFAULT_WINDOW_SIZE = {
  daily: 14,
  weekly: 8,
  monthly: 6,
  yearly: 4,
};

function windowSize(granularity, override) {
  const parsed = Number(override);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 60) return Math.trunc(parsed);
  return DEFAULT_WINDOW_SIZE[normalizeGranularity(granularity)];
}

/**
 * Every bucket slot covered by a date range, oldest first.
 *
 * Slots without data are included on purpose: the comparison chart needs a
 * stable axis so the current window and the baseline line up one-to-one, even
 * on days where nothing happened.
 *
 * @param {{from: string, to: string}} range
 * @param {'daily'|'weekly'|'monthly'|'yearly'} granularity
 * @param {number} [limit] keep only the newest `limit` slots
 */
function bucketAxis(range, granularity, limit) {
  const g = normalizeGranularity(granularity);
  const start = parseISODate(range.from);
  const end = parseISODate(range.to);
  if (!start || !end) return [];

  const axis = [];
  const last = shiftBuckets(end, g, 0);
  let cursor = shiftBuckets(start, g, 0);
  let guard = 0;

  while (cursor.getTime() <= last.getTime() && guard < 1000) {
    const bucket = bucketKey(cursor, g);
    if (bucket) axis.push({ ...bucket, index: axis.length });
    cursor = shiftBuckets(cursor, g, 1);
    guard += 1;
  }

  const max = Number(limit);
  if (Number.isFinite(max) && max > 0 && axis.length > max) {
    return axis.slice(axis.length - max);
  }
  return axis;
}

/**
 * Difference between two values plus the percentage change.
 * Returns nulls when the comparison is not meaningful (missing baseline).
 */
function pctChange(current, baseline) {
  const cur = Number(current);
  const base = Number(baseline);
  if (!Number.isFinite(cur) || !Number.isFinite(base)) {
    return { delta: null, pct: null };
  }
  const delta = cur - base;
  const pct = base === 0 ? (cur === 0 ? 0 : null) : base < 5 ? null : (delta / base) * 100;
  return {
    delta,
    pct: pct === null ? null : Math.round(pct * 10) / 10,
  };
}

/** Human label for a metric bundle, e.g. "This Month" vs "October 2026". */
function describeWindow(granularity, from, to) {
  const g = normalizeGranularity(granularity);
  const start = parseISODate(from);
  const end = parseISODate(to);
  if (!start || !end) return `${from} to ${to}`;

  if (g === "daily") return toISODate(start);
  if (g === "weekly") return `Week of ${toISODate(start)}`;
  if (g === "monthly") return `${MONTH_LABELS[start.getMonth()]} ${start.getFullYear()}`;
  if (g === "yearly") return String(start.getFullYear());
  return `${toISODate(start)} to ${toISODate(end)}`;
}

/** Short weekday label, used by the daily comparison chart. */
function weekdayLabel(date) {
  const d = date instanceof Date ? date : parseISODate(date);
  return d ? DAY_LABELS[d.getDay()] : "";
}

module.exports = {
  GRANULARITIES,
  MONTH_LABELS,
  DAY_LABELS,
  normalizeGranularity,
  normalizeCompare,
  parseISODate,
  toISODate,
  addDays,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfDay,
  endOfMonth,
  endOfYear,
  shiftYears,
  resolvePeriod,
  shiftPeriod,
  shiftBuckets,
  trailingRange,
  baselineRange,
  bucketAxis,
  windowSize,
  DEFAULT_WINDOW_SIZE,
  bucketKey,
  rollUp,
  aggregate,
  aggregateFlat,
  pctChange,
  describeWindow,
  weekdayLabel,
};
