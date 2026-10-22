const db = require("../config/db");
const { dateFormat } = require("../config/sql");
const {
  parseISODate,
  toISODate,
} = require("../utils/reportPeriods");
const {
  VACCINE_FILTER,
  DEFAULT_GRACE_DAYS,
  MAX_GRACE_DAYS,
  OUTCOME_ORDER,
  SERVICE_EVENTS_CTE,
  buildEpisodeQuery,
} = require("../utils/vaccineEpisodes");
const { buildPeriodComparison } = require("./comparisonController");

// ---------------------------------------------------------------------------
// Vaccine follow-up compliance & period comparison
//
// Three endpoints back the Analytics & Reports page:
//
//   GET /api/analytics/vaccine-compliance  -> did owners come back for the
//                                              next dose / for any service?
//   GET /api/analytics/return-rate         -> return behaviour after ANY
//                                              service, per service type
//   GET /api/analytics/vaccination-trends  -> vaccination-scoped view of the
//                                              shared period comparison engine
//
// The episode query itself lives in `utils/vaccineEpisodes.js` because the
// analytics comparison controller uses the same episode outcomes.
// ---------------------------------------------------------------------------

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function clampInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function median(values) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function average(values) {
  const usable = values.filter((v) => Number.isFinite(v));
  if (!usable.length) return null;
  return usable.reduce((sum, v) => sum + v, 0) / usable.length;
}

function safeDate(value) {
  const parsed = parseISODate(value);
  return parsed ? toISODate(parsed) : null;
}

/**
 * Aggregate a list of episodes into the shape the UI renders.
 * @param {Array} rows episode rows
 * @param {string} outcomeKey which outcome column to roll up
 */
function summarizeEpisodes(rows, outcomeKey = "outcome") {
  const counts = { "On Time": 0, Late: 0, Lapsed: 0, "No Return": 0, Pending: 0 };
  const pets = new Set();
  const owners = new Set();
  const neverReturningPets = new Set();
  const returnDays = [];
  const lateDays = [];

  for (const row of rows) {
    const outcome = row[outcomeKey];
    if (counts[outcome] === undefined) counts[outcome] = 0;
    counts[outcome] += 1;
    pets.add(row.pet_id);
    owners.add(row.owner_id);
    if (outcome === "No Return") neverReturningPets.add(row.pet_id);
    if (row.days_to_return !== null && row.days_to_return !== undefined) {
      const value = Number(row.days_to_return);
      if (Number.isFinite(value)) returnDays.push(value);
    }
    if (row.days_late !== null && row.days_late !== undefined) {
      const value = Number(row.days_late);
      if (Number.isFinite(value) && value > 0) lateDays.push(value);
    }
  }

  const evaluable = counts["On Time"] + counts.Late + counts.Lapsed + counts["No Return"];
  const returned = counts["On Time"] + counts.Late + counts.Lapsed;

  return {
    counts,
    evaluable,
    returned,
    distinctPets: pets.size,
    distinctOwners: owners.size,
    petsNeverReturning: neverReturningPets.size,
    onTimeRate: evaluable ? round((counts["On Time"] / evaluable) * 100) : 0,
    returnedRate: evaluable ? round((returned / evaluable) * 100) : 0,
    noReturnRate: evaluable ? round((counts["No Return"] / evaluable) * 100) : 0,
    lateRate: evaluable ? round((counts.Late / evaluable) * 100) : 0,
    lapsedRate: evaluable ? round((counts.Lapsed / evaluable) * 100) : 0,
    avgDaysToReturn: average(returnDays) === null ? null : round(average(returnDays)),
    medianDaysToReturn: median(returnDays) === null ? null : round(median(returnDays)),
    avgDaysLate: average(lateDays) === null ? null : round(average(lateDays)),
  };
}

function bucketList(counts, total) {
  return OUTCOME_ORDER.map((status) => ({
    status,
    total: counts[status] || 0,
    pct: total ? round(((counts[status] || 0) / total) * 100) : 0,
  }));
}

