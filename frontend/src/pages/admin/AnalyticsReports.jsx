import { useEffect, useState } from "react";
import api from "../../services/api";

import { Bar, Pie, Doughnut } from "react-chartjs-2";

import { Printer } from "lucide-react";
import toast from "react-hot-toast";
import SummaryCard from "../../components/SummaryCard";
import GlobalLoadingOverlay from "../../components/GlobalLoadingOverlay";
import AdminReportModal from "../../components/admin/AdminReportModal";
import CompliancePanel from "../../components/analytics/CompliancePanel";
import ComparisonPanel from "../../components/analytics/ComparisonPanel";
import ReportsPanel from "../../components/analytics/ReportsPanel";
import "../../components/analytics/chartSetup";

const CHART_PALETTE = ["#c8102e", "#c6a15b", "#1e7a46", "#b8860b", "#7a0c1e"];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "compliance", label: "Vaccine Compliance" },
  { key: "comparison", label: "Period Comparison" },
  { key: "reports", label: "Reports" },
];

const FILTER_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
];

const COMPARE_OPTIONS = [
  { key: "", label: "Off" },
  { key: "previousYear", label: "Same Period Last Year" },
  { key: "previous", label: "Previous Period" },
];

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#241416",
      padding: 12,
      cornerRadius: 8,
    },
    datalabels: {
      anchor: 'end',
      align: 'bottom',
      offset: 4,
      font: { family: "Inter", size: 11, weight: 'bold' },
      color: '#ffffff',
      textStrokeColor: 'rgba(36, 20, 22, 0.9)',
      textStrokeWidth: 3,
      clamp: false,
      clip: false,
      formatter: (value) => Number(value) === 0 ? '' : value,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { family: "Inter" } },
    },
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1, font: { family: "Inter" } },
      grid: { color: 'rgba(36, 20, 22, 0.06)' },
      suggestedMax: (context) => {
        const max = Math.max(...(context.chart.data.datasets[0]?.data || [0]));
        return max * 1.25;
      },
    },
  },
  layout: {
    padding: { top: 24 },
  },
};

const circularChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        padding: 16,
        usePointStyle: true,
        font: { family: "Inter", size: 12 },
      },
    },
    tooltip: {
      backgroundColor: "#241416",
      padding: 12,
      cornerRadius: 8,
    },
    datalabels: {
      color: '#fff',
      font: { family: "Inter", size: 12, weight: 'bold' },
      textStrokeColor: 'rgba(36, 20, 22, 0.9)',
      textStrokeWidth: 3,
      formatter: (value) => value,
    },
  },
};

const horizontalBarChartOptions = {
  ...barChartOptions,
  indexAxis: "y",
  plugins: {
    legend: { display: false },
    tooltip: barChartOptions.plugins.tooltip,
    datalabels: {
      anchor: 'end',
      align: 'left',
      offset: -4,
      font: { family: "Inter", size: 11, weight: 'bold' },
      color: '#ffffff',
      textStrokeColor: 'rgba(36, 20, 22, 0.9)',
      textStrokeWidth: 3,
      clamp: false,
      clip: false,
      formatter: (value) => Number(value) === 0 ? '' : value,
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { stepSize: 10, font: { family: "Inter" } },
      grid: { color: 'rgba(36, 20, 22, 0.06)' },
      suggestedMax: (context) => {
        const max = Math.max(...(context.chart.data.datasets[0]?.data || [0]));
        return max * 1.25;
      },
    },
    y: {
      grid: { display: false },
      ticks: { font: { family: "Inter", size: 11 } },
    },
  },
  layout: {
    padding: { right: 24 },
  },
};

const revenueBarChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#241416",
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => `₱${Number(ctx.parsed.y || 0).toLocaleString()}`,
      },
    },
    datalabels: {
      anchor: 'end',
      align: 'bottom',
      offset: 4,
      font: { family: "Inter", size: 11, weight: 'bold' },
      color: '#ffffff',
      textStrokeColor: 'rgba(36, 20, 22, 0.9)',
      textStrokeWidth: 3,
      formatter: (value) => Number(value) === 0 ? '' : `₱${Number(value).toLocaleString()}`,
      clamp: false,
      clip: false,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { family: "Inter" } },
    },
    y: {
      beginAtZero: true,
      ticks: {
        font: { family: "Inter" },
        callback: (value) => `₱${Number(value).toLocaleString()}`,
      },
      grid: { color: 'rgba(36, 20, 22, 0.06)' },
      suggestedMax: (context) => {
        const max = Math.max(...(context.chart.data.datasets[0]?.data || [0]));
        return max * 1.25;
      },
    },
  },
  layout: {
    padding: { top: 24 },
  },
};

const groupedYearBarChartOptions = {
  ...barChartOptions,
  plugins: {
    ...barChartOptions.plugins,
    legend: {
      display: true,
      position: "bottom",
      labels: {
        padding: 14,
        usePointStyle: true,
        font: { family: "Inter", size: 12 },
      },
    },
  },
};

const groupedYearRevenueChartOptions = {
  ...revenueBarChartOptions,
  plugins: {
    ...revenueBarChartOptions.plugins,
    legend: {
      display: true,
      position: "bottom",
      labels: {
        padding: 14,
        usePointStyle: true,
        font: { family: "Inter", size: 12 },
      },
    },
  },
};

function fmtNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

