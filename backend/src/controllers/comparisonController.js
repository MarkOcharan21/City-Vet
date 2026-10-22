const db = require("../config/db");
const { dateFormat } = require("../config/sql");
const {
  parseISODate,
  toISODate,
  addDays,
  normalizeGranularity,
  normalizeCompare,
  describeWindow,
  trailingRange,
  shiftYears,
  windowSize,
} = require("../utils/reportPeriods");
const {
  buildEpisodeQuery,
  DEFAULT_GRACE_DAYS,
  VACCINE_FILTER,
} = require("../utils/vaccineEpisodes");
const {
  buildComparison,
  METRICS,
  DEFAULT_PRIMARY_METRIC,
} = require("../utils/analyticsComparison");

// ---------------------------------------------------------------------------
// Period comparison engine
//
// GET /api/analytics/period-comparison
//
// Answers "how does this period compare with the one before it?" across every
// core analytics metric, at daily / weekly / monthly / yearly granularity.
//
// Every query below returns date-level rows and the bucketing happens in JS
// (in `utils/analyticsComparison.js`). That is deliberate: MySQL and
// PostgreSQL disagree about week boundaries and month labels, so the only way
// to get identical, chronologically correct buckets on both is to do it in
// one place after the data leaves the database.
// ---------------------------------------------------------------------------

const VALID_PRIMARY = new Set(METRICS.map((metric) => metric.key));

function resolvePrimary(value) {
  return VALID_PRIMARY.has(value) ? value : DEFAULT_PRIMARY_METRIC;
}

/** Limit a range to the anchor date so "this year" means year-to-date. */
function toDateRange(anchor, granularity, count) {
  const range = trailingRange(anchor, granularity, count);
  const today = toISODate(anchor);
  return range.to > today ? { ...range, to: today } : range;
}

/** The same window one year earlier, keeping the exact same length. */
function previousYearRange(range) {
  const from = shiftYears(parseISODate(range.from), -1);
  const to = shiftYears(parseISODate(range.to), -1);
  return { from: toISODate(from), to: toISODate(to) };
}

/** The equal-length window immediately before a custom range. */
function previousRange(range) {
  const start = parseISODate(range.from);
  const end = parseISODate(range.to);
  if (!start || !end) return range;
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const baselineTo = addDays(start, -1);
  const baselineFrom = addDays(baselineTo, -(days - 1));
  return { from: toISODate(baselineFrom), to: toISODate(baselineTo) };
}

