# Analytics & Reports — Vaccine Follow-up Compliance + Period Comparison

## Goal (panel comment → requirement)

| Panel comment | Deliverable |
|---|---|
| "actual data analysis, hindi lang visualization" | Derived metrics (compliance rates, return rates, avg days to return, drop-off) — not just counts |
| "detailed reports about pet owner compliance in vaccine follow-ups" | Vaccine follow-up compliance analysis: did the owner come back for the next dose after being vaccinated? |
| "bumubalik ba yung pet owner after mabigyan ng vaccine **or kahit anong service**" | Two return metrics: (a) *dose compliance* — returned for the next dose of the same vaccine; (b) *service return* — returned for ANY service (vaccination / consultation / preventive care / procedure) within a window |
| "feature na pwedeng i-compare yung reports sa vaccination for daily, weekly, monthly, at yearly" | Comparison tab with a Daily/Weekly/Monthly/Yearly granularity toggle, and a Previous-Period ⟷ Same-Period-Last-Year baseline toggle, side-by-side chart + delta table + multi-year table |

## Decisions (confirmed with user)

1. **Tabbed page** at `/admin/analytics`: `Overview | Vaccine Compliance | Period Comparison | Reports`.
2. **Both baselines** available in the compare feature, toggleable.
3. **Fix both existing defects**: monthly-trend mis-ordering, and the revenue trend reading the wrong table.

## Stack facts (verified, not assumed)

- Node/Express backend + React 18 / Vite frontend. **No PHP.** DB layer is `mysql2` + `pg` behind `backend/src/config/db.js` with `backend/src/config/pgCompat.js` translating `?` → `$n` for Postgres. **All new SQL must stay dialect-neutral** (no `LATERAL`, no `DATE_FORMAT`/`TO_CHAR` grouping, no `INTERVAL` arithmetic on bare columns).
- Charts: `chart.js` 4.5 + `react-chartjs-2` 5.3 + `chartjs-plugin-datalabels` 2.2, all npm (no CDN). Only `CategoryScale, LinearScale, ArcElement, BarElement` are registered today — line charts need `LineElement, PointElement, Filler` added.
- Style palette: `--color-primary #c8102e`, accent `#c6a15b`, green `#1e7a46`, gold `#b8860b`. Existing `.report-tabs` / `.report-tab` / `.report-table` classes already in `frontend/src/index.css` (lines 6361–6539) — reuse them.
- Print: `frontend/src/utils/printReport.js` exposes `getPrintHeader`, `getSectionHeader`, `getPrintFooter`, `openPrintDocument` (A4, logo, watermark, signature block). `adminReportPrint.js` shows the established section-table pattern.

## Live data profile (probed against the real Postgres on 2026-10-21)

- 1,021 pets / 718 owners / 3,122 vaccination records / 228 consultations / 140 preventive care / 77 procedures.
- Vaccination dates 2024-08-20 → 2026-10-03; bulk in 2026-03…2026-09 (~350/month), tail 29 (Sep) / 3 (Oct).
- 3,118 episodes have `next_due_date` (4 records are the `REGISTRATION FEE` pseudo-vaccine → must be excluded).
- 708 pets have >1 vaccination record → multi-episode analysis is meaningful.
- `vaccine_schedules` defines intervals (5-in-1: dose1 28d, dose2 28d, dose3 365d, dose4 1095d; FVRCP: 28/28/365/365; Anti-Rabies: 365) and `vaccinationController.js:493-524` derives `next_due_date` from it → **`next_due_date` is the authoritative "due back" date**.
- Money: `payments` = 92 rows, Sept 2026 only (legacy). `payment_monitoring` = 190 rows, Sept–Oct 2026 (the table the staff report uses). → Revenue trend must read `payment_monitoring`.
- Pre-validated bucket results (evaluable episodes, i.e. `next_due_date <= CURRENT_DATE`):
  - Same-vaccine return: On Time 291 / Late 208 / Lapsed 264 / No Return 364 (≈1,415 evaluable, 1,703 Pending)
  - Any-service return: On Time 540 / Late 304 / Lapsed 296 / No Return 305
  - Consultations: 228 total → 94 returned ≤30d, 116 ≤60d, 143 ≤90d, 68 never; 212 have a `follow_up_date`

---

## 1. Backend

### 1.1 New `backend/src/utils/reportPeriods.js`
Pure-JS period math (no SQL dialect issues), used by both new controllers:
- `resolvePeriod(granularity, anchorDate)` → `{ from, to, label }` for `daily|weekly|monthly|yearly`
  - weekly = Monday-based (matches `mondayIndex()` in `backend/src/config/sql.js:49`, already used by `dateWhere`)