function fmtDelta(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toLocaleString('en-US')}`;
}

function fmtPct(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  return Number.isFinite(n) ? `${n > 0 && !String(value).startsWith('-') ? '+' : ''}${n.toFixed(1)}%` : '—';
}

function deltaTone(delta, invert = false) {
  const n = Number(delta);
  if (!Number.isFinite(n) || n === 0) return 'flat';
  const up = invert ? n < 0 : n > 0;
  return up ? 'up' : 'down';
}

function getComparisonMetric(dashboard, key) {
  return dashboard?.comparison?.totals?.[key] || null;
}

function buildGroupedYearDatasets(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { labels: MONTH_LABELS, datasets: [] };
  const years = Array.from(new Set(rows.map((r) => r.year).filter((y) => y))).sort();
  const palette = ["#c8102e", "#c6a15b", "#1e7a46", "#b8860b", "#7a0c1e"];
  const datasets = years.map((year, idx) => ({
    label: String(year),
    data: MONTH_LABELS.map((month, mIdx) => {
      const match = rows.find((r) => r.year === year && Number(r.monthNum) === mIdx + 1);
      return Number(match?.total) || 0;
    }),
    backgroundColor: palette[idx % palette.length],
    borderRadius: 6,
  }));
  return { labels: MONTH_LABELS, datasets };
}

function distinctYears(rows) {
  if (!Array.isArray(rows)) return 0;
  const years = new Set(rows.map((r) => r.year).filter((y) => y !== null && y !== undefined));
  return years.size;
}

function hasChartData(items, valueKey = "total") {
  return Array.isArray(items) && items.some((item) => Number(item[valueKey]) > 0);
}

export default function AnalyticsReports() {
  const [tab, setTab] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [compare, setCompare] = useState("previousYear");
  const [retryCount, setRetryCount] = useState(0);
  const [printOpen, setPrintOpen] = useState(false);

  const filterLabel =
    dashboard?.filterLabel ||
    FILTER_OPTIONS.find((option) => option.key === filter)?.label ||
    "All Time";
  const compareDisabled = (filter === 'all' && !from && !to) || Boolean(from) !== Boolean(to);

  useEffect(() => {
    if (tab !== "overview") return;

    setLoading(true);
    setError(null);
    setDashboard(null);

    let url = `/analytics/dashboard?filter=${filter}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;
    if (compare && !compareDisabled) url += `&compare=${compare}`;

    api
      .get(url)
      .then((res) => {
        setDashboard({
          ...res.data,
          from: res.data.from || from,
          to: res.data.to || to,
          barangays: res.data.barangays ?? [],
          registrationStatus: res.data.registrationStatus ?? [],
          registrations: res.data.registrations ?? [],
          petsBySex: res.data.petsBySex ?? [],
          vaccinationStatus: res.data.vaccinationStatus ?? [],
          paymentRevenue: res.data.paymentRevenue ?? [],
        });
      })
      .catch((err) => {
        const message =
          err.response?.data?.message || "Failed to load analytics dashboard.";
        setError(message);
        setDashboard(null);
        toast.error(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tab, filter, from, to, compare, compareDisabled, retryCount]);

  return (
    <div className="page">
      <div className="page-header-row admin-page-header">
        <div>
          <h1>Analytics & Reports</h1>
          <p className="page-intro">
            Review clinic metrics, measure vaccine follow-up compliance, compare
            periods, and export printable reports.
          </p>
        </div>

        <section className="analytics-chart-section">
          <h3 className="analytics-chart-section-title">Key Findings</h3>
          <ul>
            <li>
              {fmtNum(dashboard.summary?.totalPets)} verified pets were registered in the selected registration-date range.
            </li>
            <li>
              {fmtNum(dashboard.summary?.vaccinatedPets)} unique pets had at least one vaccine record in the selected service-date range.
            </li>
            {dashboard.barangays?.[0] && (
              <li>
                {dashboard.barangays[0].barangay} has the most verified pet records in this range ({fmtNum(dashboard.barangays[0].total)}).
              </li>
            )}
            {(dashboard.dataQuality?.lateEncodedRegistrations || dashboard.dataQuality?.lateEncodedVaccinations) > 0 && (
              <li>
                Some records were encoded after their service/registration date; interpret encode-date trends separately.
              </li>
            )}
          </ul>
          <p>Recommendations: verify missing owner location and due-date data, and use recorded owner responses—not missing transactions—to explain missed follow-ups.</p>
        </section>

        <section className="analytics-chart-section">
          <h3 className="analytics-chart-section-title">Data Quality</h3>
          <div className="summary-row">
            <SummaryCard label="Verified pets without barangay" value={fmtNum(dashboard.dataQuality?.missingBarangay)} />
            <SummaryCard label="Vaccine records without due date" value={fmtNum(dashboard.dataQuality?.missingDueDate)} />
            <SummaryCard label="Late-encoded registrations" value={fmtNum(dashboard.dataQuality?.lateEncodedRegistrations)} />
            <SummaryCard label="Late-encoded vaccinations" value={fmtNum(dashboard.dataQuality?.lateEncodedVaccinations)} />
          </div>
          <p className="analytics-chart-section-desc">
            Registrations use registration_date (fallback: encoded date); vaccination trends use date_administered. Late encoding is counted when the stored date is later than the service date.
          </p>
        </section>

        <p className="analytics-chart-section-desc">
          Definitions: verified pets = verified records registered in range; vaccinated pets = distinct pets with a vaccination in range; doses = vaccine records; revenue = paid ledger entries only.
        </p>
        {(dashboard.dataQuality?.syntheticSeedPets || dashboard.dataQuality?.syntheticSeedVaccinations || dashboard.dataQuality?.syntheticSeedPayments) > 0 && (
          <p className="analytics-warning">
            Synthetic 2025 seed data is included in this period: {fmtNum(dashboard.dataQuality.syntheticSeedPets)} pets, {fmtNum(dashboard.dataQuality.syntheticSeedVaccinations)} vaccine records, and {fmtNum(dashboard.dataQuality.syntheticSeedPayments)} payments. Do not treat these rows as real clinic activity.
          </p>
        )}
      </div>

      <div className="report-tabs" role="tablist" aria-label="Analytics sections">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={tab === entry.key}
            className={`report-tab${tab === entry.key ? " is-active" : ""}`}
            onClick={() => setTab(entry.key)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      {compareDisabled && (
        <p className="analytics-chart-section-desc">
          Choose a date range or a finite time filter to compare periods; an all-time total cannot be compared to a single rolling window.
        </p>
      )}

      {tab === "overview" && (
        <>
          <p className="analytics-period-label">
            Showing data for: <strong>{filterLabel}</strong>
          </p>

          <div className="analytics-filter-row" role="group" aria-label="Analytics time period">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={filter === option.key}
                onClick={() => setFilter(option.key)}
                className={`analytics-filter-btn${filter === option.key ? " is-active" : ""}`}
              >
                {option.label}
              </button>
            ))}
            <div className="analytics-inline-field">
              <label htmlFor="overview-from">Custom Range</label>
              <input
                id="overview-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                title="From date"
              />
              <span className="analytics-inline-separator">to</span>
              <input
                id="overview-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                title="To date"
              />
              <button
                type="button"
                className="btn-secondary analytics-filter-action"
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
                disabled={!from && !to}
              >
                Clear
              </button>
            </div>
            <div className="analytics-toggle-group">
              <span className="analytics-toggle-label">Compare to</span>
              {COMPARE_OPTIONS.map((option) => (
                <button
                  key={option.key || "off"}
                  type="button"
                  aria-pressed={compare === option.key}
                  onClick={() => setCompare(option.key)}
                  disabled={compareDisabled}
                  className={`analytics-filter-btn${compare === option.key ? " is-active" : ""}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {loading && <GlobalLoadingOverlay visible={true} message="Loading analytics data..." />}

          {!loading && error && (
            <div className="analytics-error-state">
              <p>{error}</p>
              <button type="button" className="btn-secondary" onClick={() => setRetryCount((c) => c + 1)}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && dashboard && (
            <>
              <div className="summary-row">
                <SummaryCard label="Verified Pet Registrations" value={dashboard?.summary?.totalPets ?? '-'} />
                <SummaryCard
                  label="Vaccinated Pets"
                  value={dashboard?.summary?.vaccinatedPets ?? '-'}
                  color="#1e7a46"
                />
                <SummaryCard
                  label="Lost Pets"
                  value={dashboard?.summary?.lostPets ?? '-'}
                  color="#c8102e"
                />
                <SummaryCard
                  label="Generated QR"
                  value={dashboard?.summary?.totalQr ?? '-'}
                  color="#c6a15b"
                />
              </div>

              {compare && dashboard?.comparison && (
                <section className="analytics-chart-section">
                  <h3 className="analytics-chart-section-title">
                    Comparing {dashboard.comparison.current?.label} vs {dashboard.comparison.baseline?.label}
                    {dashboard.comparison.current?.partial ? ' · Partial current period' : ''}
                  </h3>
                  <div className="report-table-wrapper">
                    <table className="report-table">
                      <thead><tr><th>Metric</th><th>Current</th><th>Baseline</th><th>Change</th><th>% Change</th></tr></thead>
                      <tbody>
                        {[
                          ['registrations', 'Verified pet registrations'],
                          ['doses', 'Vaccine doses'],
                          ['revenue', 'Paid revenue'],
                          ['consultations', 'Consultations'],
                          ['qrIssued', 'QR codes issued'],
                          ['lostPets', 'Verified lost pets'],
                          ['newOwners', 'New owners'],
                        ].map(([key, label]) => {
                          const currentValue = dashboard.comparison.totals?.current?.[key] ?? 0;
                          const baselineValue = dashboard.comparison.totals?.baseline?.[key] ?? 0;
                          const change = dashboard.comparison.totals?.[key] || {};
                          const format = (value) => key === 'revenue'
                            ? `₱${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            : fmtNum(value);
                          const percent = change.pctChange == null
                            ? (Number(baselineValue) === 0 && Number(currentValue) > 0 ? 'New' : 'N/A (baseline <5)')
                            : `${Number(change.pctChange) > 0 ? '+' : ''}${Number(change.pctChange).toFixed(1)}%`;
                          return <tr key={key}><td>{label}</td><td>{format(currentValue)}</td><td>{format(baselineValue)}</td><td>{fmtDelta(change.delta)}</td><td>{percent}</td></tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <h2>Analytics Graphs</h2>
              <p className="page-intro">
                Visual breakdown of registrations, demographics, vaccination activity,
                and QR records for the selected period.
              </p>

              <section className="analytics-chart-section">
                <div className="chart-grid">
                  <ChartCard title="Verified Pets by Species" isEmpty={!hasChartData(dashboard?.species)}>
                    <Bar
                      options={barChartOptions}
                      data={{
                        labels: dashboard?.species.map((x) => x.species) || [],
                        datasets: [
                          {
                            label: "Pets",
                            data: dashboard?.species.map((x) => x.total) || [],
                            backgroundColor: "#c8102e",
                            borderRadius: 6,
                          },
                        ],
                      }}
                    />
                  </ChartCard>

                  <ChartCard title="Pet Sex Distribution" isEmpty={!hasChartData(dashboard?.petsBySex)}>
                    <Doughnut
                      options={circularChartOptions}
                      data={{
                        labels: dashboard?.petsBySex.map((x) => x.sex || "Unknown") || [],
                        datasets: [
                          {
                            data: dashboard?.petsBySex.map((x) => x.total) || [],
                            backgroundColor: ["#c8102e", "#c6a15b", "#7a0c1e"],
                            borderWidth: 0,
                          },
                        ],
                      }}
                    />
                  </ChartCard>

                  <ChartCard title="Pet Verification Status" isEmpty={!hasChartData(dashboard?.registrationStatus)}>
                    <Pie
                      options={circularChartOptions}
                      data={{
                        labels: dashboard?.registrationStatus.map((x) => x.status) || [],
                        datasets: [
                          {
                            data: dashboard?.registrationStatus.map((x) => x.total) || [],
                            backgroundColor: CHART_PALETTE,
                            borderWidth: 0,
                          },
                        ],
                      }}
                    />
                  </ChartCard>

                  <ChartCard
                    title={distinctYears(dashboard?.registrations) >= 2 ? "Monthly Pet Registrations (Year-over-Year)" : "Monthly Pet Registrations"}
                    isEmpty={!hasChartData(dashboard?.registrations)}
                  >
                    <Bar
                      options={distinctYears(dashboard?.registrations) >= 2 ? groupedYearBarChartOptions : barChartOptions}
                      data={
                        distinctYears(dashboard?.registrations) >= 2
                          ? buildGroupedYearDatasets(dashboard?.registrations)
                          : {
                              labels: dashboard?.registrations.map((x) => x.month) || [],
                              datasets: [
                                {
                                  label: "Registrations",
                                  data: dashboard?.registrations.map((x) => x.total) || [],
                                  backgroundColor: "#7a0c1e",
                                  borderRadius: 6,
                                },
                              ],
                            }
                      }
                    />
                  </ChartCard>
                </div>

                <div className="chart-grid chart-grid--1col">
                  <ChartCard
                    title="Top Barangays Registration Cabuyao"
                    tall
                    isEmpty={!hasChartData(dashboard?.barangays)}
                  >
                    <Bar
                      options={horizontalBarChartOptions}
                      data={{
                        labels: dashboard?.barangays.map((x) => x.barangay) || [],
                        datasets: [
                          {
                            label: "Pets",
                            data: dashboard?.barangays.map((x) => x.total) || [],
                            backgroundColor: "#c6a15b",
                            borderRadius: 6,
                          },
                        ],
                      }}
                    />
                  </ChartCard>
                </div>
              </section>

              <section className="analytics-chart-section">
                <h3 className="analytics-chart-section-title">Vaccination & Health</h3>
                <p className="analytics-chart-section-desc">
                  Monitor vaccination volume, compliance status, and QR issuance across
                  registered pets.
                </p>

                <div className="chart-grid chart-grid--1col">
                  <ChartCard
                    title={distinctYears(dashboard?.vaccinations) >= 2 ? "Vaccinations Per Month (Year-over-Year)" : "Vaccinations Per Month"}
                    isEmpty={!hasChartData(dashboard?.vaccinations)}
                  >
                    <Bar
                      options={distinctYears(dashboard?.vaccinations) >= 2 ? groupedYearBarChartOptions : barChartOptions}
                      data={
                        distinctYears(dashboard?.vaccinations) >= 2
                          ? buildGroupedYearDatasets(dashboard?.vaccinations)
                          : {
                              labels: dashboard?.vaccinations.map((x) => x.month) || [],
                              datasets: [
                                {
                                  label: "Vaccinations",
                                  data: dashboard?.vaccinations.map((x) => x.total) || [],
                                  backgroundColor: "#1e7a46",
                                  borderRadius: 6,
                                },
                              ],
                            }
                      }
                    />
                  </ChartCard>

                  <ChartCard
                    title={distinctYears(dashboard?.paymentRevenue) >= 2 ? "Revenue Collected Per Month (Year-over-Year)" : "Revenue Collected Per Month"}
                    isEmpty={!hasChartData(dashboard?.paymentRevenue)}
                  >
                    <Bar
                      options={distinctYears(dashboard?.paymentRevenue) >= 2 ? groupedYearRevenueChartOptions : revenueBarChartOptions}
                      data={
                        distinctYears(dashboard?.paymentRevenue) >= 2
                          ? buildGroupedYearDatasets(dashboard?.paymentRevenue)
                          : {
                              labels: dashboard?.paymentRevenue.map((x) => x.month) || [],
                              datasets: [
                                {
                                  label: "Revenue",
                                  data: dashboard?.paymentRevenue.map((x) => x.total) || [],
                                  backgroundColor: "#c6a15b",
                                  borderRadius: 6,
                                },
                              ],
                            }
                      }
                    />
                  </ChartCard>

                  <ChartCard title="Latest Vaccine Due Status (verified pets)" isEmpty={!hasChartData(dashboard?.vaccinationStatus)}>
                    <Doughnut
                      options={circularChartOptions}
                      data={{
                        labels: dashboard?.vaccinationStatus.map((x) => x.status) || [],
                        datasets: [
                          {
                            data: dashboard?.vaccinationStatus.map((x) => x.total) || [],
                            backgroundColor: dashboard?.vaccinationStatus.map((x) => ({
                              "Up to Date": "#1e7a46",
                              "Due Soon": "#b8860b",
                              Overdue: "#c8102e",
                              "No Record": "#6b6062",
                            }[x.status] || "#6b6062")) || [],
                            borderWidth: 0,
                          },
                        ],
                      }}
                    />
                  </ChartCard>
                </div>
              </section>

              <div className="analytics-print-row">
                <button type="button" className="btn-primary" onClick={() => setPrintOpen(true)}>
                  <Printer size={16} /> Print Report
                </button>
                <button type="button" className="btn-secondary" onClick={() => setTab("reports")}>
                  Open Reports
                </button>
              </div>
            </>
          )}
        </>
      )}

      {tab === "compliance" && <CompliancePanel />}
      {tab === "comparison" && <ComparisonPanel />}
      {tab === "reports" && <ReportsPanel />}

      <AdminReportModal open={printOpen} onClose={() => setPrintOpen(false)} />
    </div>
  );
}

function ChartCard({ title, children, isEmpty = false, tall = false }) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className={`chart-card-canvas${tall ? " chart-card-canvas--tall" : ""}`}>
        {isEmpty ? (
          <p className="chart-card-empty">No data available for this period.</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
