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
  buildServiceEventsCTE,
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
const CONTACT_STATUSES = new Set([
  "Not yet contacted",
  "Reached",
  "No answer",
  "Wrong number",
  "Promised to return",
]);
const RETENTION_REASONS = [
  { key: "forgot_schedule", label: "Forgot / unaware of the schedule" },
  { key: "no_reminder", label: "Did not receive a reminder" },
  { key: "distance_transport", label: "Distance / transportation" },
  { key: "clinic_hours", label: "Clinic hours did not work" },
  { key: "cost", label: "Cost" },
  { key: "other_clinic", label: "Went to another clinic / private vet" },
  { key: "moved", label: "Moved / changed barangay" },
  { key: "lost_deceased", label: "Pet lost or deceased" },
  { key: "pet_health_fear", label: "Pet illness / fear" },
  { key: "other", label: "Other" },
];
const RETENTION_REASON_KEYS = new Set(RETENTION_REASONS.map((reason) => reason.key));

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
        sampleSize: summary.evaluable,
        lowSample: summary.evaluable < 30,
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

function ageBand(birthdate, administeredOn) {
  const birth = parseISODate(birthdate);
  const administered = parseISODate(administeredOn);
  if (!birth || !administered || birth > administered) return "Unknown age";
  const months =
    (administered.getFullYear() - birth.getFullYear()) * 12 +
    administered.getMonth() -
    birth.getMonth() -
    (administered.getDate() < birth.getDate() ? 1 : 0);
  return months < 12 ? "Under 1 year" : "1 year and older";
}

function factorsFor(rows, speciesById) {
  const factors = [];
  const add = (factor, keyFn) => {
    for (const group of groupOutcomes(rows, keyFn)) {
      factors.push({
        factor,
        group: group.key,
        episodes: group.episodes,
        evaluable: group.evaluable,
        returned: group.onTime + group.late + group.lapsed,
        returnedRate: group.returnedRate,
        onTime: group.onTime,
        onTimeRate: group.onTimeRate,
        sampleSize: group.sampleSize,
        lowSample: group.lowSample,
      });
    }
  };
  add("Barangay", (row) => row.barangay || "Unspecified");
  add("Species", (row) => speciesById.get(Number(row.species_id)) || "Unspecified");
  add("Vaccine", (row) => row.vaccine_name || "Unspecified");
  add("Pet age", (row) => ageBand(row.birthdate, row.administered_on));
  add("Owner history", (row) => Number(row.owner_prior_visits) > 0 ? "Repeat service owner" : "First-time service owner");
  add("Weekday", (row) => {
    const date = parseISODate(row.administered_on);
    return date ? date.toLocaleDateString("en-US", { weekday: "long" }) : "Unknown";
  });
  add("Vaccination month", (row) => {
    const date = parseISODate(row.administered_on);
    return date ? MONTH_LABELS[date.getMonth()] : "Unknown";
  });
  return factors;
}

// ---------------------------------------------------------------------------
// GET /api/analytics/vaccine-compliance
// ---------------------------------------------------------------------------

