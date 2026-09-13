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

import toast from "react-hot-toast";
import { getPrintFooter, getPrintHeader, getSectionHeader, openPrintDocument } from "../../utils/printReport";
import SummaryCard from "../../components/SummaryCard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  Tooltip,
  Legend,
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
    },
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
  },
};

const horizontalBarChartOptions = {
  ...barChartOptions,
  indexAxis: "y",
  scales: {
    x: {
      beginAtZero: true,
      ticks: { stepSize: 1, font: { family: "Inter" } },
      grid: { color: "rgba(36, 20, 22, 0.06)" },
    },
    y: {
      grid: { display: false },
      ticks: { font: { family: "Inter", size: 11 } },
    },
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
    },
  },
};

function hasChartData(items, valueKey = "total") {
  return Array.isArray(items) && items.some((item) => Number(item[valueKey]) > 0);
}

function formatTableRows(items, columns, emptyMessage) {
  if (!items?.length) {
    return `<tr><td colspan="${columns}"><em>${emptyMessage}</em></td></tr>`;
  }

  return items
    .map(
      (row) => `
        <tr>
          ${row.map((cell) => `<td>${cell}</td>`).join("")}
        </tr>
      `,
    )
    .join("");
}

export default function AnalyticsReports() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [retryCount, setRetryCount] = useState(0);

  const filterLabel =
    dashboard?.filterLabel ||
    FILTER_OPTIONS.find((option) => option.key === filter)?.label ||
    "All Time";

  // ===============================
  // PRINT DASHBOARD
  // ===============================

  function printAnalyticsReport() {
    if (!dashboard) return;

    openPrintDocument({
      title: "Analytics Report",
      bodyHtml: `
        ${getPrintHeader("Analytics Report")}
        <p class="report-meta">
          Period: ${filterLabel}<br>
          Generated: ${new Date().toLocaleString()}
        </p>

        ${getSectionHeader(1, 'REPORT SUMMARY')}
        <div class="summary">
          <div class="card">
            <strong>Registered Pets</strong>
            ${dashboard.summary.totalPets}
          </div>
          <div class="card">
            <strong>Vaccinated Pets</strong>
            ${dashboard.summary.vaccinatedPets}
          </div>
          <div class="card">
            <strong>Lost Pets</strong>
            ${dashboard.summary.lostPets}
          </div>
          <div class="card">
            <strong>Generated QR</strong>
            ${dashboard.summary.totalQr}
          </div>
        </div>

        ${getSectionHeader(2, 'PETS BY SPECIES')}
        <table>
          <thead>
            <tr>
              <th>Species</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
          ${dashboard.species.length === 0
            ? '<tr><td colspan="2"><em>No species data found.</em></td></tr>'
            : dashboard.species
              .map(
                (x) => `
              <tr>
                <td>${x.species}</td>
                <td>${x.total}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        ${getSectionHeader(3, 'QR STATISTICS')}
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
          ${formatTableRows(
            dashboard.qrStats.map((x) => [x.status, x.total]),
            2,
            "No QR data found.",
          )}
          </tbody>
        </table>

        ${getSectionHeader(4, 'PETS BY BARANGAY')}
        <table>
          <thead>
            <tr>
              <th>Barangay</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
          ${formatTableRows(
            dashboard.barangays.map((x) => [x.barangay, x.total]),
            2,
            "No barangay data found.",
          )}
          </tbody>
        </table>

        ${getSectionHeader(5, 'REGISTRATION STATUS')}
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
          ${formatTableRows(
            dashboard.registrationStatus.map((x) => [x.status, x.total]),
            2,
            "No registration status data found.",
          )}
          </tbody>
        </table>

        ${getSectionHeader(6, 'MONTHLY PET REGISTRATIONS')}
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
          ${formatTableRows(
            dashboard.registrations.map((x) => [x.month, x.total]),
            2,
            "No registration trend data found.",
          )}
          </tbody>
        </table>

        ${getSectionHeader(7, 'PETS BY SEX')}
        <table>
          <thead>
            <tr>
              <th>Sex</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
          ${formatTableRows(
            dashboard.petsBySex.map((x) => [x.sex || "Unknown", x.total]),
            2,
            "No sex distribution data found.",
          )}
          </tbody>
        </table>

        ${getSectionHeader(8, 'VACCINATION COMPLIANCE')}
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
          ${formatTableRows(
            dashboard.vaccinationStatus.map((x) => [x.status, x.total]),
            2,
            "No vaccination compliance data found.",
          )}
          </tbody>
        </table>

        ${getPrintFooter()}
      `,
    });
  }

  useEffect(() => {
    setLoading(true);
    setError(null);

    api
      .get(`/analytics/dashboard?filter=${filter}`)
      .then((res) => {
        setDashboard({
          ...res.data,
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
  }, [filter, retryCount]);

  if (loading) {
    return (
      <div className="page">
        <h1>Analytics & Reports</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="page">
        <h1>Analytics & Reports</h1>
        <p className="form-error">{error || "Unable to load dashboard."}</p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setRetryCount((count) => count + 1)}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header-row admin-page-header">
        <h1 style={{ whiteSpace: 'nowrap' }}>Analytics &amp; Reports</h1>
        <p className="page-intro">
          Review clinic metrics, export dashboard reports, and monitor recent
          activity across registrations, vaccinations, and QR records.
        </p>
      </div>

      <div className="analytics-print-row">
        <button type="button" onClick={printAnalyticsReport} className="btn-primary">
          Print Report
        </button>
      </div>

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
      </div>

      <div className="summary-row">
        <SummaryCard label="Registered Pets" value={dashboard.summary.totalPets} />
        <SummaryCard
          label="Vaccinated Pets"
          value={dashboard.summary.vaccinatedPets}
          color="#1e7a46"
        />
        <SummaryCard
          label="Lost Pets"
          value={dashboard.summary.lostPets}
          color="#c8102e"
        />
        <SummaryCard
          label="Generated QR"
          value={dashboard.summary.totalQr}
          color="#c6a15b"
        />
      </div>

      <h2>Analytics Graphs</h2>
      <p className="page-intro">
        Visual breakdown of registrations, demographics, vaccination activity,
        and QR records for the selected period.
      </p>

      <section className="analytics-chart-section">
        <h3 className="analytics-chart-section-title">Registration & Demographics</h3>
        <p className="analytics-chart-section-desc">
          Track where pets are registered, how they are classified, and how
          registration volume changes over time.
        </p>

        <div className="chart-grid">
          <ChartCard title="Pets by Species" isEmpty={!hasChartData(dashboard.species)}>
            <Bar
              options={barChartOptions}
              data={{
                labels: dashboard.species.map((x) => x.species),
                datasets: [
                  {
                    label: "Pets",
                    data: dashboard.species.map((x) => x.total),
                    backgroundColor: "#c8102e",
                    borderRadius: 6,
                  },
                ],
              }}
            />
          </ChartCard>

          <ChartCard title="Pet Sex Distribution" isEmpty={!hasChartData(dashboard.petsBySex)}>
            <Doughnut
              options={circularChartOptions}
              data={{
                labels: dashboard.petsBySex.map((x) => x.sex || "Unknown"),
                datasets: [
                  {
                    data: dashboard.petsBySex.map((x) => x.total),
                    backgroundColor: ["#c8102e", "#c6a15b", "#7a0c1e"],
                    borderWidth: 0,
                  },
                ],
              }}
            />
          </ChartCard>

          <ChartCard title="Registration Status" isEmpty={!hasChartData(dashboard.registrationStatus)}>
            <Pie
              options={circularChartOptions}
              data={{
                labels: dashboard.registrationStatus.map((x) => x.status),
                datasets: [
                  {
                    data: dashboard.registrationStatus.map((x) => x.total),
                    backgroundColor: CHART_PALETTE,
                    borderWidth: 0,
                  },
                ],
              }}
            />
          </ChartCard>

          <ChartCard title="Monthly Pet Registrations" isEmpty={!hasChartData(dashboard.registrations)}>
            <Bar
              options={barChartOptions}
              data={{
                labels: dashboard.registrations.map((x) => x.month),
                datasets: [
                  {
                    label: "Registrations",
                    data: dashboard.registrations.map((x) => x.total),
                    backgroundColor: "#7a0c1e",
                    borderRadius: 6,
                  },
                ],
              }}
            />
          </ChartCard>
        </div>

        <div className="chart-grid chart-grid--single">
          <ChartCard
            title="Top Barangays by Registration"
            tall
            isEmpty={!hasChartData(dashboard.barangays)}
          >
            <Bar
              options={horizontalBarChartOptions}
              data={{
                labels: dashboard.barangays.map((x) => x.barangay),
                datasets: [
                  {
                    label: "Pets",
                    data: dashboard.barangays.map((x) => x.total),
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

        <div className="chart-grid chart-grid--triple">
          <ChartCard title="Vaccinations Per Month" isEmpty={!hasChartData(dashboard.vaccinations)}>
            <Bar
              options={barChartOptions}
              data={{
                labels: dashboard.vaccinations.map((x) => x.month),
                datasets: [
                  {
                    label: "Vaccinations",
                    data: dashboard.vaccinations.map((x) => x.total),
                    backgroundColor: "#1e7a46",
                    borderRadius: 6,
                  },
                ],
              }}
            />
          </ChartCard>

          <ChartCard title="Vaccination Compliance" isEmpty={!hasChartData(dashboard.vaccinationStatus)}>
            <Doughnut
              options={circularChartOptions}
              data={{
                labels: dashboard.vaccinationStatus.map((x) => x.status),
                datasets: [
                  {
                    data: dashboard.vaccinationStatus.map((x) => x.total),
                    backgroundColor: ["#c8102e", "#b8860b", "#1e7a46", "#6b6062"],
                    borderWidth: 0,
                  },
                ],
              }}
            />
          </ChartCard>

          <ChartCard title="QR Statistics" isEmpty={!hasChartData(dashboard.qrStats)}>
            <Doughnut
              options={circularChartOptions}
              data={{
                labels: dashboard.qrStats.map((x) => x.status),
                datasets: [
                  {
                    data: dashboard.qrStats.map((x) => x.total),
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