/** Group episodes by an arbitrary key and compute the outcome split. */
function groupOutcomes(rows, keyFn, outcomeKey = "outcome") {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  return Array.from(groups.entries())
    .map(([key, groupRows]) => {
      const summary = summarizeEpisodes(groupRows, outcomeKey);
      return {
        key,
        episodes: groupRows.length,
        evaluable: summary.evaluable,
        onTime: summary.counts["On Time"],
        late: summary.counts.Late,
        lapsed: summary.counts.Lapsed,
        noReturn: summary.counts["No Return"],
        pending: summary.counts.Pending,
        onTimeRate: summary.onTimeRate,
        returnedRate: summary.returnedRate,
      };
    });
}

// ---------------------------------------------------------------------------
// GET /api/analytics/vaccine-compliance
// ---------------------------------------------------------------------------

async function getVaccineCompliance(req, res) {
  try {
    const graceDays = clampInt(req.query.grace, DEFAULT_GRACE_DAYS, 0, MAX_GRACE_DAYS);
    const from = safeDate(req.query.from);
    const to = safeDate(req.query.to);
    const vaccineId = Number(req.query.vaccineId);
    const barangay = String(req.query.barangay || "").trim();
    const limit = clampInt(req.query.limit, 100, 1, 1000);

    const clauses = [];
    const params = [];
    if (from) {
      clauses.push("AND e.date_administered >= ?");
      params.push(from);
    }
    if (to) {
      clauses.push("AND e.date_administered <= ?");
      params.push(to);
    }
    if (Number.isFinite(vaccineId) && vaccineId > 0) {
      clauses.push("AND e.vaccine_id = ?");
      params.push(vaccineId);
    }
    if (barangay) {
      clauses.push("AND e.barangay = ?");
      params.push(barangay);
    }

    const [rows] = await db.query(
      buildEpisodeQuery({ graceDays, where: clauses.join("\n      ") }),
      params
    );

    const episodes = rows || [];
    const summary = summarizeEpisodes(episodes, "outcome");
    const summaryAny = summarizeEpisodes(episodes, "outcome_any");

    // Species names live in a tiny lookup table.
    const [speciesRows] = await db.query("SELECT id, species_name FROM species");
    const speciesById = new Map((speciesRows || []).map((s) => [Number(s.id), s.species_name]));

    const byBarangay = groupOutcomes(episodes, (row) => row.barangay || "Unspecified")
      .sort((a, b) => b.episodes - a.episodes);
    const byVaccine = groupOutcomes(episodes, (row) => row.vaccine_name || "Unspecified")
      .sort((a, b) => b.episodes - a.episodes);
    const bySpecies = groupOutcomes(
      episodes,
      (row) => speciesById.get(Number(row.species_id)) || "Unspecified"
    ).sort((a, b) => b.episodes - a.episodes);

    // Monthly cohort trend: for each month, how many follow-ups fell due and
    // how many of those were met on time.
    const trendMap = new Map();
    for (const row of episodes) {
      const administered = parseISODate(row.administered_on);
      if (!administered) continue;
      const key = `${administered.getFullYear()}-${String(administered.getMonth() + 1).padStart(2, "0")}`;
      if (!trendMap.has(key)) {
        trendMap.set(key, { key, sort: administered.getTime(), episodes: 0, evaluable: 0, onTime: 0 });
      }
      const entry = trendMap.get(key);
      entry.episodes += 1;
      if (row.outcome !== "Pending") {
        entry.evaluable += 1;
        if (row.outcome === "On Time") entry.onTime += 1;
      }
    }
    const trend = Array.from(trendMap.values())
      .sort((a, b) => a.sort - b.sort)
      .map((entry) => {
        const [year, month] = entry.key.split("-");
        return {
          period: `${MONTH_LABELS[Number(month) - 1]} ${year}`,
          key: entry.key,
          episodes: entry.episodes,
          evaluable: entry.evaluable,
          onTime: entry.onTime,
          onTimeRate: entry.evaluable ? round((entry.onTime / entry.evaluable) * 100) : 0,
        };
      });

    // Actionable list: owners who did not come back (or came back too late),
    // most overdue first.
    const atRisk = episodes.filter((row) => row.outcome === "No Return" || row.outcome === "Lapsed");
    const actionable = atRisk
      .slice()
      .sort((a, b) => (Number(b.days_overdue) || 0) - (Number(a.days_overdue) || 0))
      .slice(0, limit)
      .map((row) => ({
        pet_code: row.pet_code,
        pet_name: row.pet_name,
        owner_name: row.owner_name,
        contact_number: row.contact_number,
        barangay: row.barangay,
        vaccine_name: row.vaccine_name,
        dose_label: row.dose_label,
        administered_on: row.administered_on,
        due_on: row.due_on,
        days_overdue: Number(row.days_overdue) || 0,
        last_service_on: row.last_service_on,
        outcome: row.outcome,
        outcome_any: row.outcome_any,
      }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pendingNext30 = episodes.filter((row) => {
      if (row.outcome !== "Pending") return false;
      const due = parseISODate(row.due_on);
      if (!due) return false;
      return due.getTime() >= today.getTime() && due.getTime() <= today.getTime() + 30 * 86400000;
    }).length;

    res.json({
      success: true,
      graceDays,
      filterLabel: from && to ? `${from} to ${to}` : from ? `From ${from}` : to ? `Up to ${to}` : "All Time",
      summary: {
        episodes: episodes.length,
        pending: summary.counts.Pending,
        evaluable: summary.evaluable,
        onTime: summary.counts["On Time"],
        late: summary.counts.Late,
        lapsed: summary.counts.Lapsed,
        noReturn: summary.counts["No Return"],
        onTimeRate: summary.onTimeRate,
        returnedRate: summary.returnedRate,
        noReturnRate: summary.noReturnRate,
        lateRate: summary.lateRate,
        lapsedRate: summary.lapsedRate,
        avgDaysToReturn: summary.avgDaysToReturn,
        medianDaysToReturn: summary.medianDaysToReturn,
        avgDaysLate: summary.avgDaysLate,
        distinctPets: summary.distinctPets,
        distinctOwners: summary.distinctOwners,
        petsNeverReturning: summary.petsNeverReturning,
        pendingNext30,
        // The "any service" view of the same episodes.
        anyServiceOnTime: summaryAny.counts["On Time"],
        anyServiceReturned: summaryAny.returned,
        anyServiceReturnedRate: summaryAny.returnedRate,
      },
      buckets: bucketList(summary.counts, episodes.length),
      byBarangay,
      byVaccine,
      bySpecies,
      trend,
      funnel: {
        vaccinated: summary.distinctPets,
        dueEvaluable: summary.evaluable,
        returned: summary.returned,
        onTime: summary.counts["On Time"],
      },
      actionable,
      actionableTotal: atRisk.length,
    });
  } catch (error) {
    console.error("Error in vaccine compliance analytics:", error);
    res.status(500).json({
      success: false,
      message: "Could not build the vaccine compliance report.",
      error: error.message,
    });
  }
}

// ---------------------------------------------------------------------------
// GET /api/analytics/return-rate
//
// "Did the owner come back after ANY service?" — vaccination, consultation,
// preventive care or procedure. Each service visit is an episode; a return is
// the pet showing up for any other service afterwards.
// ---------------------------------------------------------------------------

async function getReturnRate(req, res) {
  try {
    const from = safeDate(req.query.from);
    const to = safeDate(req.query.to);

    const clauses = [];
    const params = [];
    if (from) {
      clauses.push("AND v.service_date >= ?");
      params.push(from);
    }
    if (to) {
      clauses.push("AND v.service_date <= ?");
      params.push(to);
    }
    const where = clauses.join("\n      ");

    const sql = `
    WITH ${SERVICE_EVENTS_CTE},
    visits AS (
      SELECT 'Vaccination' AS service_type, vr.pet_id, vr.date_administered AS service_date, p.pet_owner_id AS owner_id
      FROM vaccination_records vr
      JOIN pets p ON p.id = vr.pet_id
      WHERE vr.date_administered IS NOT NULL
      UNION ALL
      SELECT 'Consultation', cr.pet_id, cr.consultation_date, p.pet_owner_id
      FROM consultation_records cr
      JOIN pets p ON p.id = cr.pet_id
      WHERE cr.consultation_date IS NOT NULL
      UNION ALL
      SELECT 'Preventive Care', pc.pet_id, pc.date_administered, p.pet_owner_id
      FROM preventive_care_records pc
      JOIN pets p ON p.id = pc.pet_id
      WHERE pc.date_administered IS NOT NULL
      UNION ALL
      SELECT 'Procedure', pp.pet_id, pp.procedure_date, p.pet_owner_id
      FROM pet_procedures pp
      JOIN pets p ON p.id = pp.pet_id
      WHERE pp.procedure_date IS NOT NULL
    ),
    visit_days AS (
      SELECT service_type, pet_id, service_date, MIN(owner_id) AS owner_id, COUNT(*) AS visits
      FROM visits
      GROUP BY service_type, pet_id, service_date
    ),
    returns AS (
      SELECT v.service_type, v.pet_id, v.service_date, MIN(se.event_date) AS returned_on
      FROM visit_days v
      JOIN service_events se
        ON se.pet_id = v.pet_id
       AND se.event_date > v.service_date
      GROUP BY v.service_type, v.pet_id, v.service_date
    )
    SELECT
      v.service_type,
      v.pet_id,
      v.owner_id,
      v.visits,
      ${dateFormat("v.service_date", "date")} AS service_on,
      ${dateFormat("r.returned_on", "date")} AS returned_on
    FROM visit_days v
    LEFT JOIN returns r
      ON r.service_type = v.service_type
     AND r.pet_id = v.pet_id
     AND r.service_date = v.service_date
    WHERE 1 = 1
    ${where}
  `;

    const [rows] = await db.query(sql, params);
    const visits = rows || [];

    // Consultations that scheduled a follow-up: was the appointment honoured?
    const followUpSql = `
    WITH ${SERVICE_EVENTS_CTE},
    ret AS (
      SELECT cr.id, MIN(se.event_date) AS returned_on
      FROM consultation_records cr
      JOIN service_events se
        ON se.pet_id = cr.pet_id
       AND se.event_date > cr.consultation_date
      GROUP BY cr.id
    )
    SELECT
      cr.id,
      ${dateFormat("cr.consultation_date", "date")} AS service_on,
      ${dateFormat("cr.follow_up_date", "date")} AS follow_up_on,
      ${dateFormat("ret.returned_on", "date")} AS returned_on
    FROM consultation_records cr
    LEFT JOIN ret ON ret.id = cr.id
    WHERE cr.follow_up_date IS NOT NULL
  `;
    const [followUpRows] = await db.query(followUpSql);

    // Bucket the returns into the standard windows.
    const byServiceMap = new Map();
    const ownerRows = new Map();
    const returnDaysAll = [];

    for (const row of visits) {
      const serviceDate = parseISODate(row.service_on);
      const returnedDate = parseISODate(row.returned_on);
      const days =
        serviceDate && returnedDate
          ? Math.round((returnedDate.getTime() - serviceDate.getTime()) / 86400000)
          : null;

      if (!byServiceMap.has(row.service_type)) {
        byServiceMap.set(row.service_type, {
          serviceType: row.service_type,
          episodes: 0,
          visits: 0,
          pets: new Set(),
          returned30: 0,
          returned60: 0,
          returned90: 0,
          never: 0,
          returnDays: [],
        });
      }
      const bucket = byServiceMap.get(row.service_type);
      bucket.episodes += 1;
      bucket.visits += Number(row.visits) || 1;
      bucket.pets.add(row.pet_id);

      if (days !== null) {
        bucket.returnDays.push(days);
        returnDaysAll.push(days);
        if (days <= 30) bucket.returned30 += 1;
        if (days <= 60) bucket.returned60 += 1;
        if (days <= 90) bucket.returned90 += 1;
      } else {
        bucket.never += 1;
      }

      if (!ownerRows.has(row.owner_id)) ownerRows.set(row.owner_id, []);
      ownerRows.get(row.owner_id).push(days);
    }

    const byService = Array.from(byServiceMap.values())
      .map((bucket) => ({
        serviceType: bucket.serviceType,
        episodes: bucket.episodes,
        visits: bucket.visits,
        pets: bucket.pets.size,
        returned30: bucket.returned30,
        returned60: bucket.returned60,
        returned90: bucket.returned90,
        neverReturned: bucket.never,
        returnRate30: bucket.episodes ? round((bucket.returned30 / bucket.episodes) * 100) : 0,
        returnRate60: bucket.episodes ? round((bucket.returned60 / bucket.episodes) * 100) : 0,
        returnRate90: bucket.episodes ? round((bucket.returned90 / bucket.episodes) * 100) : 0,
        avgDaysToReturn:
          average(bucket.returnDays) === null ? null : round(average(bucket.returnDays)),
      }))
      .sort((a, b) => b.episodes - a.episodes);

    // Follow-up adherence: appointments the vet scheduled and the owner kept.
    let honoured = 0;
    let missed = 0;
    let scheduled = 0;
    for (const row of followUpRows || []) {
      const due = parseISODate(row.follow_up_on);
      if (!due) continue;
      scheduled += 1;
      const returned = parseISODate(row.returned_on);
      if (returned && returned.getTime() <= due.getTime() + DEFAULT_GRACE_DAYS * 86400000) {
        honoured += 1;
      } else {
        missed += 1;
      }
    }

    // Owner retention: of the owners served in the period, how many came back
    // for at least one more service within 90 days?
    let ownersServed = 0;
    let ownersReturned = 0;
    for (const daysList of ownerRows.values()) {
      ownersServed += 1;
      if (daysList.some((days) => days !== null && days >= 0 && days <= 90)) ownersReturned += 1;
    }

    const totalEpisodes = visits.length;
    const totalReturned30 = byService.reduce((sum, s) => sum + s.returned30, 0);

    res.json({
      success: true,
      filterLabel: from && to ? `${from} to ${to}` : from ? `From ${from}` : to ? `Up to ${to}` : "All Time",
      windows: [30, 60, 90],
      summary: {
        episodes: totalEpisodes,
        returned30: totalReturned30,
        returned60: byService.reduce((sum, s) => sum + s.returned60, 0),
        returned90: byService.reduce((sum, s) => sum + s.returned90, 0),
        neverReturned: byService.reduce((sum, s) => sum + s.neverReturned, 0),
        returnRate30: totalEpisodes ? round((totalReturned30 / totalEpisodes) * 100) : 0,
        avgDaysToReturn:
          average(returnDaysAll) === null ? null : round(average(returnDaysAll)),
      },
      byService,
      followUp: {
        scheduled,
        honoured,
        missed,
        adherenceRate: scheduled ? round((honoured / scheduled) * 100) : 0,
      },
      retention: {
        ownersServed,
        ownersReturned,
        retentionRate: ownersServed ? round((ownersReturned / ownersServed) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Error in return rate analytics:", error);
    res.status(500).json({
      success: false,
      message: "Could not build the service return report.",
      error: error.message,
    });
  }
}

// ---------------------------------------------------------------------------
// GET /api/analytics/vaccination-trends
//
// The comparison engine.
//
// The whole dataset is pulled once at day level and then bucketed in JS, so
// every granularity (daily / weekly / monthly / yearly) sees the same
// numbers, the bucket axis is stable even on days with no activity, and the
// yearly report can cover every year on record rather than just the window
// currently on screen.
// ---------------------------------------------------------------------------

/**
 * GET /api/analytics/vaccination-trends
 *
 * Vaccination-scoped view of the shared period-comparison engine. The
 * bucketing and the delta maths live in `comparisonController` and
 * `utils/analyticsComparison.js`; this route only keeps the legacy response
 * shape so the existing prints and cached clients keep working.
 */
async function getVaccinationTrends(req, res) {
  try {
    const current =
      req.query.from && req.query.to
        ? { from: req.query.from, to: req.query.to }
        : undefined;

    const payload = await buildPeriodComparison({
      granularity: req.query.granularity,
      compare: req.query.compare,
      anchor: req.query.anchor,
      windows: req.query.windows,
      primaryMetric: "doses",
      current,
      toDate: !current,
    });

    res.json({ success: true, ...payload });
  } catch (error) {
    console.error("Error in vaccination trend analytics:", error);
    res.status(500).json({
      success: false,
      message: "Could not build the vaccination comparison report.",
      error: error.message,
    });
  }
}

module.exports = {
  getVaccineCompliance,
  getReturnRate,
  getVaccinationTrends,
  OUTCOME_ORDER,
  DEFAULT_GRACE_DAYS,
};