async function countSyntheticSeedRecords(range) {
  const [[row]] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM pets p
       WHERE LEFT(p.pet_code, 9) = 'ANL-2025-'
         AND DATE(COALESCE(p.registration_date, DATE(p.created_at))) BETWEEN ? AND ?) AS pets,
      (SELECT COUNT(*) FROM vaccination_records vr
       WHERE LEFT(vr.comments, 20) = 'ANALYTICS_SEED_2025:'
         AND DATE(vr.date_administered) BETWEEN ? AND ?) AS vaccinations,
      (SELECT COUNT(*) FROM payment_monitoring pm
       WHERE LEFT(pm.payment_reference, 13) = 'ANL-2025-PAY-'
         AND DATE(COALESCE(pm.consultation_date, DATE(pm.created_at))) BETWEEN ? AND ?) AS payments
  `, [
    range.from, range.to,
    range.from, range.to,
    range.from, range.to,
  ]);
  return {
    pets: Number(row?.pets) || 0,
    vaccinations: Number(row?.vaccinations) || 0,
    payments: Number(row?.payments) || 0,
  };
}

function previousWindowRange(range, granularity, count) {
  const from = parseISODate(range.from);
  const to = parseISODate(range.to);
  if (!from || !to) return range;

  const shift = Math.max(1, count);
  if (granularity === "daily") {
    const baselineFrom = addDays(from, -shift);
    const baselineTo = addDays(to, -shift);
    return { from: toISODate(baselineFrom), to: toISODate(baselineTo) };
  }
  if (granularity === "weekly") {
    const offset = shift * 7;
    return {
      from: toISODate(addDays(from, -offset)),
      to: toISODate(addDays(to, -offset)),
    };
  }
  if (granularity === "monthly") {
    const shiftMonth = (date) => {
      const target = new Date(date.getFullYear(), date.getMonth() - shift, 1);
      const day = Math.min(date.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate());
      target.setDate(day);
      return target;
    };
    return { from: toISODate(shiftMonth(from)), to: toISODate(shiftMonth(to)) };
  }

  return {
    from: toISODate(shiftYears(from, -shift)),
    to: toISODate(shiftYears(to, -shift)),
  };
}

/**
 * Resolve the current and baseline windows for an explicit date range, used
 * by the dashboard when the user types a custom range instead of a preset.
 */
function windowsForCustomRange(from, to, compare) {
  const current = { from, to };
  return {
    current,
    baseline:
      normalizeCompare(compare) === "previousYear"
        ? previousYearRange(current)
        : previousRange(current),
  };
}

/**
 * Pull every metric as date-level rows.
 *
 * Rows are merged into a single array. Sum rows carry the counted metrics,
 * distinct rows carry the ids used to count unique pets/owners, and episode
 * rows carry the vaccine follow-up outcomes.
 */
async function loadDayRows({ includeEpisodes = true, includeSynthetic = false } = {}) {
  const petFilter = (alias) => includeSynthetic ? "" : `AND COALESCE(LEFT(${alias}.pet_code, 9), '') <> 'ANL-2025-'`;
  const vaccinationFilter = includeSynthetic ? "" : "AND COALESCE(LEFT(vr.comments, 20), '') <> 'ANALYTICS_SEED_2025:'";
  const queries = [
    // 1) Doses administered, one row per day.
    db.query(`
      SELECT
        ${dateFormat("vr.date_administered", "date")} AS service_on,
        COUNT(*) AS doses
      FROM vaccination_records vr
      JOIN vaccines v ON v.id = vr.vaccine_id
      JOIN pets p ON p.id = vr.pet_id
      WHERE vr.date_administered IS NOT NULL
        AND ${VACCINE_FILTER}
        ${petFilter("p")}
        ${vaccinationFilter}
      GROUP BY vr.date_administered
    `),

    // 2) Who was vaccinated, one row per dose, for the distinct counts.
    db.query(`
      SELECT
        ${dateFormat("vr.date_administered", "date")} AS service_on,
        vr.pet_id AS pet_key,
        p.pet_owner_id AS owner_key
      FROM vaccination_records vr
      JOIN pets p ON p.id = vr.pet_id
      JOIN vaccines v ON v.id = vr.vaccine_id
      WHERE vr.date_administered IS NOT NULL
        AND ${VACCINE_FILTER}
        ${petFilter("p")}
        ${vaccinationFilter}
    `),

    // 3) Pet registrations use the service/registration date when available;
    // fall back to the encoding date for older records.
    db.query(`
      SELECT
        ${dateFormat("COALESCE(p.registration_date, DATE(p.created_at))", "date")} AS service_on,
        COUNT(*) AS registrations
      FROM pets p
      WHERE 1 = 1 ${petFilter("p")}
      GROUP BY COALESCE(p.registration_date, DATE(p.created_at))
    `),

    // 4) Consultations, one row per day.
    db.query(`
      SELECT
        ${dateFormat("cr.consultation_date", "date")} AS service_on,
        COUNT(*) AS consultations
      FROM consultation_records cr
      JOIN pets p ON p.id = cr.pet_id
      WHERE cr.consultation_date IS NOT NULL
        ${petFilter("p")}
      GROUP BY cr.consultation_date
    `),

    // 5) QR codes issued, one row per day.
    db.query(`
      SELECT
        ${dateFormat("qc.issue_date", "date")} AS service_on,
        COUNT(*) AS qrIssued
      FROM qr_codes qc
      JOIN pets p ON p.id = qc.pet_id
      WHERE 1 = 1 ${petFilter("p")}
      GROUP BY ${dateFormat("qc.issue_date", "date")}
    `),

    // 6) Revenue collected from the live ledger, one row per day.
    db.query(`
      SELECT
        ${dateFormat("COALESCE(pm.consultation_date, DATE(pm.created_at))", "date")} AS service_on,
        COALESCE(SUM(pm.total_amount), 0) AS revenue
      FROM payment_monitoring pm
      WHERE pm.payment_status = 'Paid'
        ${includeSynthetic ? "" : "AND COALESCE(LEFT(pm.payment_reference, 13), '') <> 'ANL-2025-PAY-'"}
      GROUP BY COALESCE(pm.consultation_date, DATE(pm.created_at))
    `),

    // 7) Pets reported lost, one row per day.
    db.query(`
      SELECT
        ${dateFormat("COALESCE(p.lost_date, p.created_at)", "date")} AS service_on,
        COUNT(*) AS lostPets
      FROM pets p
      WHERE p.is_lost = 1
        AND p.status = 'Verified'
        ${petFilter("p")}
      GROUP BY COALESCE(p.lost_date, p.created_at)
    `),

    // 8) New pet owners, one row per day.
    db.query(`
      SELECT
        ${dateFormat("po.created_at", "date")} AS service_on,
        COUNT(*) AS newOwners
      FROM pet_owners po
      WHERE ${includeSynthetic ? "1 = 1" : "COALESCE(LEFT(po.full_name, 20), '') <> 'Analytics Seed Owner'"}
      GROUP BY ${dateFormat("po.created_at", "date")}
    `),
  ];

  const episodeIndex = queries.length;
  if (includeEpisodes) {
    // 9) Vaccine follow-up outcomes, one row per episode.
    queries.push(db.query(buildEpisodeQuery({ graceDays: DEFAULT_GRACE_DAYS, includeSynthetic })));
  }

  const results = await Promise.all(queries);
  const [
    doseRows,
    participantRows,
    registrationRows,
    consultationRows,
    qrRows,
    revenueRows,
    lostRows,
    ownerRows,
  ] = results.slice(0, 8).map((result) => result[0] || []);

  const episodeRows = includeEpisodes
    ? results[episodeIndex][0] || []
    : [];

  const rows = [];

  for (const row of doseRows) {
    rows.push({ date: row.service_on, doses: Number(row.doses) || 0 });
  }

  for (const row of participantRows) {
    // `pets` and `owners` are distinct-metric fields, not counts.
    rows.push({
      date: row.service_on,
      pets: row.pet_key,
      owners: row.owner_key,
    });
  }

  for (const row of registrationRows) {
    rows.push({ date: row.service_on, registrations: Number(row.registrations) || 0 });
  }

  for (const row of consultationRows) {
    rows.push({ date: row.service_on, consultations: Number(row.consultations) || 0 });
  }

  for (const row of qrRows) {
    // PostgreSQL folds unquoted camelCase aliases to lowercase, so read both.
    rows.push({ date: row.service_on, qrIssued: Number(row.qrIssued ?? row.qrissued) || 0 });
  }

  for (const row of revenueRows) {
    rows.push({ date: row.service_on, revenue: Number(row.revenue) || 0 });
  }

  for (const row of lostRows) {
    rows.push({ date: row.service_on, lostPets: Number(row.lostPets ?? row.lostpets) || 0 });
  }

  for (const row of ownerRows) {
    rows.push({ date: row.service_on, newOwners: Number(row.newOwners ?? row.newowners) || 0 });
  }

  for (const row of episodeRows) {
    // Pending episodes have no outcome yet, so they cannot be evaluated.
    if (row.outcome === "Pending") continue;
    rows.push({
      date: row.administered_on,
      evaluable: 1,
      onTime: row.outcome === "On Time" ? 1 : 0,
      late: row.outcome === "Late" ? 1 : 0,
      lapsed: row.outcome === "Lapsed" ? 1 : 0,
      noReturn: row.outcome === "No Return" ? 1 : 0,
    });
  }

  return rows;
}

/**
 * Build a comparison payload without touching `req`/`res`, so both the
 * dedicated endpoint and the legacy `/vaccination-trends` route (and the
 * dashboard's inline comparison) can share one implementation.
 *
 * @param {object} [options]
 * @param {string} [options.granularity]
 * @param {string} [options.compare]
 * @param {Date} [options.anchor]
 * @param {number} [options.windows]
 * @param {string} [options.primaryMetric]
 * @param {{from: string, to: string}} [options.current]
 * @param {{from: string, to: string}} [options.baseline]
 * @param {boolean} [options.toDate] clamp the window end to the anchor date
 * @param {boolean} [options.includeEpisodes] load the vaccine follow-up outcomes
 */
async function buildPeriodComparison(options = {}) {
  const granularity = normalizeGranularity(options.granularity);
  const compare = normalizeCompare(options.compare);
  const anchorDate = parseISODate(options.anchor) || new Date();
  const count = windowSize(granularity, options.windows);
  const primaryMetric = resolvePrimary(options.primaryMetric);
  const includeEpisodes = options.includeEpisodes !== false;
  const includeSynthetic = options.includeSynthetic === true;
  // "Same period last year" is only a fair comparison when both sides cover
  // the same dates, so the window is clamped to the anchor (year-to-date).
  // "Previous period" keeps whole calendar buckets, which is its definition.
  const toDate = options.toDate !== false;

  const currentRange =
    options.current ||
    (toDate
      ? toDateRange(anchorDate, granularity, count)
      : trailingRange(anchorDate, granularity, count));

  let baselineWindow = options.baseline;
  if (!baselineWindow) {
    baselineWindow =
      compare === "previousYear"
        ? previousYearRange(currentRange)
        : previousWindowRange(currentRange, granularity, count);
  }

  const rows = await loadDayRows({ includeEpisodes, includeSynthetic });

  const comparison = buildComparison({
    rows,
    granularity,
    compare,
    currentRange,
    baselineRange: baselineWindow,
    windowCount: count,
    currentLabel: describeWindow(granularity, currentRange.from, currentRange.to),
    baselineLabel: describeWindow(granularity, baselineWindow.from, baselineWindow.to),
    primaryMetric,
  });
  const [currentSynthetic, baselineSynthetic] = await Promise.all([
    countSyntheticSeedRecords(currentRange),
    countSyntheticSeedRecords(baselineWindow),
  ]);
  comparison.syntheticData = {
    label: "Synthetic Analytics Seed 2025",
    included: includeSynthetic,
    current: currentSynthetic,
    baseline: baselineSynthetic,
  };
  return comparison;
}

// GET /api/analytics/period-comparison
async function getPeriodComparison(req, res) {
  try {
    const payload = await buildPeriodComparison({
      granularity: req.query.granularity,
      compare: req.query.compare,
      anchor: req.query.anchor,
      windows: req.query.windows,
      primaryMetric: req.query.metric,
      // An explicit range from the UI turns off the to-date clamp so the
      // window is exactly the one the user picked.
      current:
        req.query.from && req.query.to
          ? { from: req.query.from, to: req.query.to }
          : undefined,
      baseline:
        req.query.baselineFrom && req.query.baselineTo
          ? { from: req.query.baselineFrom, to: req.query.baselineTo }
          : undefined,
      toDate: !(req.query.from && req.query.to),
      includeSynthetic: req.query.includeSynthetic !== "false",
    });

    res.json({ success: true, ...payload });
  } catch (error) {
    console.error("Error building the period comparison:", error);
    res.status(500).json({
      success: false,
      message: "Could not build the period comparison.",
      error: error.message,
    });
  }
}

/**
 * Compare the last complete calendar window of a certain size against the
 * window before it, for dashboard quick toggles.
 */
async function buildDashboardComparison({
  granularity = "monthly",
  compare = "previousYear",
  windows = 6,
  anchor,
  primaryMetric = "registrations",
  includeEpisodes = false,
  includeSynthetic = false,
} = {}) {
  const g = normalizeGranularity(granularity);
  const mode = normalizeCompare(compare);
  const anchorDate = parseISODate(anchor) || new Date();
  const count = windowSize(g, windows);

  const currentRange = toDateRange(anchorDate, g, count);

  const baselineWindow =
    mode === "previousYear"
      ? previousYearRange(currentRange)
      : previousWindowRange(currentRange, g, count);

  const rows = await loadDayRows({ includeEpisodes, includeSynthetic });

  return buildComparison({
    rows,
    granularity: g,
    compare: mode,
    currentRange,
    baselineRange: baselineWindow,
    windowCount: count,
    currentLabel: describeWindow(g, currentRange.from, currentRange.to),
    baselineLabel: describeWindow(g, baselineWindow.from, baselineWindow.to),
    primaryMetric,
  });
}

module.exports = {
  getPeriodComparison,
  buildPeriodComparison,
  buildDashboardComparison,
  toDateRange,
  previousRange,
  previousYearRange,
  previousWindowRange,
  countSyntheticSeedRecords,
  windowsForCustomRange,
  loadDayRows,
};
