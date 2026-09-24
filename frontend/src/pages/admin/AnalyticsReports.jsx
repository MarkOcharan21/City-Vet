import { useEffect, useState } from "react";
import api from "../../services/api";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Bar, Pie, Doughnut } from "react-chartjs-2";

import { Printer, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import SummaryCard from "../../components/SummaryCard";
import AdminReportModal from "../../components/admin/AdminReportModal";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  Tooltip,
  Legend,
  ChartDataLabels
);

const CHART_PALETTE = ["#c8102e", "#c6a15b", "#1e7a46", "#b8860b", "#7a0c1e"];

const FILTER_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
];

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
      grid: { color: "rgba(36, 20, 22, 0.06)" },
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
      grid: { color: "rgba(36, 20, 22, 0.06)" },
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
      grid: { color: "rgba(36, 20, 22, 0.06)" },
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

function hasChartData(items, valueKey = "total") {
  return Array.isArray(items) && items.some((item) => Number(item[valueKey]) > 0);
}

export default function AnalyticsReports() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [printOpen, setPrintOpen] = useState(false);

  const filterLabel =
    dashboard?.filterLabel ||
    FILTER_OPTIONS.find((option) => option.key === filter)?.label ||
    "All Time";

  useEffect(() => {
    setLoading(true);
    setError(null);

    let url = `/analytics/dashboard?filter=${filter}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;

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
  }, [filter, from, to, retryCount]);

  return (
    <div className="page">
      <div className="page-header-row admin-page-header admin-page-header--actions">
        <div>
          <h1>Analytics & Reports</h1>
          <p className="page-intro">
            Review clinic metrics, export dashboard reports, and monitor recent
            activity across registrations, vaccinations, and QR records.
          </p>
        </div>
        <button type="button" onClick={() => setPrintOpen(true)} className="btn-primary">
          <Printer size={16} /> Print Report
        </button>
      </div>

      <AdminReportModal open={printOpen} onClose={() => setPrintOpen(false)} />

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
        <div style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Custom Range:</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ width: '140px', padding: '0.4rem 0.75rem' }}
            title="From date"
          />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ width: '140px', padding: '0.4rem 0.75rem' }}
            title="To date"
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { setFrom(''); setTo(''); }}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            disabled={!from && !to}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="summary-row">
        <SummaryCard label="Registered Pets" value={dashboard?.summary?.totalPets ?? '—'} />
        <SummaryCard
          label="Vaccinated Pets"
          value={dashboard?.summary?.vaccinatedPets ?? '—'}
          color="#1e7a46"
        />
        <SummaryCard
          label="Lost Pets"
          value={dashboard?.summary?.lostPets ?? '—'}
          color="#c8102e"
        />
        <SummaryCard
          label="Generated QR"
          value={dashboard?.summary?.totalQr ?? '—'}
          color="#c6a15b"
        />
      </div>

      <h2>Analytics Graphs</h2>
      <p className="page-intro">
        Visual breakdown of registrations, demographics, vaccination activity,
        and QR records for the selected period.
      </p>

      <section className="analytics-chart-section">
        <div className="chart-grid analytics-chart-1col">
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

          <ChartCard title="Monthly Pet Registrations" isEmpty={!hasChartData(dashboard?.registrations)}>
            <Bar
              options={barChartOptions}
              data={{
                labels: dashboard?.registrations.map((x) => x.month) || [],
                datasets: [
                  {
                    label: "Registrations",
                    data: dashboard?.registrations.map((x) => x.total) || [],
                    backgroundColor: "#7a0c1e",
                    borderRadius: 6,
                  },
                ],
              }}
            />
          </ChartCard>
        </div>

        <div className="chart-grid analytics-chart-1col">
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

        <div className="chart-grid analytics-chart-1col">
          <ChartCard title="Vaccinations Per Month" isEmpty={!hasChartData(dashboard?.vaccinations)}>
            <Bar
              options={barChartOptions}
              data={{
                labels: dashboard?.vaccinations.map((x) => x.month) || [],
                datasets: [
                  {
                    label: "Vaccinations",
                    data: dashboard?.vaccinations.map((x) => x.total) || [],
                    backgroundColor: "#1e7a46",
                    borderRadius: 6,
                  },
                ],
              }}
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