/**
 * The vaccine "episode" query, shared by the compliance, return-rate and
 * period-comparison controllers.
 *
 * The central unit of analysis is a "vaccine episode": one row of
 * `vaccination_records`. A dose given on day X schedules the next dose on
 * `next_due_date` (derived from `vaccine_schedules.interval_days` when the
 * record is written), so an episode is "followed up" when the owner brings the
 * pet back for the next dose of the same vaccine.
 *
 * Outcomes:
 *   Pending   - the follow-up is not due yet
 *   On Time   - the owner came back on or before the due date
 *   Late      - the owner came back within `grace` days after the due date
 *   Lapsed    - the owner came back later than the grace window
 *   No Return - the owner never came back for that vaccine again
 *
 * All SQL is dialect-neutral (MySQL 8 and PostgreSQL). Lookups are done with
 * joins + GROUP BY instead of correlated subqueries, because MySQL only
 * supports correlated derived tables from 8.0.14 onwards. Every date that
 * leaves the backend is formatted in SQL via `dateFormat()`, so both engines
 * hand the client an identical 'YYYY-MM-DD' string.
 */

const { dateFormat } = require("../config/sql");

// "REGISTRATION FEE" (vaccines.id = 0) is a payment line item, not a vaccine.
const VACCINE_FILTER = "v.vaccine_name <> 'REGISTRATION FEE'";
const DEFAULT_GRACE_DAYS = 30;
const MAX_GRACE_DAYS = 365;
const OUTCOME_ORDER = ["On Time", "Late", "Lapsed", "No Return", "Pending"];

// Every service event a pet can show up for, as one addressable set.
const SERVICE_EVENTS_CTE = `
    service_events AS (
      SELECT pet_id, date_administered AS event_date FROM vaccination_records WHERE date_administered IS NOT NULL
      UNION ALL
      SELECT pet_id, consultation_date FROM consultation_records WHERE consultation_date IS NOT NULL
      UNION ALL
      SELECT pet_id, date_administered FROM preventive_care_records WHERE date_administered IS NOT NULL
      UNION ALL
      SELECT pet_id, procedure_date FROM pet_procedures WHERE procedure_date IS NOT NULL
    )`;

/**
 * Build the episode query.
 *
 * @param {object} opts
 * @param {number} opts.graceDays grace window in days before a return is "Late"
 * @param {string} [opts.where] extra predicate appended to the outer SELECT
 */
function buildEpisodeQuery({ graceDays, where = "" }) {
  return `
    WITH ${SERVICE_EVENTS_CTE},
    episodes AS (
      SELECT
        vr.id,
        vr.pet_id,
        vr.vaccine_id,
        vr.dose_no,
        vr.dose_label,
        vr.date_administered,
        vr.next_due_date,
        v.vaccine_name,
        p.pet_code,
        p.name AS pet_name,
        p.species_id,
        po.id AS owner_id,
        po.full_name AS owner_name,
        po.contact_number,
        po.barangay
      FROM vaccination_records vr
      JOIN pets p ON p.id = vr.pet_id
      JOIN pet_owners po ON po.id = p.pet_owner_id
      JOIN vaccines v ON v.id = vr.vaccine_id
      WHERE vr.next_due_date IS NOT NULL
        AND vr.date_administered IS NOT NULL
        AND ${VACCINE_FILTER}
    ),
    same_return AS (
      SELECT e.id AS episode_id, MIN(vr2.date_administered) AS returned_same
      FROM episodes e
      JOIN vaccination_records vr2
        ON vr2.pet_id = e.pet_id
       AND vr2.vaccine_id = e.vaccine_id
       AND vr2.date_administered > e.date_administered
      GROUP BY e.id
    ),
    any_return AS (
      SELECT e.id AS episode_id, MIN(se.event_date) AS returned_any
      FROM episodes e
      JOIN service_events se
        ON se.pet_id = e.pet_id
       AND se.event_date > e.date_administered
      GROUP BY e.id
    ),
    last_service AS (
      SELECT pet_id, MAX(event_date) AS last_service_date
      FROM service_events
      GROUP BY pet_id
    )
    SELECT
      e.id,
      e.pet_id,
      e.vaccine_id,
      e.vaccine_name,
      e.dose_no,
      e.dose_label,
      e.pet_code,
      e.pet_name,
      e.species_id,
      e.owner_id,
      e.owner_name,
      e.contact_number,
      e.barangay,
      ${dateFormat("e.date_administered", "date")} AS administered_on,
      ${dateFormat("e.next_due_date", "date")} AS due_on,
      ${dateFormat("sr.returned_same", "date")} AS returned_on,
      ${dateFormat("ar.returned_any", "date")} AS returned_on_any,
      ${dateFormat("ls.last_service_date", "date")} AS last_service_on,
      CASE
        WHEN e.next_due_date > CURRENT_DATE THEN 'Pending'
        WHEN sr.returned_same IS NULL THEN 'No Return'
        WHEN sr.returned_same <= e.next_due_date THEN 'On Time'
        WHEN sr.returned_same <= e.next_due_date + ${graceDays} THEN 'Late'
        ELSE 'Lapsed'
      END AS outcome,
      CASE
        WHEN e.next_due_date > CURRENT_DATE THEN 'Pending'
        WHEN ar.returned_any IS NULL THEN 'No Return'
        WHEN ar.returned_any <= e.next_due_date THEN 'On Time'
        WHEN ar.returned_any <= e.next_due_date + ${graceDays} THEN 'Late'
        ELSE 'Lapsed'
      END AS outcome_any,
      CASE WHEN sr.returned_same IS NULL THEN NULL ELSE sr.returned_same - e.date_administered END AS days_to_return,
      CASE WHEN sr.returned_same IS NULL THEN NULL ELSE sr.returned_same - e.next_due_date END AS days_late,
      CASE WHEN e.next_due_date > CURRENT_DATE THEN NULL ELSE CURRENT_DATE - e.next_due_date END AS days_overdue
    FROM episodes e
    LEFT JOIN same_return sr ON sr.episode_id = e.id
    LEFT JOIN any_return ar ON ar.episode_id = e.id
    LEFT JOIN last_service ls ON ls.pet_id = e.pet_id
    WHERE 1 = 1
    ${where}
  `;
}

module.exports = {
  VACCINE_FILTER,
  DEFAULT_GRACE_DAYS,
  MAX_GRACE_DAYS,
  OUTCOME_ORDER,
  SERVICE_EVENTS_CTE,
  buildEpisodeQuery,
};