- `shiftPeriod(period, mode)` → baseline window (`previous` | `previousYear`)
- `bucketKey(date, granularity)` → `{ key, label, sort }` — labels built in JS so ordering is always chronological
- `rollUp(dailyRows, granularity)` → bucketed series
- `pctChange(current, baseline)` → `{ delta, pct }` (null-safe when baseline is 0)

### 1.2 New `backend/src/controllers/complianceController.js`

**`GET /api/analytics/vaccine-compliance`**
Query: `from`, `to` (window over `date_administered`), `grace` (default 30 days), `vaccineId`, `barangay`, `limit` (actionable list size, default 100).

Core SQL (dialect-neutral; correlated scalar subquery for "next same-vaccine dose"):

```sql
WITH episodes AS (
  SELECT vr.id, vr.pet_id, vr.vaccine_id, vr.date_administered, vr.next_due_date,
         (SELECT MIN(vr2.date_administered) FROM vaccination_records vr2
           WHERE vr2.pet_id = vr.pet_id AND vr2.vaccine_id = vr.vaccine_id
             AND vr2.date_administered > vr.date_administered) AS returned_same,
         (SELECT MIN(x.d) FROM (
             SELECT vr3.date_administered AS d FROM vaccination_records vr3 WHERE vr3.pet_id = vr.pet_id
             UNION ALL SELECT cr.consultation_date  FROM consultation_records cr  WHERE cr.pet_id = vr.pet_id
             UNION ALL SELECT pc.date_administered  FROM preventive_care_records pc WHERE pc.pet_id = vr.pet_id
             UNION ALL SELECT pp.procedure_date     FROM pet_procedures pp       WHERE pp.pet_id = vr.pet_id
          ) x WHERE x.d > vr.date_administered) AS returned_any
  FROM vaccination_records vr
  JOIN vaccines v ON v.id = vr.vaccine_id
  WHERE vr.next_due_date IS NOT NULL
    AND v.vaccine_name <> 'REGISTRATION FEE'
)
```

Outcome classification (applied in SQL via `CASE`, then bucketed):
`Pending` (due > today) · `On Time` (returned ≤ due) · `Late` (returned ≤ due + grace) · `Lapsed` (returned > due + grace) · `No Return` (never returned).

Response:
```
{ success, filterLabel, graceDays,
  summary: { episodes, pending, evaluable, onTime, late, lapsed, noReturn,
             onTimeRate, returnedRate, noReturnRate, avgDaysToReturn, medianDaysToReturn,
             distinctPets, distinctOwners, petsNeverReturning },
  buckets: [{ status, total, pct }],
  byBarangay: [{ barangay, episodes, onTime, late, noReturn, onTimeRate }],
  byVaccine:   [{ vaccine_name, episodes, onTime, late, noReturn, onTimeRate }],
  bySpecies:   [{ species, episodes, onTimeRate }],
  trend:       [{ period, episodes, onTime, rate }],      // monthly
  funnel:      { vaccinated, dueEvaluated, returned, onTime },
  actionable:  [{ pet_code, pet_name, owner_name, contact_number, barangay,
                   vaccine_name, dose_label, date_administered, next_due_date,
                   daysOverdue, lastServiceDate, status }] }
```
`actionable` = the actionable non-compliance list (Lapsed + No Return), joined to `pet_owners` for the contact number so the city can call them. Ordered by `daysOverdue DESC`.

**`GET /api/analytics/return-rate`**
"How do owners behave after ANY service?" — same `UNION ALL` service-event subquery applied to each service type:
- Per service type (`Vaccination`, `Consultation`, `Preventive Care`, `Procedure`): episodes, returned ≤30/60/90 days, never returned, return rate, avg days to return.
- `consultationFollowUp`: of consultations with a `follow_up_date`, how many had the pet return on/before that date (and how many missed it) — ties to `notificationScheduler.js:47-69` which already reminds owners about follow-ups.
- `ownerRetention`: of distinct owners served in the period, how many came back at least once within 90 days.

**`GET /api/analytics/vaccination-trends`** (the comparison engine)
Query: `granularity` (`daily|weekly|monthly|yearly`), `compare` (`previous|previousYear`), `anchor` (`YYYY-MM-DD`, default today), `from`/`to` optional override.

