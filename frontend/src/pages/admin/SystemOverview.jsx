import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import api from '../../services/api';
import SummaryCard from '../../components/SummaryCard';
import AnnouncementWidget from "../../components/announcements/AnnouncementWidget";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, ChartDataLabels);

const datalabelWhiteStyle = {
  font: { family: 'Inter', size: 11, weight: 'bold' },
  color: '#ffffff',
  textStrokeColor: 'rgba(36, 20, 22, 0.9)',
  textStrokeWidth: 3,
  clamp: false,
  clip: false,
};

const barangayBarOptions = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#241416', padding: 12, cornerRadius: 8 },
    datalabels: {
      anchor: 'end',
      align: 'left',
      offset: -4,
      ...datalabelWhiteStyle,
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { stepSize: 1, precision: 0, font: { family: 'Inter' } },
      grid: { color: 'rgba(36, 20, 22, 0.06)' },
      suggestedMax: (context) => {
        const max = Math.max(...(context.chart.data.datasets[0]?.data || [0]));
        return max * 1.25;
      },
    },
    y: {
      grid: { display: false },
      ticks: { font: { family: 'Inter', size: 11 } },
    },
  },
  layout: {
    padding: { right: 16 },
  },
};

export default function SystemOverview() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    api.get('/analytics/summary').then((res) => setSummary(res.data.summary)).catch(console.error);
    api.get('/analytics/charts').then((res) => setCharts(res.data)).catch(console.error);
    api.get('/analytics/dashboard?filter=all')
      .then((res) => setDashboard({
        ...res.data,
        barangays: res.data.barangays ?? [],
        registrationStatus: res.data.registrationStatus ?? [],
        vaccinationStatus: res.data.vaccinationStatus ?? [],
      }))
      .catch(console.error);
  }, []);

  const males = charts?.petsBySex?.find((s) => s.sex === 'Male')?.total || 0;
  const females = charts?.petsBySex?.find((s) => s.sex === 'Female')?.total || 0;
  const dogsTotal = charts?.dogsTotal || 0;
  const catsTotal = charts?.catsTotal || 0;
  const dogMale = charts?.dogsBySex?.find((s) => s.sex === 'Male')?.total || 0;
  const dogFemale = charts?.dogsBySex?.find((s) => s.sex === 'Female')?.total || 0;
  const catMale = charts?.catsBySex?.find((s) => s.sex === 'Male')?.total || 0;
  const catFemale = charts?.catsBySex?.find((s) => s.sex === 'Female')?.total || 0;

  const hasBarangayData = Array.isArray(dashboard?.barangays) &&
    dashboard.barangays.some((b) => Number(b.total) > 0);

  return (
    <div className="page">
      <div className="page-header-row admin-page-header">
        <h1 style={{ whiteSpace: 'nowrap' }}>Admin Dashboard</h1>
        <p className="page-intro">
          Monitor registrations, announcements, and analytics across the city.
        </p>
      </div>

      <AnnouncementWidget />

      <div className="announcement-action-row" style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate('/admin/announcements')}
        >
          <Megaphone size={16} style={{ marginRight: '0.4rem', verticalAlign: '-2px' }} />
          Add Announcement
        </button>
      </div>

      <div className="summary-row summary-row--center">
        <SummaryCard
          label="Registered Dogs"
          value={charts ? dogsTotal : '—'}
          color="#1e7a46"
          sub={[
            { label: 'Male', value: charts ? dogMale : '—' },
            { label: 'Female', value: charts ? dogFemale : '—' },
          ]}
        />
        <SummaryCard
          label="Registered Cats"
          value={charts ? catsTotal : '—'}
          color="#c8102e"
          sub={[
            { label: 'Male', value: charts ? catMale : '—' },
            { label: 'Female', value: charts ? catFemale : '—' },
          ]}
        />
        <SummaryCard
          label="Pet Sex Distribution"
          value={charts ? males + females : '—'}
          color="#c6a15b"
          sub={[
            { label: 'Male', value: charts ? males : '—' },
            { label: 'Female', value: charts ? females : '—' },
          ]}
        />
      </div>

      <h2>Analytics per Barangay</h2>
      <p className="page-intro">
        Visual breakdown of pet registrations and verification status across
        each barangay.
      </p>

      {hasBarangayData ? (
        <div className="chart-grid">
          <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
            <h3>Pets by Barangay</h3>
            <div className="chart-card-canvas chart-card-canvas--tall">
              <Bar
                options={barangayBarOptions}
                data={{
                  labels: dashboard.barangays.map((x) => x.barangay),
                  datasets: [
                    {
                      label: 'Pets',
                      data: dashboard.barangays.map((x) => x.total),
                      backgroundColor: '#c6a15b',
                      borderRadius: 6,
                    },
                  ],
                }}
              />
            </div>
          </div>

          <div className="chart-card">
            <h3>Registration Status</h3>
            <div className="chart-card-canvas">
              <Bar
                options={{
                  ...barangayBarOptions,
                  scales: { ...barangayBarOptions.scales, x: { ...barangayBarOptions.scales.x, grid: { display: false } } },
                }}
                data={{
                  labels: dashboard.registrationStatus.map((x) => x.status),
                  datasets: [
                    {
                      label: 'Pets',
                      data: dashboard.registrationStatus.map((x) => x.total),
                      backgroundColor: '#c8102e',
                      borderRadius: 6,
                    },
                  ],
                }}
              />
            </div>
          </div>

          <div className="chart-card">
            <h3>Vaccination Compliance</h3>
            <div className="chart-card-canvas">
              <Bar
                options={barangayBarOptions}
                data={{
                  labels: dashboard.vaccinationStatus.map((x) => x.status),
                  datasets: [
                    {
                      label: 'Pets',
                      data: dashboard.vaccinationStatus.map((x) => x.total),
                      backgroundColor: '#1e7a46',
                      borderRadius: 6,
                    },
                  ],
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="page-intro">Loading barangay analytics…</p>
      )}
    </div>
  );
}