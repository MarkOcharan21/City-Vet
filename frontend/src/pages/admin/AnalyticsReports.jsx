import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

import { Bar, Doughnut } from "react-chartjs-2";

import toast from "react-hot-toast";
import SummaryCard from "../../components/SummaryCard";
import GlobalLoadingOverlay from "../../components/GlobalLoadingOverlay";
import AdminReportModal from "../../components/admin/AdminReportModal";
import CompliancePanel from "../../components/analytics/CompliancePanel";
import PeriodComparisonPanel from "../../components/analytics/PeriodComparisonPanel";
import ReportsPanel from "../../components/analytics/ReportsPanel";
import AnalyticsToolbar from "../../components/analytics/AnalyticsToolbar";
import ComparisonSummary from "../../components/analytics/ComparisonSummary";
import {
  formatDateRange,
  getBaselinePeriodRange,
  getSelectedPeriodLabel,
  getSelectedPeriodRange,
} from "../../utils/analyticsPeriods";
import {
  COMPARISON_SUMMARY_KEYS,
  buildComparisonExplanation,
  buildComparisonRows,
} from "../../utils/comparisonExplanation";
import "../../components/analytics/chartSetup";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "compliance", label: "Vaccine Compliance" },
  { key: "comparison", label: "Period Comparison" },
  { key: "reports", label: "Reports" },
];

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function barLabelFormatter(value, context) {
  const labels = context?.chart?.data?.labels || [];
  if (Number(value) === 0) return '';
  if (labels.length > 12) return '';
  return value;
}

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
      formatter: barLabelFormatter,
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
      formatter: (value, context) => {
        if (Number(value) === 0) return '';
        if ((context?.chart?.data?.labels || []).length > 12) return '';
        return `₱${Number(value).toLocaleString()}`;
      },
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