Approach: compute the current window and the baseline window in JS (`reportPeriods.js`), fetch **one** date-level aggregate over the union of both windows, then roll up in JS. One code path serves all four granularities and both baselines, and the label/order is always chronological (this is what fixes the existing mis-ordering bug).

Date-level SQL (dialect-neutral, no `DATE_FORMAT`):
```sql
SELECT vr.date_administered AS d,
       COUNT(*) AS doses,
       COUNT(DISTINCT vr.pet_id) AS pets,
       COUNT(DISTINCT p.pet_owner_id) AS owners
FROM vaccination_records vr JOIN pets p ON p.id = vr.pet_id
JOIN vaccines v ON v.id = vr.vaccine_id
WHERE v.vaccine_name <> 'REGISTRATION FEE' AND vr.date_administered BETWEEN ? AND ?
GROUP BY vr.date_administered
```
Plus a parallel daily aggregate for compliance outcomes (on-time / late / no-return per day) and for revenue from `payment_monitoring` (`COALESCE(consultation_date, DATE(created_at))`, `payment_status = 'Paid'`, `SUM(total_amount)`).

Response:
```
{ success, granularity, compare,
  current:  { label, from, to },
  baseline: { label, from, to },
  totals:   { current: {...}, baseline: {...}, delta, pctChange },
  series:   [{ key, label, current: {...}, baseline: {...}, delta, pctChange }],
  yearly:   [{ year, doses, pets, owners, onTime, evaluated, onTimeRate, revenue, pctChangeVsPrev }] }
```
Metric bundle per bucket: `doses`, `pets`, `owners`, `dueEvaluated`, `onTime`, `onTimeRate`, `revenue`.

`yearly` is always the full multi-year table (2024 → current year) so the "Yearly report with comparison" requirement is satisfied regardless of the active granularity.

### 1.3 Fixes in `backend/src/controllers/analyticsController.js`
1. **Monthly ordering bug** — `registrations` (line 243), `vaccinations` (line 199) and `paymentRevenue` (line 290) currently do `dateFormat(col,'month') … GROUP BY 1`, which groups/orders by a *string* (`'Apr 2025'`) → alphabetical mis-ordering across years. Replace with numeric `EXTRACT(YEAR FROM …)` / `EXTRACT(MONTH FROM …)` and build the `Jan 2026` label in JS.
2. **Revenue source** — `paymentRevenue` reads `payments` (legacy, 92 rows / Sept 2026 only) → switch to `payment_monitoring` (`total_amount`, `payment_status='Paid'`, `COALESCE(consultation_date, DATE(created_at))`), matching `staffReportController.js:262-291`.
3. **Dead code cleanup (optional, low risk)** — `dogsBySex` / `catsBySex` / `recentPets` / `recentPayments` / `recentQr` are fetched but never rendered; `revenueBarChartOptions` in `AnalyticsReports.jsx:150` is defined but unused. Remove the dead payloads and wire the revenue chart up instead.

### 1.4 Routes — `backend/src/routes/analyticsRoutes.js`
Add three routes with the identical guard used by the existing ones (`auth` + `requireRole(["Admin","Staff","Veterinarian"])`):
`GET /analytics/vaccine-compliance`, `GET /analytics/return-rate`, `GET /analytics/vaccination-trends`.

---

## 2. Frontend

### 2.1 `frontend/src/pages/admin/AnalyticsReports.jsx` → tabbed shell
- Keep the existing filter row + period label + `Print Report` button.
- Tab bar reusing `.report-tabs` / `.report-tab` / `.report-tab-count` from `index.css`.
- `Overview` tab = today's content (the 8 existing charts) + the newly wired revenue trend chart.
- `Vaccine Compliance` tab = §2.2.
- `Period Comparison` tab = §2.3.
- `Reports` tab = §2.4.
- Each tab fetches its own endpoint; state is kept per tab so switching back doesn't refetch. Use the existing `GlobalLoadingOverlay` for loading and `react-hot-toast` for errors (same as today).

### 2.2 New `frontend/src/components/analytics/CompliancePanel.jsx`
- KPI row (reuse `SummaryCard`): Evaluable Follow-ups, On-Time Rate, Late, No Return (drop-off), Avg Days to Return, Returned for Any Service.
- **Funnel** (plain divs, no chart lib): Vaccinated → Follow-up Due → Owner Came Back → Came Back On Time, with drop-off % between steps.
- Chart 1 — Doughnut: Follow-up outcome distribution.
- Chart 2 — Horizontal Bar: On-time rate by barangay (all 18, not top-10).
- Chart 3 — Bar/Line: monthly on-time rate trend.
- Chart 4 — Stacked Bar: compliance breakdown by vaccine (5-in-1 / FVRCP / Anti-Rabies).
- Chart 5 — Grouped Bar: return rate by service type at 30/60/90 days.
- **Actionable table** (`.report-table`): pet, owner, contact, barangay, vaccine, dose, date given, due date, days overdue, status — sortable, with a "Print compliance report" action.
- New `.analytics-delta-badge` styles for rate deltas.

