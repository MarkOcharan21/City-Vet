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
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { stepSize: 1, font: { family: "Inter" } },
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
      formatter: (value) => `₱${Number(value).toLocaleString()}`,
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

  useEffect(() => {
    if (tab !== "overview") return;

    setLoading(true);
    setError(null);
    setDashboard(null);

    let url = `/analytics/dashboard?filter=${filter}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;
    if (compare) url += `&compare=${compare}`;

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
  }, [tab, filter, from, to, compare, retryCount]);

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
                <SummaryCard label="Verified Pets" value={dashboard?.summary?.totalPets ?? '-'} />
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
                <div className="analytics-delta-row">
                  <span className="analytics-delta-row-label">
                    Comparing <strong>{dashboard.comparison.current?.label}</strong> vs <strong>{dashboard.comparison.baseline?.label}</strong>
                  </span>
                  <span className={`analytics-delta-badge analytics-delta-badge--${dashboard?.comparison?.totals?.registrations?.delta > 0 ? 'up' : dashboard?.comparison?.totals?.registrations?.delta < 0 ? 'down' : 'flat'}`}>
                    Registrations {fmtDelta(dashboard?.comparison?.totals?.registrations?.delta)}{dashboard?.comparison?.totals?.registrations?.pctChange != null ? ` (${Number(dashboard.comparison.totals.registrations.pctChange) > 0 ? '+' : ''}${Number(dashboard.comparison.totals.registrations.pctChange).toFixed(1)}%)` : ''}
                  </span>
                  <span className={`analytics-delta-badge analytics-delta-badge--${dashboard?.comparison?.totals?.doses?.delta > 0 ? 'up' : dashboard?.comparison?.totals?.doses?.delta < 0 ? 'down' : 'flat'}`}>
                    Vaccinations {fmtDelta(dashboard?.comparison?.totals?.doses?.delta)}{dashboard?.comparison?.totals?.doses?.pctChange != null ? ` (${Number(dashboard.comparison.totals.doses.pctChange) > 0 ? '+' : ''}${Number(dashboard.comparison.totals.doses.pctChange).toFixed(1)}%)` : ''}
                  </span>
                  <span className={`analytics-delta-badge analytics-delta-badge--${dashboard?.comparison?.totals?.revenue?.delta > 0 ? 'up' : dashboard?.comparison?.totals?.revenue?.delta < 0 ? 'down' : 'flat'}`}>
                    Revenue {fmtDelta(dashboard?.comparison?.totals?.revenue?.delta)}{dashboard?.comparison?.totals?.revenue?.pctChange != null ? ` (${Number(dashboard.comparison.totals.revenue.pctChange) > 0 ? '+' : ''}${Number(dashboard.comparison.totals.revenue.pctChange).toFixed(1)}%)` : ''}
                  </span>
                  <span className={`analytics-delta-badge analytics-delta-badge--${dashboard?.comparison?.totals?.consultations?.delta > 0 ? 'up' : dashboard?.comparison?.totals?.consultations?.delta < 0 ? 'down' : 'flat'}`}>
                    Consultations {fmtDelta(dashboard?.comparison?.totals?.consultations?.delta)}{dashboard?.comparison?.totals?.consultations?.pctChange != null ? ` (${Number(dashboard.comparison.totals.consultations.pctChange) > 0 ? '+' : ''}${Number(dashboard.comparison.totals.consultations.pctChange).toFixed(1)}%)` : ''}
                  </span>
                  <span className={`analytics-delta-badge analytics-delta-badge--${dashboard?.comparison?.totals?.qrIssued?.delta > 0 ? 'up' : dashboard?.comparison?.totals?.qrIssued?.delta < 0 ? 'down' : 'flat'}`}>
                    QR Issued {fmtDelta(dashboard?.comparison?.totals?.qrIssued?.delta)}{dashboard?.comparison?.totals?.qrIssued?.pctChange != null ? ` (${Number(dashboard.comparison.totals.qrIssued.pctChange) > 0 ? '+' : ''}${Number(dashboard.comparison.totals.qrIssued.pctChange).toFixed(1)}%)` : ''}
                  </span>
                  <span className={`analytics-delta-badge analytics-delta-badge--${dashboard?.comparison?.totals?.lostPets?.delta > 0 ? 'down' : dashboard?.comparison?.totals?.lostPets?.delta < 0 ? 'up' : 'flat'}`}>
                    Lost Pets {fmtDelta(dashboard?.comparison?.totals?.lostPets?.delta)}{dashboard?.comparison?.totals?.lostPets?.pctChange != null ? ` (${Number(dashboard.comparison.totals.lostPets.pctChange) > 0 ? '+' : ''}${Number(dashboard.comparison.totals.lostPets.pctChange).toFixed(1)}%)` : ''}
                  </span>
                  <span className={`analytics-delta-badge analytics-delta-badge--${dashboard?.comparison?.totals?.newOwners?.delta > 0 ? 'up' : dashboard?.comparison?.totals?.newOwners?.delta < 0 ? 'down' : 'flat'}`}>
                    New Owners {fmtDelta(dashboard?.comparison?.totals?.newOwners?.delta)}{dashboard?.comparison?.totals?.newOwners?.pctChange != null ? ` (${Number(dashboard.comparison.totals.newOwners.pctChange) > 0 ? '+' : ''}${Number(dashboard.comparison.totals.newOwners.pctChange).toFixed(1)}%)` : ''}
                  </span>
                </div>
              )}

              <h2>Analytics Graphs</h2>
              <p className="page-intro">
                Visual breakdown of registrations, demographics, vaccination activity,
                and QR records for the selected period.
              </p>

              <section className="analytics-chart-section">
                <div className="chart-grid chart-grid--1col">
                  <ChartCard title="Pets by Species" isEmpty={!hasChartData(dashboard?.species)}>
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

                  <ChartCard title="Registration Status" isEmpty={!hasChartData(dashboard?.registrationStatus)}>
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

                  <ChartCard title="Vaccination Compliance" isEmpty={!hasChartData(dashboard?.vaccinationStatus)}>
                    <Doughnut
                      options={circularChartOptions}
                      data={{
                        labels: dashboard?.vaccinationStatus.map((x) => x.status) || [],
                        datasets: [
                          {
                            data: dashboard?.vaccinationStatus.map((x) => x.total) || [],
                            backgroundColor: ["#c8102e", "#b8860b", "#1e7a46", "#6b6062"],
                            borderWidth: 0,
                          },
                        ],
                      }}
                    />
                  </ChartCard>

                  <ChartCard title="QR Statistics" isEmpty={!hasChartData(dashboard?.qrStats)}>
                    <Doughnut
                      options={circularChartOptions}
                      data={{
                        labels: dashboard?.qrStats.map((x) => x.status) || [],
                        datasets: [
                          {
                            data: dashboard?.qrStats.map((x) => x.total) || [],
                            backgroundColor: CHART_PALETTE,
                            borderWidth: 0,
                          },
                        ],
                      }}
                    />
                  </ChartCard>
                </div>
              </section>

              {compare && dashboard?.comparison?.yearly && Array.isArray(dashboard.comparison.yearly) && dashboard.comparison.yearly.length > 0 && (
                <section className="analytics-chart-section">
                  <h3 className="analytics-chart-section-title">Year-over-Year Summary</h3>
                  <p className="analytics-chart-section-desc">
                    Totals by year with change vs previous year for core metrics.
                  </p>
                  <div className="analytics-table-wrapper">
                    <table className="analytics-table analytics-table--yoy">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Registrations</th>
                          <th>Δ vs prev</th>
                          <th>Vaccinations (doses)</th>
                          <th>Δ vs prev</th>
                          <th>Revenue</th>
                          <th>Δ vs prev</th>
                          <th>Consultations</th>
                          <th>Δ vs prev</th>
                          <th>QR Issued</th>
                          <th>Δ vs prev</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.comparison.yearly.map((row) => (
                          <tr key={row.year}>
                            <td>{row.year}</td>
                            <td>{fmtNum(row.registrations)}</td>
                            <td>{fmtDelta(row.deltas?.registrations?.delta)}</td>
                            <td>{fmtNum(row.doses)}</td>
                            <td>{fmtDelta(row.deltas?.doses?.delta)}</td>
                            <td>₱{fmtNum(row.revenue)}</td>
                            <td>{fmtDelta(row.deltas?.revenue?.delta)}</td>
                            <td>{fmtNum(row.consultations)}</td>
                            <td>{fmtDelta(row.deltas?.consultations?.delta)}</td>
                            <td>{fmtNum(row.qrIssued)}</td>
                            <td>{fmtDelta(row.deltas?.qrIssued?.delta)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

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
