# Analytics & Reports: Tapos at Natitirang Gawain

**Huling update:** 22 Oktubre 2026
**Branch:** `main`

## Mga natapos

### Layout at shared controls
- Inayos ang Analytics & Reports layout; nasa ilalim ng title ang tab bar at nasa itaas ng content ang filters.
- Shared period filter (default This Year) para sa Overview, Compliance, at Reports; hiwalay ang controls ng Period Comparison.
- All Time: awtomatikong Off ang Compare at disabled ang Same Period Last Year / Previous Period.
- Max 6 charts; walang 1–2 slice na pie; naka-limit ang unang view ng malalaking table; may semantic colors at (i) tooltips ang KPI definitions.

### Overview
- 6 charts, kasama ang bagong Pet Profile by Sex doughnut.
- Tatlong Overview KPI card; inalis ang Lost Pets metric at ang Include synthetic 2025 seed data toggle.
- Synthetic 2025 demo rows ay nananatiling hindi kasama sa official analytics/report totals.
- Nasa collapsed `Comparison details` ang comparison table; nasa pinakailalim ang Data notes.
- Naka-hide ang data labels kapag zero o kapag higit 12 bars; walang bottom print row (nasa filter row na ang actions).

### Vaccine Compliance
- 4 sub-tabs: Summary, Service Return, Why Owners Don't Return, Follow-Up List.
- Findings bago ang breakdown; switch ng By Barangay / By Vaccine.
- Collapsed ang Funnel & days to return; nasa Service Return ang cohort retention.
- Barangay table: evaluated follow-ups lang ang columns, 8 rows default, naka-highlight ang lowest-3 (n ≥ 30), may small-sample tag.
- Follow-Up List: 8 compact columns, overdue badge, contact progress link, export ng page.
- Reasons tab: contact progress → owner-stated reasons → factors ang visual order; may empty-state link.

### Period Comparison
- 8 quick-compare metric chips na may delta; baseline < 5 ay raw change ang ipinapakita.
- Bars/Line toggle, peso ticks para sa Revenue, naka-sign ang percent changes.
- YTD badge sa kasalukuyang taon ng Year-over-Year Summary; last 6 rows ng period table at last 5 years ng yearly table.

### Reports
- Summary preview lang: KPIs, monthly chart, Top 5 barangays, species split; walang month-by-month table o Lost Pets KPI.
- Compliance preview: KPI, outcome doughnut, on-time line, Top 3 findings, Top owner-stated reasons.
- Grace period selector ay lumalabas lang para sa compliance report.
- Comparison preview: cards bago ang chart; yearly preview may “Change vs previous year” column.
- May preview-only note; buo ang tables sa print/export lang.
- Print footer: “Prepared by” at “Noted by: City Veterinarian” signature blocks at page numbers.

### Data, tests, at QA
- Synthetic 2025 seed data ay hindi ipinapasa sa official analytics/print paths at walang UI toggle para ihalo ito.
- Inayos ang `backend/test/petRegistrationValidation.test.js` (dynamic Manila dates) at `backend/test/security.test.js` (MySQL/Postgres `SUBSTRING_INDEX`/`SUBSTRING` mock).
- Weekly chart labels ay “Oct 12-18” at daily ay “Oct 9” na.
- **Frontend production build:** pumasa (pre-existing CSS/chunk warnings lang).
- **Full backend test suite:** 84/84 pumasa.
- **Authenticated browser QA:** 0 console errors, 0 failed requests; verified ang 6 charts, tab order, All Time compare state, compliance sub-tabs/breakdown/funnel, service cohort, reasons progress, 9 comparison chips, Reports grace visibility, summary-only preview, yearly change column, at print row removal.

## Mga natitira

1. **I-review ang build warnings.** May CSS syntax warning mula sa UTF-16/null-byte na stylesheet at warning tungkol sa malaking JS chunk. Hindi ito pumipigil sa build at wala sa saklaw ng Analytics redesign.
2. **Live/test database pass.** Na-validate sa tests at authenticated browser QA, pero hindi pa na-deploy o na-subok sa production database.

## Tandaan

May untracked na `seed_medicines.js` sa working tree. Hindi ito bahagi ng Analytics changes.