### 2.3 New `frontend/src/components/analytics/ComparisonPanel.jsx`
- Granularity toggle: Daily / Weekly / Monthly / Yearly.
- Baseline toggle: Previous Period / Same Period Last Year.
- Chart 1 — Grouped Bar (2 datasets): current vs baseline per bucket.
- Chart 2 — Line: on-time rate, current vs baseline (needs `LineElement`, `PointElement`, `Filler` registered).
- **Comparison table**: metric rows × `Current | Baseline | Change | % Change`.
- **Yearly vaccination report table**: Year | Doses | Pets | Owners | On-Time Rate | Revenue | % Change vs Previous Year — always shown, this is the "yearly report with comparison".
- Manual refresh + anchor-date picker (so the panel can demo "August 2026 vs August 2025").

### 2.4 New `frontend/src/components/analytics/ReportsPanel.jsx` + print utils
- `frontend/src/utils/complianceReportPrint.js` → `printComplianceReport(payload, options)`: A4 doc with 7 numbered sections (summary cards, outcome breakdown, by barangay, by vaccine, monthly trend, actionable list, return-after-service).
- `frontend/src/utils/comparisonReportPrint.js` → `printComparisonReport(payload, options)`: current-vs-baseline summary, bucket table, and the yearly report table.
- `ReportsPanel` = card grid to pick the report + period, reusing `AdminReportModal`'s preset/month/year/exact-range controls (its `presetRange()` helper can be lifted to a shared util to avoid duplicating it).

### 2.5 CSS — `frontend/src/index.css`
Add (following the existing naming in the file):
`.analytics-tab-bar`, `.analytics-tab`, `.analytics-tab.is-active`, `.analytics-kpi-row`, `.analytics-delta-badge` (+ `--up/--down/--flat`), `.analytics-compare-table`, `.compliance-funnel`, `.compliance-funnel-step`, `.compliance-funnel-bar`, `.analytics-actionable-table`.
Reuse `.chart-card`, `.chart-card-canvas`, `.report-table*` rather than duplicating.

### 2.6 Housekeeping
- Delete the dead `frontend/src/components/analytics/SummaryCard.jsx` (imported nowhere) — the folder is being repurposed for the new components.

---

## 3. Implementation order

1. `backend/src/utils/reportPeriods.js` + unit tests → `backend/test/reportPeriods.test.js`.
2. `backend/src/controllers/complianceController.js` (3 handlers) → routes.
3. `analyticsController.js` fixes (ordering + revenue source) and re-verify the Overview payload.
4. `frontend/src/components/analytics/*` panels + tab shell + CSS.
5. Print utils + Reports panel.
6. Verification (below).

## 4. Verification

- `cd backend && npm test` — existing suite (`node --test test/*.test.js`) + new period-math tests (week boundaries, month/year rollovers, leap years, YoY shift on 29 Feb).
- `cd frontend && npm run build` — production build must pass (no lint script exists in this repo).
- Backend smoke: start `npm run dev`, hit the three new endpoints with an Admin JWT; assert the bucket counts match the probed baseline above (On Time 291 / Late 208 / Lapsed 264 / No Return 364 for same-vaccine; 540 / 304 / 296 / 305 for any-service) and that the ordering of the monthly series is chronological.
- Browser QA with the `browser-automation` skill on `/admin/analytics`: switch all four tabs, change granularity + baseline, confirm no console errors and no failed requests, screenshot each tab.
- Print check: open all three printed reports and confirm the A4 layout (header, numbered sections, tables, signature block) and that the actionable list is populated.

## 5. Out of scope

- No new DB tables — every metric is derived from existing data (`vaccination_records`, `consultation_records`, `preventive_care_records`, `pet_procedures`, `pets`, `pet_owners`, `payment_monitoring`).
- No changes to staff/vet/owner portals.
- Not fixing the `payments` vs `payment_monitoring` dual-table divergence beyond pointing the analytics revenue metric at `payment_monitoring`.