function buildYearComparisonChartData(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { labels: MONTH_LABELS, datasets: [] };
  const years = Array.from(new Set(rows.map((r) => r.year).filter((y) => y))).sort().slice(-2);
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

function countDistinctYears(rows) {
  if (!Array.isArray(rows)) return 0;
  const years = new Set(rows.map((r) => r.year).filter((y) => y !== null && y !== undefined));
  return years.size;
}

function hasPositiveValues(items, valueKey = "total") {
  return Array.isArray(items) && items.some((item) => Number(item[valueKey]) > 0);
}

function getBaselineDeltaLabel(comparison, key) {
  const current = Number(comparison?.totals?.current?.[key]) || 0;
  const baseline = Number(comparison?.totals?.baseline?.[key]) || 0;
  const delta = current - baseline;
  if (baseline < 5) {
    if (baseline === 0 && current > 0) return `New · ${fmtDelta(delta)} vs baseline`;
    return `${fmtDelta(delta)} vs baseline`;
  }
  const percent = (delta / baseline) * 100;
  return `${fmtDelta(delta)} (${percent > 0 ? '+' : ''}${percent.toFixed(1)}%) vs baseline`;
}

function buildOverviewInsights(dashboard) {
  const findings = [];
  const verified = Number(dashboard.summary?.totalPets) || 0;
  const vaccinated = Number(dashboard.summary?.vaccinatedPets) || 0;
  if (verified > 0) {
    findings.push(`${fmtNum(vaccinated)} of ${fmtNum(verified)} verified pets (${((vaccinated / verified) * 100).toFixed(1)}%) have a vaccine record in this period.`);
  }
  const topBarangay = dashboard.barangays?.[0];
  if (topBarangay && verified > 0) {
    findings.push(`${topBarangay.barangay} has the most registrations (${fmtNum(topBarangay.total)}, ${((Number(topBarangay.total || 0) / verified) * 100).toFixed(1)}% of the total).`);
  }
  const dueStatus = dashboard.vaccinationStatus || [];
  const overdue = Number(dueStatus.find((row) => row.status === 'Overdue')?.total) || 0;
  const noRecord = Number(dueStatus.find((row) => row.status === 'No Record')?.total) || 0;
  const statusTotal = dueStatus.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
  if (statusTotal > 0 && (overdue > 0 || noRecord > 0)) {
    findings.push(`${fmtNum(overdue)} pets (${((overdue / statusTotal) * 100).toFixed(1)}%) are overdue for a vaccine and ${fmtNum(noRecord)} have no vaccine record.`);
  }
  const doseChange = dashboard.comparison?.totals?.doses;
  const doseBaseline = Number(dashboard.comparison?.totals?.baseline?.doses) || 0;
  if (doseChange && doseBaseline >= 5 && doseChange.pctChange != null) {
    const direction = Number(doseChange.delta) > 0 ? 'up' : Number(doseChange.delta) < 0 ? 'down' : 'unchanged';
    findings.push(`Vaccinations are ${direction} ${Math.abs(Number(doseChange.pctChange)).toFixed(1)}% vs the baseline period.`);
  }
  return findings.slice(0, 3);
}

export default function AnalyticsReports() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [complianceSubTab, setComplianceSubTab] = useState("summary");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [from, setFrom] = useState(() => getSelectedPeriodRange('year', '', '').from);
  const [to, setTo] = useState(() => getSelectedPeriodRange('year', '', '').to);
  const [compare, setCompare] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [printOpen, setPrintOpen] = useState(false);

  const periodRange = { from, to };
  const baselineRange = getBaselinePeriodRange(periodRange, compare);
  const periodLabel = formatDateRange(periodRange) || getSelectedPeriodLabel('custom', from, to);
  const compareDisabled = !from || !to;

  const overviewComparisonRows = useMemo(() => {
    if (!compare || !dashboard?.comparison) return [];
    return buildComparisonRows({
      current: dashboard.comparison.totals?.current,
      baseline: dashboard.comparison.totals?.baseline,
      deltas: dashboard.comparison.totals,
      keys: COMPARISON_SUMMARY_KEYS,
    });
  }, [compare, dashboard]);

  const overviewExplanations = useMemo(() => {
    if (!compare || !dashboard?.comparison) return [];
    return buildComparisonExplanation({
      rows: overviewComparisonRows,
      series: dashboard.comparison.series || [],
      primaryKey: 'doses',
      currentLabel:
        formatDateRange(dashboard.comparison.current) ||
        dashboard.comparison.current?.label ||
        'the current period',
      baselineLabel:
        formatDateRange(dashboard.comparison.baseline) ||
        dashboard.comparison.baseline?.label ||
        'the baseline period',
      currentPartial: dashboard.comparison.current?.partial,
      baselinePartial: dashboard.comparison.baseline?.partial,
    });
  }, [compare, dashboard, overviewComparisonRows]);

  useEffect(() => {
    if (compareDisabled && compare) setCompare('');
  }, [compareDisabled, compare]);

  const handleCompareChange = (next) => {
    setCompare(next);
  };

  useEffect(() => {
    if (tab !== "overview") return;

    setLoading(true);
    setError(null);
    setDashboard(null);

    let url = `/analytics/dashboard?filter=all`;
    if (periodRange.from) url += `&from=${periodRange.from}`;
    if (periodRange.to) url += `&to=${periodRange.to}`;
    if (compare && !compareDisabled) url += `&compare=${compare}`;

    api
      .get(url)
      .then((res) => {
        setDashboard({
          ...res.data,
          from: res.data.from || periodRange.from,
          to: res.data.to || periodRange.to,
          summary: res.data.summary ?? {},
          dataQuality: res.data.dataQuality ?? {},
          species: res.data.species ?? [],
          vaccinations: res.data.vaccinations ?? [],
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
  }, [tab, periodRange.from, periodRange.to, compare, compareDisabled, retryCount]);

  return (
    <div className="page analytics-page">
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
      {tab !== 'comparison' && (
        <AnalyticsToolbar
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          compare={compare}
          onCompareChange={handleCompareChange}
          compareDisabled={compareDisabled}
          onPrint={tab === 'overview' ? () => setPrintOpen(true) : undefined}
          onReports={tab === 'overview' ? () => setTab('reports') : undefined}
          printLabel="Print overview"
          reportsLabel="More reports →"
        />
      )}
      {tab === "overview" && (
        <>
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
              <div className="summary-row summary-row--three">
                <SummaryCard
                  label="Verified Pet Registrations"
                  value={dashboard.summary?.totalPets ?? '-'}
                  hint="Verified pet records grouped by registration date (encoded date is used when registration date is missing)."
                  sub={compare && dashboard.comparison ? [{ label: 'vs baseline', value: getBaselineDeltaLabel(dashboard.comparison, 'registrations') }] : undefined}
                />
                <SummaryCard
                  label="Vaccinated Pets"
                  value={dashboard?.summary?.vaccinatedPets ?? '-'}
                  color="#1e7a46"
                  hint="Distinct pets with at least one vaccine record in the selected service-date range."
                  sub={compare && dashboard.comparison ? [{ label: 'vs baseline', value: getBaselineDeltaLabel(dashboard.comparison, 'pets') }] : undefined}
                />
                <SummaryCard
                  label="Generated QR"
                  value={dashboard?.summary?.totalQr ?? '-'}
                  color="#c6a15b"
                  hint="QR codes generated for verified pets in the selected period."
                  sub={compare && dashboard.comparison ? [{ label: 'vs baseline', value: getBaselineDeltaLabel(dashboard.comparison, 'qrIssued') }] : undefined}
                />
              </div>

              {compare && dashboard.comparison ? (
                <ComparisonSummary
                  title="Current vs baseline at a glance"
                  subtitle="Every headline metric for the selected period and its baseline."
                  currentLabel={
                    formatDateRange(dashboard.comparison.current) ||
                    dashboard.comparison.current?.label ||
                    'Current period'
                  }
                  baselineLabel={
                    formatDateRange(dashboard.comparison.baseline) ||
                    dashboard.comparison.baseline?.label ||
                    'Baseline period'
                  }
                  rows={overviewComparisonRows}
                  explanations={overviewExplanations}
                  note={dashboard.comparison.current?.partial ? 'Current period is still in progress' : undefined}
                />
              ) : null}

              <section className="analytics-overview-findings">
                <div>
                  <h2>Key Findings</h2>
                  <ul>
                    {buildOverviewInsights(dashboard).map((finding) => <li key={finding}>{finding}</li>)}
                    {!buildOverviewInsights(dashboard).length && <li>Not enough verified records in this period to identify a meaningful trend.</li>}
                  </ul>
                  {Number(dashboard.vaccinationStatus?.find((row) => row.status === 'Overdue')?.total || 0) > 0 && (
                    <button type="button" className="analytics-inline-link analytics-overdue-action" onClick={() => {
                      setComplianceSubTab("summary");
                      setTab("compliance");
                    }}>
                      <span>Review overdue vaccine follow-ups</span>
                      <span className="analytics-overdue-action-arrow" aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
                <div className="analytics-pending-stat">
                  <strong>{fmtNum(dashboard.registrationStatus?.find((row) => /pending/i.test(row.status))?.total || 0)}</strong>
                  <span>Pending verification</span>
                  {Number(dashboard.registrationStatus?.find((row) => /pending/i.test(row.status))?.total) > 0 && (
                    <button type="button" className="analytics-inline-link" onClick={() => navigate('/admin/registration-records')}>
                      Open registration records →
                    </button>
                  )}
                </div>
              </section>

              <h2>Analytics Graphs</h2>
              <p className="page-intro">
                Each chart answers a different question: what pets are registered, where they live, how activity changes over time, and which pets need vaccine attention. Use the descriptions below to interpret the counts and decide where to follow up.
              </p>

              <section className="analytics-chart-section">
                <div className="chart-grid">
                  <ChartCard title="Verified Pets by Species" description="Counts verified pets by species for this period. Use the mix to understand which animals are served and plan species-specific supplies or outreach." isEmpty={!hasPositiveValues(dashboard?.species)}>
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

                  <ChartCard title="Pet Profile by Sex" description="Shows verified pets in each recorded sex category. “Unknown” means the record has no usable sex value." isEmpty={!hasPositiveValues(dashboard?.petsBySex)}>
                    <Doughnut
                      options={circularChartOptions}
                      data={{
                        labels: (dashboard.petsBySex || []).map((row) => row.sex || 'Unknown'),
                        datasets: [{
                          data: (dashboard.petsBySex || []).map((row) => row.total),
                          backgroundColor: ["#c6a15b", "#7a0c1e", "#1e7a46", "#6b6062"],
                          borderWidth: 0,
                        }],
                      }}
                    />
                  </ChartCard>

                  <ChartCard
                    title={countDistinctYears(dashboard?.registrations) >= 2 ? "Monthly Pet Registrations (Year-over-Year)" : "Monthly Pet Registrations"}
                    description="Compares verified registrations by month. When two years are available, each color represents a year; use the trend to spot seasonal changes."
                    tall
                    isEmpty={!hasPositiveValues(dashboard?.registrations)}
                  >
                    <Bar
                      options={countDistinctYears(dashboard?.registrations) >= 2 ? groupedYearBarChartOptions : barChartOptions}
                      data={
                        countDistinctYears(dashboard?.registrations) >= 2
                          ? buildYearComparisonChartData(dashboard?.registrations)
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
                  <ChartCard title="Top 10 Barangays" description="Ranks barangays by verified pets in this period. Higher counts show where registered pets are concentrated and can help guide outreach planning." tall isEmpty={!hasPositiveValues(dashboard?.barangays)}>
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

                <div className="chart-grid">
                  <ChartCard
                    title={countDistinctYears(dashboard?.vaccinations) >= 2 ? "Vaccinations Per Month (Year-over-Year)" : "Vaccinations Per Month"}
                    description="Counts vaccine doses by service month, not unique pets. Compare months to understand changes in clinic vaccination workload."
                    isEmpty={!hasPositiveValues(dashboard?.vaccinations)}
                  >
                    <Bar
                      options={countDistinctYears(dashboard?.vaccinations) >= 2 ? groupedYearBarChartOptions : barChartOptions}
                      data={
                        countDistinctYears(dashboard?.vaccinations) >= 2
                          ? buildYearComparisonChartData(dashboard?.vaccinations)
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
                    title="Latest Vaccine Due Status (verified pets)"
                    description="Groups verified pets by their latest recorded vaccine status. Overdue and No Record counts can guide follow-up; use Vaccine Compliance to review due episodes."
                    isEmpty={!hasPositiveValues(dashboard?.vaccinationStatus)}
                  >
                    {(dashboard.vaccinationStatus || []).filter((row) => Number(row.total) > 0).length >= 3 ? (
                      <Doughnut
                        options={circularChartOptions}
                        data={{
                          labels: dashboard.vaccinationStatus.map((x) => x.status),
                          datasets: [{
                            data: dashboard.vaccinationStatus.map((x) => x.total),
                            backgroundColor: dashboard.vaccinationStatus.map((x) => ({
                              "Up to Date": "#1e7a46", "Due Soon": "#b8860b",
                              Overdue: "#c8102e", "No Record": "#6b6062",
                            }[x.status] || "#6b6062")),
                            borderWidth: 0,
                          }],
                        }}
                      />
                    ) : (
                      <div className="analytics-status-summary">
                        {(dashboard.vaccinationStatus || []).map((row) => (
                          <div key={row.status} className={`analytics-status-summary-row analytics-status-summary-row--${row.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            <span>{row.status}</span><strong>{fmtNum(row.total)}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </ChartCard>
                </div>
              </section>

              <details className="analytics-data-notes analytics-details" id="analytics-data-notes">
                <summary>Data notes</summary>
                <div className="summary-row">
                  <SummaryCard label="Verified pets without barangay" value={fmtNum(dashboard.dataQuality?.missingBarangay)} />
                  <SummaryCard label="Vaccine records without due date" value={fmtNum(dashboard.dataQuality?.missingDueDate)} />
                  <SummaryCard label="Late-encoded registrations" value={fmtNum(dashboard.dataQuality?.lateEncodedRegistrations)} />
                  <SummaryCard label="Late-encoded vaccinations" value={fmtNum(dashboard.dataQuality?.lateEncodedVaccinations)} />
                </div>
                <p className="analytics-chart-section-desc">
                  Verified pets are grouped by registration date; vaccination counts use service date and exclude registration fees. Revenue is paid ledger activity only.
                </p>
              </details>
            </>
          )}
        </>
      )}

      {tab === "compliance" && <CompliancePanel from={periodRange.from} to={periodRange.to} initialSubTab={complianceSubTab} compare={compare} baselineFrom={baselineRange?.from} baselineTo={baselineRange?.to} />}
      {tab === "comparison" && <PeriodComparisonPanel />}
      {tab === "reports" && (
        <ReportsPanel
          from={periodRange.from}
          to={periodRange.to}
          periodLabel={periodLabel}
          compare={compare}
          baselineFrom={baselineRange?.from}
          baselineTo={baselineRange?.to}
          onOpenFollowups={() => {
            setComplianceSubTab("followups");
            setTab("compliance");
          }}
        />
      )}

      <AdminReportModal open={printOpen} onClose={() => setPrintOpen(false)} />
    </div>
  );
}

function ChartCard({ title, description, children, isEmpty = false, tall = false }) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      {description && <p className="analytics-visual-explanation">{description}</p>}
      <div className={`chart-card-canvas${tall ? " chart-card-canvas--tall" : ""}`}>
        {isEmpty ? (
          <div className="chart-card-empty"><p>No data available for this period.</p><small>Try a wider date range or check that records have been verified or entered for the selected dates.</small></div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