async function getVaccineCompliance(req, res) {
  try {
    const graceDays = clampInt(req.query.grace, DEFAULT_GRACE_DAYS, 0, MAX_GRACE_DAYS);
    const includeSynthetic = req.query.includeSynthetic !== "false";
    const from = safeDate(req.query.from);
    const to = safeDate(req.query.to);
    const vaccineId = Number(req.query.vaccineId);
    const barangay = String(req.query.barangay || "").trim();
    const limit = clampInt(req.query.limit, 100, 1, 1000);
    const page = clampInt(req.query.page, 1, 1, 100000);
    const search = String(req.query.search || "").trim().toLowerCase();
    const contactStatus = String(req.query.contactStatus || "").trim();
    const vaccineFilter = String(req.query.vaccine || "").trim();
    const sortBy = String(req.query.sortBy || "daysOverdue");

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
      buildEpisodeQuery({ graceDays, where: clauses.join("\n      "), includeSynthetic }),
      params
    );

    const allEpisodes = rows || [];
    const syntheticSeedEpisodes = allEpisodes.filter((row) => String(row.pet_code || "").startsWith("ANL-2025-")).length;
    const episodeIds = allEpisodes.map((row) => Number(row.id)).filter(Number.isFinite);
    const contactRows = episodeIds.length
      ? (await db.query(
          `SELECT c.vaccination_record_id, c.contact_status, c.reasons_json, c.other_reason,
                  c.contacted_at, c.contacted_by, u.full_name AS contacted_by_name
           FROM vaccine_followup_contacts c
           LEFT JOIN users u ON u.id = c.contacted_by
           WHERE c.vaccination_record_id IN (${episodeIds.map(() => "?").join(",")})`,
          episodeIds
        ))[0]
      : [];
    const contactsByEpisode = new Map(
      (contactRows || []).map((row) => [Number(row.vaccination_record_id), row])
    );
    const parseReasons = (row) => {
      if (!row) return [];
      const decoded = JSON.parse(row.reasons_json || "[]");
      return Array.isArray(decoded) ? decoded.filter((reason) => RETENTION_REASON_KEYS.has(reason)) : [];
    };
    const excludedReasons = new Set(["moved", "lost_deceased"]);
    const excludedEpisodeIds = new Set(
      (contactRows || [])
        .filter((row) => parseReasons(row).some((reason) => excludedReasons.has(reason)))
        .map((row) => Number(row.vaccination_record_id))
    );
    const episodes = allEpisodes.filter((row) => !excludedEpisodeIds.has(Number(row.id)));
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
    const factors = factorsFor(episodes, speciesById);
    const reliableBarangays = byBarangay.filter((row) => row.sampleSize >= 30);
    const lowestBarangay = reliableBarangays
      .slice()
      .sort((a, b) => a.onTimeRate - b.onTimeRate)[0];
    const reliableVaccines = byVaccine.filter((row) => row.sampleSize >= 30);
    const lowestVaccine = reliableVaccines
      .slice()
      .sort((a, b) => a.returnedRate - b.returnedRate)[0];
    const findings = [];
    const recommendations = [];
    if (summary.evaluable) {
      findings.push(
        `${summary.noReturnRate}% of evaluated vaccine episodes have no recorded return for the same vaccine.`
      );
      if (lowestBarangay) {
        findings.push(
          `${lowestBarangay.key} has the lowest on-time rate among barangays with at least 30 evaluated episodes (${lowestBarangay.onTimeRate}%, n=${lowestBarangay.sampleSize}).`
        );
        recommendations.push(`Review follow-up outreach and reminder coverage in ${lowestBarangay.key}.`);
      }
      if (lowestVaccine) {
        findings.push(
          `${lowestVaccine.key} has the lowest recorded return rate among vaccine types with at least 30 evaluated episodes (${lowestVaccine.returnedRate}%, n=${lowestVaccine.sampleSize}).`
        );
        recommendations.push(`Check the scheduled interval and reminder workflow for ${lowestVaccine.key}.`);
      }
      if (summary.pending) {
        findings.push(`${summary.pending} vaccine episodes remain within the due-date grace window and are not counted as non-compliant.`);
      }
    } else {
      findings.push("There are no evaluated vaccine follow-up episodes in this date range yet.");
      recommendations.push("Review the selected date range and ensure vaccine due dates are recorded.");
    }
    recommendations.push("Record the owner's stated reason during outreach; a missing return record does not establish why the owner did not return.");

    // Monthly cohort trend: for each month, how many follow-ups fell due and
    // how many of those were met on time.
    const trendMap = new Map();
    for (const row of episodes) {
      const administered = parseISODate(row.administered_on);
      if (!administered) continue;
      const key = `${administered.getFullYear()}-${String(administered.getMonth() + 1).padStart(2, "0")}`;
      if (!trendMap.has(key)) {
        trendMap.set(key, { key, sort: administered.getTime(), episodes: 0, evaluable: 0, onTime: 0, pending: 0 });
      }
      const entry = trendMap.get(key);
      entry.episodes += 1;
      if (row.outcome !== "Pending") {
        entry.evaluable += 1;
        if (row.outcome === "On Time") entry.onTime += 1;
      } else {
        entry.pending += 1;
      }
    }
    const trendEntries = Array.from(trendMap.values()).sort((a, b) => a.sort - b.sort);
    if (trendEntries.length) {
      const first = parseISODate(`${trendEntries[0].key}-01`);
      const last = parseISODate(`${trendEntries[trendEntries.length - 1].key}-01`);
      const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
      while (cursor <= last) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
        if (!trendMap.has(key)) trendMap.set(key, { key, sort: cursor.getTime(), episodes: 0, evaluable: 0, onTime: 0, pending: 0 });
        cursor.setMonth(cursor.getMonth() + 1);
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
          pending: entry.pending,
          lowSample: entry.evaluable < 30,
          onTimeRate: entry.evaluable ? round((entry.onTime / entry.evaluable) * 100) : null,
        };
      });

    const today = parseISODate(toISODate(new Date()));
    const cohortMap = new Map();
    const returnDayBins = [
      { label: "0–7 days", min: 0, max: 7, count: 0 },
      { label: "8–30 days", min: 8, max: 30, count: 0 },
      { label: "31–60 days", min: 31, max: 60, count: 0 },
      { label: "61–90 days", min: 61, max: 90, count: 0 },
      { label: "91–180 days", min: 91, max: 180, count: 0 },
      { label: "181+ days", min: 181, max: Infinity, count: 0 },
    ];
    for (const row of episodes) {
      const administered = parseISODate(row.administered_on);
      if (!administered) continue;
      const key = `${administered.getFullYear()}-${String(administered.getMonth() + 1).padStart(2, "0")}`;
      if (!cohortMap.has(key)) {
        cohortMap.set(key, {
          key,
          cohort: `${MONTH_LABELS[administered.getMonth()]} ${administered.getFullYear()}`,
          eligible30: 0, returned30: 0,
          eligible60: 0, returned60: 0,
          eligible90: 0, returned90: 0,
        });
      }
      const cohort = cohortMap.get(key);
      const returnedAny = parseISODate(row.returned_on_any);
      const daysSinceService = Math.floor((today - administered) / 86400000);
      const daysToAnyReturn = returnedAny ? Math.floor((returnedAny - administered) / 86400000) : null;
      for (const window of [30, 60, 90]) {
        if (daysSinceService < window) continue;
        cohort[`eligible${window}`] += 1;
        if (daysToAnyReturn !== null && daysToAnyReturn <= window) cohort[`returned${window}`] += 1;
      }
      const daysToSameVaccine = row.days_to_return == null ? null : Number(row.days_to_return);
      if (Number.isFinite(daysToSameVaccine)) {
        const bin = returnDayBins.find((item) => daysToSameVaccine >= item.min && daysToSameVaccine <= item.max);
        if (bin) bin.count += 1;
      }
    }
    const cohortRetention = Array.from(cohortMap.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((cohort) => ({
        ...cohort,
        rate30: cohort.eligible30 ? round((cohort.returned30 / cohort.eligible30) * 100) : null,
        rate60: cohort.eligible60 ? round((cohort.returned60 / cohort.eligible60) * 100) : null,
        rate90: cohort.eligible90 ? round((cohort.returned90 / cohort.eligible90) * 100) : null,
      }));

    // Actionable list: owners who did not come back (or came back too late),
    // most overdue first.
    const atRisk = episodes.filter((row) => row.outcome === "No Return" || row.outcome === "Lapsed");
    const searchable = atRisk
      .slice()
      .map((row) => ({
        id: Number(row.id),
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
        contact_status: contactsByEpisode.get(Number(row.id))?.contact_status || "Not yet contacted",
        reasons: parseReasons(contactsByEpisode.get(Number(row.id))),
        other_reason: contactsByEpisode.get(Number(row.id))?.other_reason || "",
        contacted_at: contactsByEpisode.get(Number(row.id))?.contacted_at
          ? String(contactsByEpisode.get(Number(row.id)).contacted_at).slice(0, 10)
          : null,
        contact_recorded_by: contactsByEpisode.get(Number(row.id))?.contacted_by || null,
        contact_recorded_by_name: contactsByEpisode.get(Number(row.id))?.contacted_by_name || null,
      }));
    const filteredActionable = searchable.filter((row) => {
      const haystack = [row.pet_code, row.pet_name, row.owner_name, row.contact_number, row.barangay, row.vaccine_name]
        .join(" ")
        .toLowerCase();
      return (!search || haystack.includes(search)) &&
        (!contactStatus || row.contact_status === contactStatus) &&
        (!vaccineFilter || row.vaccine_name === vaccineFilter);
    });
    const sorters = {
      daysOverdue: (a, b) => (Number(b.days_overdue) || 0) - (Number(a.days_overdue) || 0),
      dueDate: (a, b) => String(a.due_on).localeCompare(String(b.due_on)),
      owner: (a, b) => String(a.owner_name).localeCompare(String(b.owner_name)),
      pet: (a, b) => String(a.pet_name).localeCompare(String(b.pet_name)),
    };
    filteredActionable.sort(sorters[sortBy] || sorters.daysOverdue);
    const canViewContactDetails = ["Admin", "Staff"].includes(req.user?.role);
    const actionable = canViewContactDetails
      ? filteredActionable.slice((page - 1) * limit, page * limit)
      : [];

    const reasonCounts = new Map(RETENTION_REASONS.map((reason) => [reason.key, 0]));
    for (const row of contactRows || []) {
      for (const reason of parseReasons(row)) reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    }
    const retentionReasons = RETENTION_REASONS.map((reason) => ({
      ...reason,
      count: reasonCounts.get(reason.key) || 0,
    })).sort((a, b) => b.count - a.count);

    const todayDate = today;
    const pendingNext30 = episodes.filter((row) => {
      if (row.outcome !== "Pending") return false;
      const due = parseISODate(row.due_on);
      if (!due) return false;
      return due.getTime() >= todayDate.getTime() && due.getTime() <= todayDate.getTime() + 30 * 86400000;
    }).length;

    res.json({
      success: true,
      graceDays,
      syntheticData: {
        label: "Synthetic Analytics Seed 2025",
        included: includeSynthetic,
        vaccineEpisodes: syntheticSeedEpisodes,
      },
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
        excludedEpisodes: excludedEpisodeIds.size,
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
      cohortRetention,
      returnDayDistribution: returnDayBins,
      analysis: {
        findings: findings.slice(0, 5),
        recommendations: recommendations.slice(0, 5),
        interpretation: "Episode-level associations describe recorded clinic activity; they do not prove the cause of a missed follow-up.",
      },
      funnel: {
        episodes: episodes.length,
        dueEvaluable: summary.evaluable,
        returned: summary.returned,
        onTime: summary.counts["On Time"],
      },
      factors,
      retentionReasons,
      actionable,
      actionableTotal: filteredActionable.length,
      actionablePage: page,
      actionablePageSize: limit,
      actionablePages: Math.ceil(filteredActionable.length / limit),
      contactProgress: {
        contacted: searchable.filter((row) => row.contact_status !== "Not yet contacted").length,
        actionable: searchable.length,
      },
      reasonContacted: (contactRows || []).filter((row) => row.contact_status !== "Not yet contacted").length,
      actionableFilters: {
        contactStatuses: Array.from(CONTACT_STATUSES),
        vaccines: Array.from(new Set(atRisk.map((row) => row.vaccine_name).filter(Boolean))).sort(),
      },
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

async function saveFollowupContact(req, res) {
  try {
    const episodeId = Number(req.params.episodeId);
    if (!Number.isSafeInteger(episodeId) || episodeId <= 0) {
      return res.status(400).json({ success: false, message: "A valid vaccine episode is required." });
    }
    const status = String(req.body?.contactStatus || "");
    if (!CONTACT_STATUSES.has(status)) {
      return res.status(400).json({ success: false, message: "Choose a valid contact status." });
    }
    const reasons = req.body?.reasons;
    if (!Array.isArray(reasons) || reasons.some((reason) => !RETENTION_REASON_KEYS.has(reason))) {
      return res.status(400).json({ success: false, message: "Choose valid retention reasons." });
    }
    if (reasons.length && !["Reached", "Promised to return"].includes(status)) {
      return res.status(400).json({ success: false, message: "Owner-stated reasons can only be saved after reaching the owner." });
    }
    const otherReason = String(req.body?.otherReason || "").trim();
    if (reasons.includes("other") && !otherReason) {
      return res.status(400).json({ success: false, message: "Describe the other reason." });
    }
    const contactedAt = status === "Not yet contacted" ? null : safeDate(req.body?.contactedAt);
    if (status !== "Not yet contacted" && !contactedAt) {
      return res.status(400).json({ success: false, message: "Enter the contact date." });
    }
    const [[episode]] = await db.query(
      `SELECT vr.id
       FROM vaccination_records vr
       JOIN pets p ON p.id = vr.pet_id
       WHERE vr.id = ? AND COALESCE(p.is_lost, 0) = 0
       LIMIT 1`,
      [episodeId]
    );
    if (!episode) {
      return res.status(404).json({ success: false, message: "Vaccine episode was not found." });
    }

    const values = [
      episodeId,
      status,
      JSON.stringify(reasons),
      otherReason,
      contactedAt,
      Number(req.user.id),
    ];
    const sql = db.dialect === "postgres"
      ? `INSERT INTO vaccine_followup_contacts
          (vaccination_record_id, contact_status, reasons_json, other_reason, contacted_at, contacted_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (vaccination_record_id) DO UPDATE SET
          contact_status = EXCLUDED.contact_status,
          reasons_json = EXCLUDED.reasons_json,
          other_reason = EXCLUDED.other_reason,
          contacted_at = EXCLUDED.contacted_at,
          contacted_by = EXCLUDED.contacted_by,
          updated_at = now()`
      : `INSERT INTO vaccine_followup_contacts
          (vaccination_record_id, contact_status, reasons_json, other_reason, contacted_at, contacted_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          contact_status = VALUES(contact_status),
          reasons_json = VALUES(reasons_json),
          other_reason = VALUES(other_reason),
          contacted_at = VALUES(contacted_at),
          contacted_by = VALUES(contacted_by),
          updated_at = CURRENT_TIMESTAMP`;
    await db.query(sql, values);
    res.json({ success: true, message: "Follow-up contact details saved." });
  } catch (error) {
    console.error("Error saving vaccine follow-up contact:", error);
    res.status(500).json({
      success: false,
      message: "Could not save follow-up contact details.",
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
    const includeSynthetic = req.query.includeSynthetic !== "false";
    const syntheticPetFilter = (alias) => includeSynthetic ? "" : `AND COALESCE(LEFT(${alias}.pet_code, 9), '') <> 'ANL-2025-'`;
    const syntheticVaccinationFilter = includeSynthetic ? "" : "AND COALESCE(LEFT(vr.comments, 20), '') <> 'ANALYTICS_SEED_2025:'";

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
    WITH ${buildServiceEventsCTE(includeSynthetic)},
    visits AS (
      SELECT 'Vaccination' AS service_type, vr.pet_id, vr.date_administered AS service_date, p.pet_owner_id AS owner_id
      FROM vaccination_records vr
      JOIN pets p ON p.id = vr.pet_id
      JOIN vaccines v ON v.id = vr.vaccine_id
      WHERE vr.date_administered IS NOT NULL
        AND v.vaccine_name <> 'REGISTRATION FEE'
        AND COALESCE(p.is_lost, 0) = 0
        ${syntheticPetFilter("p")}
        ${syntheticVaccinationFilter}
      UNION ALL
      SELECT 'Consultation', cr.pet_id, cr.consultation_date, p.pet_owner_id
      FROM consultation_records cr
      JOIN pets p ON p.id = cr.pet_id
      WHERE cr.consultation_date IS NOT NULL
        AND COALESCE(p.is_lost, 0) = 0
        ${syntheticPetFilter("p")}
      UNION ALL
      SELECT 'Preventive Care', pc.pet_id, pc.date_administered, p.pet_owner_id
      FROM preventive_care_records pc
      JOIN pets p ON p.id = pc.pet_id
      WHERE pc.date_administered IS NOT NULL
        AND COALESCE(p.is_lost, 0) = 0
        ${syntheticPetFilter("p")}
      UNION ALL
      SELECT 'Procedure', pp.pet_id, pp.procedure_date, p.pet_owner_id
      FROM pet_procedures pp
      JOIN pets p ON p.id = pp.pet_id
      WHERE pp.procedure_date IS NOT NULL
        AND COALESCE(p.is_lost, 0) = 0
        ${syntheticPetFilter("p")}
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
    WITH ${buildServiceEventsCTE(includeSynthetic)},
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
    JOIN pets p ON p.id = cr.pet_id
    LEFT JOIN ret ON ret.id = cr.id
    WHERE cr.follow_up_date IS NOT NULL
      AND COALESCE(p.is_lost, 0) = 0
      ${syntheticPetFilter("p")}
  `;
    const [followUpRows] = await db.query(followUpSql);

    // Bucket the returns into the standard windows.
    const byServiceMap = new Map();
    const ownerRows = new Map();
    const returnDaysAll = [];
    const reportToday = parseISODate(toISODate(new Date()));

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
          eligible30: 0,
          eligible60: 0,
          eligible90: 0,
          never: 0,
          returnDays: [],
        });
      }
      const bucket = byServiceMap.get(row.service_type);
      bucket.episodes += 1;
      bucket.visits += Number(row.visits) || 1;
      bucket.pets.add(row.pet_id);
      const daysSinceService = serviceDate
        ? Math.floor((reportToday - serviceDate) / 86400000)
        : 0;
      for (const window of [30, 60, 90]) {
        if (daysSinceService >= window) bucket[`eligible${window}`] += 1;
      }

      if (days !== null) {
        bucket.returnDays.push(days);
        returnDaysAll.push(days);
        if (days <= 30 && daysSinceService >= 30) bucket.returned30 += 1;
        if (days <= 60 && daysSinceService >= 60) bucket.returned60 += 1;
        if (days <= 90 && daysSinceService >= 90) bucket.returned90 += 1;
      } else {
        bucket.never += 1;
      }

      if (!ownerRows.has(row.owner_id)) ownerRows.set(row.owner_id, []);
      ownerRows.get(row.owner_id).push({ serviceDate, returnedDate: returnedDate || null });
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
        eligible30: bucket.eligible30,
        eligible60: bucket.eligible60,
        eligible90: bucket.eligible90,
        neverReturned: bucket.never,
        returnRate30: bucket.eligible30 ? round((bucket.returned30 / bucket.eligible30) * 100) : null,
        returnRate60: bucket.eligible60 ? round((bucket.returned60 / bucket.eligible60) * 100) : null,
        returnRate90: bucket.eligible90 ? round((bucket.returned90 / bucket.eligible90) * 100) : null,
        avgDaysToReturn:
          average(bucket.returnDays) === null ? null : round(average(bucket.returnDays)),
      }))
      .sort((a, b) => b.episodes - a.episodes);

    // Follow-up adherence: appointments the vet scheduled and the owner kept.
    let honoured = 0;
    let missed = 0;
    let scheduled = 0;
    let followUpPending = 0;
    for (const row of followUpRows || []) {
      const due = parseISODate(row.follow_up_on);
      if (!due) continue;
      if (due > reportToday) {
        followUpPending += 1;
        continue;
      }
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
    for (const visitRows of ownerRows.values()) {
      const firstVisit = visitRows
        .filter((row) => row.serviceDate)
        .sort((a, b) => a.serviceDate - b.serviceDate)[0];
      if (!firstVisit || Math.floor((reportToday - firstVisit.serviceDate) / 86400000) < 90) continue;
      ownersServed += 1;
      if (
        firstVisit.returnedDate &&
        Math.floor((firstVisit.returnedDate - firstVisit.serviceDate) / 86400000) <= 90
      ) ownersReturned += 1;
    }

    const totalEpisodes = visits.length;
    const totalReturned30 = byService.reduce((sum, s) => sum + s.returned30, 0);
    const eligible30 = byService.reduce((sum, s) => sum + s.eligible30, 0);
    const eligible60 = byService.reduce((sum, s) => sum + s.eligible60, 0);
    const eligible90 = byService.reduce((sum, s) => sum + s.eligible90, 0);

    res.json({
      success: true,
      filterLabel: from && to ? `${from} to ${to}` : from ? `From ${from}` : to ? `Up to ${to}` : "All Time",
      windows: [30, 60, 90],
      summary: {
        episodes: totalEpisodes,
        returned30: totalReturned30,
        returned60: byService.reduce((sum, s) => sum + s.returned60, 0),
        returned90: byService.reduce((sum, s) => sum + s.returned90, 0),
        eligible30,
        eligible60,
        eligible90,
        neverReturned: byService.reduce((sum, s) => sum + s.neverReturned, 0),
        returnRate30: eligible30 ? round((totalReturned30 / eligible30) * 100) : null,
        avgDaysToReturn:
          average(returnDaysAll) === null ? null : round(average(returnDaysAll)),
      },
      byService,
      followUp: {
        scheduled,
        pending: followUpPending,
        honoured,
        missed,
        adherenceRate: scheduled ? round((honoured / scheduled) * 100) : 0,
      },
      retention: {
        ownersServed,
        ownersReturned,
        retentionRate: ownersServed ? round((ownersReturned / ownersServed) * 100) : null,
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
      includeSynthetic: req.query.includeSynthetic !== "false",
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
  saveFollowupContact,
  getReturnRate,
  getVaccinationTrends,
  OUTCOME_ORDER,
  DEFAULT_GRACE_DAYS,
};
