import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

import { Bar, Doughnut } from "react-chartjs-2";

import toast from "react-hot-toast";
import SummaryCard from "../../components/SummaryCard";
import GlobalLoadingOverlay from "../../components/GlobalLoadingOverlay";
import AdminReportModal from "../../components/admin/AdminReportModal";
import CompliancePanel from "../../components/analytics/CompliancePanel";
import ComparisonPanel from "../../components/analytics/ComparisonPanel";
import ReportsPanel from "../../components/analytics/ReportsPanel";
import AnalyticsPeriodFilter, {
  getAnalyticsPeriodLabel,
  getAnalyticsPeriodRange,
} from "../../components/analytics/AnalyticsPeriodFilter";
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

function buildGroupedYearDatasets(rows) {
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

function distinctYears(rows) {
  if (!Array.isArray(rows)) return 0;
  const years = new Set(rows.map((r) => r.year).filter((y) => y !== null && y !== undefined));
  return years.size;
}

function hasChartData(items, valueKey = "total") {
  return Array.isArray(items) && items.some((item) => Number(item[valueKey]) > 0);
}

function getComparisonLabel(comparison, key) {
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

function buildOverviewFindings(dashboard) {
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
  const [period, setPeriod] = useState("year");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [compare, setCompare] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [printOpen, setPrintOpen] = useState(false);

  const periodRange = getAnalyticsPeriodRange(period, from, to);
  const periodLabel = dashboard?.filterLabel || getAnalyticsPeriodLabel(period, from, to);
  const compareDisabled = period === 'all' || (period === 'custom' && (!from || !to));

  useEffect(() => {
    if (compareDisabled && compare) setCompare('');
  }, [compareDisabled, compare]);

  useEffect(() => {
    if (tab !== "overview") return;

    setLoading(true);
    setError(null);
    setDashboard(null);

    const filter = period === 'custom' ? 'all' : period;
    let url = `/analytics/dashboard?filter=${filter}`;
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
  }, [tab, period, periodRange.from, periodRange.to, compare, compareDisabled, retryCount]);

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
        <AnalyticsPeriodFilter
          period={period}
          onPeriodChange={(next) => {
            setPeriod(next);
            if (next !== 'custom') {
              setFrom('');
              setTo('');
            }
          }}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          compare={compare}
          onCompareChange={setCompare}
          compareDisabled={compareDisabled}
          onPrint={tab === 'overview' ? () => setPrintOpen(true) : undefined}
          onReports={tab === 'overview' ? () => setTab('reports') : undefined}
        />
      )}
      {tab === "overview" && (
        <>
          <p className="analytics-period-label">
            Showing: <strong>{periodLabel}</strong>
          </p>

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
                  sub={compare && dashboard.comparison ? [{ label: 'vs baseline', value: getComparisonLabel(dashboard.comparison, 'registrations') }] : undefined}
                />
                <SummaryCard
                  label="Vaccinated Pets"
                  value={dashboard?.summary?.vaccinatedPets ?? '-'}
                  color="#1e7a46"
                  hint="Distinct pets with at least one vaccine record in the selected service-date range."
                  sub={compare && dashboard.comparison ? [{ label: 'vs baseline', value: getComparisonLabel(dashboard.comparison, 'pets') }] : undefined}
                />
                <SummaryCard
                  label="Generated QR"
                  value={dashboard?.summary?.totalQr ?? '-'}
                  color="#c6a15b"
                  hint="QR codes generated for verified pets in the selected period."
                  sub={compare && dashboard.comparison ? [{ label: 'vs baseline', value: getComparisonLabel(dashboard.comparison, 'qrIssued') }] : undefined}
                />
              </div>

              <section className="analytics-overview-findings">
                <div>
                  <h2>Key Findings</h2>
                  <ul>
                    {buildOverviewFindings(dashboard).map((finding) => <li key={finding}>{finding}</li>)}
                    {!buildOverviewFindings(dashboard).length && <li>Not enough verified records in this period to identify a meaningful trend.</li>}
                  </ul>
                  {Number(dashboard.vaccinationStatus?.find((row) => row.status === 'Overdue')?.total || 0) > 0 && (
                    <button type="button" className="analytics-inline-link" onClick={() => {
                      setComplianceSubTab("summary");
                      setTab("compliance");
                    }}>
                      Review overdue vaccine follow-ups →
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

              {compare && dashboard?.comparison && (
                <details className="analytics-details">
                  <summary>
                    Comparison details — {dashboard.comparison.current?.label} vs {dashboard.comparison.baseline?.label}
                    {dashboard.comparison.current?.partial ? ' (partial current period)' : ''}
                  </summary>
                  <p className="analytics-chart-section-desc">Changes compare the selected period with its baseline. Percentage change is unavailable for baselines below five; “New” means the current period has a value while the baseline is zero.</p>
                  <div className="report-table-wrapper analytics-table-scroll">
                    <table className="report-table">
                      <thead><tr><th>Metric</th><th>Current</th><th>Baseline</th><th>Change</th><th>% Change</th></tr></thead>
                      <tbody>
                        {[
                          ['registrations', 'Verified pet registrations'],
                          ['doses', 'Vaccine doses'],
                          ['revenue', 'Paid revenue'],
                          ['consultations', 'Consultations'],
                          ['qrIssued', 'QR codes issued'],
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
                </details>
              )}

              <h2>Analytics Graphs</h2>
              <p className="page-intro">
                Each chart answers a different question: what pets are registered, where they live, how activity changes over time, and which pets need vaccine attention. Use the descriptions below to interpret the counts and decide where to follow up.
              </p>

              <section className="analytics-chart-section">
                <div className="chart-grid">
                  <ChartCard title="Verified Pets by Species" description="Counts verified pets by species for this period. Use the mix to understand which animals are served and plan species-specific supplies or outreach." isEmpty={!hasChartData(dashboard?.species)}>
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

                  <ChartCard title="Pet Profile by Sex" description="Shows verified pets in each recorded sex category. “Unknown” means the record has no usable sex value." isEmpty={!hasChartData(dashboard?.petsBySex)}>
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
                    title={distinctYears(dashboard?.registrations) >= 2 ? "Monthly Pet Registrations (Year-over-Year)" : "Monthly Pet Registrations"}
                    description="Compares verified registrations by month. When two years are available, each color represents a year; use the trend to spot seasonal changes."
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

                <div className="chart-grid">
                  <ChartCard title="Top 10 Barangays" description="Ranks barangays by verified pets in this period. Higher counts show where registered pets are concentrated and can help guide outreach planning." tall isEmpty={!hasChartData(dashboard?.barangays)}>
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
                    title={distinctYears(dashboard?.vaccinations) >= 2 ? "Vaccinations Per Month (Year-over-Year)" : "Vaccinations Per Month"}
                    description="Counts vaccine doses by service month, not unique pets. Compare months to understand changes in clinic vaccination workload."
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
                    title="Latest Vaccine Due Status (verified pets)"
                    description="Groups verified pets by their latest recorded vaccine status. Overdue and No Record counts can guide follow-up; use Vaccine Compliance to review due episodes."
                    isEmpty={!hasChartData(dashboard?.vaccinationStatus)}
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

      {tab === "compliance" && <CompliancePanel from={periodRange.from} to={periodRange.to} initialSubTab={complianceSubTab} />}
      {tab === "comparison" && <ComparisonPanel />}
      {tab === "reports" && (
        <ReportsPanel
          from={periodRange.from}
          to={periodRange.to}
          periodLabel={periodLabel}
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
