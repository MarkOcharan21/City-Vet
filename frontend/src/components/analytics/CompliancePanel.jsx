import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Printer, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../../services/api';
import SummaryCard from '../SummaryCard';
import GlobalLoadingOverlay from '../GlobalLoadingOverlay';
import { printComplianceReport } from '../../utils/complianceReportPrint';
import './chartSetup';

const GRACE_OPTIONS = [0, 15, 30, 60, 90];

const OUTCOME_COLORS = {
  'On Time': '#1e7a46',
  Late: '#b8860b',
  Lapsed: '#c8102e',
  'No Return': '#6b6062',
  Pending: '#c6a15b',
};

const FUNNEL_STEPS = [
  { key: 'vaccinated', label: 'Pets vaccinated' },
  { key: 'dueEvaluable', label: 'Follow-ups due & evaluated' },
  { key: 'returned', label: 'Owner came back' },
  { key: 'onTime', label: 'Came back on time' },
];

function fmtPct(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : '—';
}

function fmtNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { padding: 14, usePointStyle: true, font: { family: 'Inter', size: 12 } },
    },
    tooltip: { backgroundColor: '#241416', padding: 12, cornerRadius: 8 },
    datalabels: {
      color: '#fff',
      font: { family: 'Inter', size: 12, weight: 'bold' },
      textStrokeColor: 'rgba(36, 20, 22, 0.9)',
      textStrokeWidth: 3,
      formatter: (value) => value,
    },
  },
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { padding: 14, usePointStyle: true, font: { family: 'Inter', size: 12 } },
    },
    tooltip: { backgroundColor: '#241416', padding: 12, cornerRadius: 8 },
    datalabels: { display: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'Inter' } } },
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1, font: { family: 'Inter' } },
      grid: { color: 'rgba(36, 20, 22, 0.06)' },
    },
  },
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      position: 'bottom',
      labels: { padding: 14, usePointStyle: true, font: { family: 'Inter', size: 12 } },
    },
    tooltip: { backgroundColor: '#241416', padding: 12, cornerRadius: 8 },
    datalabels: { display: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'Inter' } } },
    y: {
      beginAtZero: true,
      max: 100,
      ticks: { font: { family: 'Inter' }, callback: (v) => `${v}%` },
      grid: { color: 'rgba(36, 20, 22, 0.06)' },
    },
  },
};

export default function CompliancePanel() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [grace, setGrace] = useState(30);
  const [barangay, setBarangay] = useState('');

  const [compliance, setCompliance] = useState(null);
  const [returns, setReturns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = { grace };
    if (from) params.from = from;
    if (to) params.to = to;
    if (barangay.trim()) params.barangay = barangay.trim();

    const returnParams = {};
    if (from) returnParams.from = from;
    if (to) returnParams.to = to;

    try {
      const [complianceRes, returnRes] = await Promise.all([
        api.get('/analytics/vaccine-compliance', { params }),
        api.get('/analytics/return-rate', { params: returnParams }),
      ]);
      setCompliance(complianceRes.data);
      setReturns(returnRes.data);
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to load the vaccine compliance report.';
      setError(message);
      setCompliance(null);
      setReturns(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [from, to, grace, barangay]);

  useEffect(() => {
    load();
  }, [load, retryCount]);

  const summary = compliance?.summary || {};
  const buckets = useMemo(
    () => (compliance?.buckets || []).filter((b) => b.status !== 'Pending'),
    [compliance]
  );

  const barangayOptions = useMemo(() => {
    const names = (compliance?.byBarangay || []).map((r) => r.key).filter(Boolean);
    return names.sort((a, b) => a.localeCompare(b));
  }, [compliance]);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const params = { grace };
      if (from) params.from = from;
      if (to) params.to = to;
      if (barangay.trim()) params.barangay = barangay.trim();

      const res = await api.get('/analytics/vaccine-compliance', { params });
      if (!res.data?.success) {
        toast.error(res.data?.message || 'Could not build the report.');
        return;
      }
      printComplianceReport(res.data, {
        title: 'Vaccine Follow-Up Compliance Report',
        period: res.data.filterLabel || 'All Time',
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not build the report.');
    } finally {
      setPrinting(false);
    }
  };

  const funnel = compliance?.funnel || {};
  const funnelMax = Math.max(
    1,
    ...FUNNEL_STEPS.map((step) => Number(funnel[step.key]) || 0)
  );

  return (
    <div className="analytics-panel">
      <div className="analytics-filter-row" role="group" aria-label="Compliance filters">
        <div className="analytics-inline-field">
          <label htmlFor="compliance-from">From</label>
          <input
            id="compliance-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="analytics-inline-field">
          <label htmlFor="compliance-to">To</label>
          <input
            id="compliance-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="analytics-inline-field">
          <label htmlFor="compliance-grace">Grace period</label>
          <select
            id="compliance-grace"
            value={grace}
            onChange={(e) => setGrace(Number(e.target.value))}
          >
            {GRACE_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {days === 0 ? 'No grace' : `${days} day${days === 1 ? '' : 's'}`}
              </option>
            ))}
          </select>
        </div>
        <div className="analytics-inline-field">
          <label htmlFor="compliance-barangay">Barangay</label>
          <select
            id="compliance-barangay"
            value={barangay}
            onChange={(e) => setBarangay(e.target.value)}
          >
            <option value="">All barangays</option>
            {barangayOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn-secondary analytics-filter-action"
          onClick={() => {
            setFrom('');
            setTo('');
            setGrace(30);
            setBarangay('');
          }}
          disabled={!from && !to && grace === 30 && !barangay}
        >
          Reset
        </button>
        <button
          type="button"
          className="btn-secondary analytics-filter-action"
          onClick={() => setRetryCount((c) => c + 1)}
        >
          <RefreshCw size={15} /> Refresh
        </button>
        <button
          type="button"
          className="btn-primary analytics-filter-action"
          onClick={handlePrint}
          disabled={loading || printing || !compliance}
        >
          <Printer size={15} /> {printing ? 'Preparing…' : 'Print Report'}
        </button>
      </div>

      <p className="analytics-period-label">
        Showing follow-up data for: <strong>{compliance?.filterLabel || 'All Time'}</strong>
        {compliance?.graceDays !== undefined && (
          <>
            {' '}
            · grace period <strong>{compliance.graceDays} day(s)</strong>
          </>
        )}
      </p>

      {loading && <GlobalLoadingOverlay visible={true} message="Building compliance report..." />}

      {!loading && error && (
        <div className="analytics-error-state">
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={() => setRetryCount((c) => c + 1)}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && compliance && (
        <>
          <div className="summary-row">
            <SummaryCard
              label="Episodes Evaluated"
              value={fmtNum(summary.evaluable)}
              sub={[
                { label: 'Total doses', value: fmtNum(summary.episodes) },
                { label: 'Pending', value: fmtNum(summary.pending) },
              ]}
            />
            <SummaryCard
              label="On-Time Compliance"
              value={fmtPct(summary.onTimeRate)}
              color="#1e7a46"
              sub={[
                { label: 'On time', value: fmtNum(summary.onTime) },
                { label: 'Late', value: fmtNum(summary.late) },
                { label: 'Lapsed', value: fmtNum(summary.lapsed) },
              ]}
            />
            <SummaryCard
              label="Never Returned"
              value={fmtNum(summary.noReturn)}
              color="#c8102e"
              sub={[
                { label: 'Share of evaluated', value: fmtPct(summary.noReturnRate) },
                { label: 'Pets affected', value: fmtNum(summary.petsNeverReturning) },
              ]}
            />
            <SummaryCard
              label="Returned For Any Service"
              value={fmtPct(summary.anyServiceReturnedRate)}
              color="#c6a15b"
              sub={[
                { label: 'Owners', value: fmtNum(summary.distinctOwners) },
                { label: 'Pets', value: fmtNum(summary.distinctPets) },
              ]}
            />
          </div>

          <div className="chart-grid chart-grid--1col">
            <div className="chart-card">
              <h3>Follow-Up Outcomes</h3>
              <div className="chart-card-canvas">
                {buckets.length ? (
                  <Doughnut
                    options={doughnutOptions}
                    data={{
                      labels: buckets.map((b) => b.status),
                      datasets: [
                        {
                          data: buckets.map((b) => b.total),
                          backgroundColor: buckets.map((b) => OUTCOME_COLORS[b.status]),
                          borderWidth: 0,
                        },
                      ],
                    }}
                  />
                ) : (
                  <p className="chart-card-empty">No follow-ups due in this period.</p>
                )}
              </div>
            </div>

            <div className="chart-card">
              <h3>Monthly On-Time Rate</h3>
              <div className="chart-card-canvas">
                {(compliance?.trend || []).length ? (
                  <Line
                    options={lineOptions}
                    data={{
                      labels: (compliance?.trend || []).map((t) => t.period),
                      datasets: [
                        {
                          label: 'On-time rate (%)',
                          data: (compliance?.trend || []).map((t) => t.onTimeRate),
                          borderColor: '#1e7a46',
                          backgroundColor: 'rgba(30, 122, 70, 0.12)',
                          fill: true,
                          tension: 0.35,
                          pointRadius: 3,
                        },
                      ],
                    }}
                  />
                ) : (
                  <p className="chart-card-empty">No trend data available.</p>
                )}
              </div>
            </div>
          </div>

          <section className="analytics-chart-section">
            <h3 className="analytics-chart-section-title">Follow-Up Funnel</h3>
            <p className="analytics-chart-section-desc">
              How the vaccinated pets narrow down to owners who actually came back on time.
            </p>
            <div className="compliance-funnel">
              {FUNNEL_STEPS.map((step) => {
                const value = Number(funnel[step.key]) || 0;
                const width = Math.round((value / funnelMax) * 100);
                return (
                  <div className="compliance-funnel-step" key={step.key}>
                    <span className="compliance-funnel-label">{step.label}</span>
                    <div className="compliance-funnel-track">
                      <div
                        className="compliance-funnel-bar"
                        style={{ width: `${Math.max(width, value > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                    <span className="compliance-funnel-value">{fmtNum(value)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="analytics-chart-section">
            <h3 className="analytics-chart-section-title">Outcome By Vaccine</h3>
            <div className="chart-grid chart-grid--1col">
              <div className="chart-card">
                <h3>On Time vs No Return</h3>
                <div className="chart-card-canvas">
                  {(compliance?.byVaccine || []).length ? (
                    <Bar
                      options={barOptions}
                      data={{
                        labels: (compliance?.byVaccine || []).map((r) => r.key),
                        datasets: [
                          {
                            label: 'On time',
                            data: (compliance?.byVaccine || []).map((r) => r.onTime),
                            backgroundColor: '#1e7a46',
                            borderRadius: 4,
                          },
                          {
                            label: 'No return',
                            data: (compliance?.byVaccine || []).map((r) => r.noReturn),
                            backgroundColor: '#c8102e',
                            borderRadius: 4,
                          },
                        ],
                      }}
                    />
                  ) : (
                    <p className="chart-card-empty">No vaccine breakdown available.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="analytics-chart-section">
            <h3 className="analytics-chart-section-title">Compliance By Barangay</h3>
            <div className="report-table-container">
              <h3>Barangay breakdown</h3>
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Barangay</th>
                      <th>Episodes</th>
                      <th>On Time</th>
                      <th>Late</th>
                      <th>Lapsed</th>
                      <th>No Return</th>
                      <th>On-Time Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(compliance?.byBarangay || []).length ? (
                      (compliance?.byBarangay || []).map((row) => (
                        <tr key={row.key}>
                          <td>{row.key}</td>
                          <td>{fmtNum(row.episodes)}</td>
                          <td>{fmtNum(row.onTime)}</td>
                          <td>{fmtNum(row.late)}</td>
                          <td>{fmtNum(row.lapsed)}</td>
                          <td>{fmtNum(row.noReturn)}</td>
                          <td>{fmtPct(row.onTimeRate)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="report-table-empty" colSpan={7}>
                          No barangay data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="analytics-chart-section">
            <h3 className="analytics-chart-section-title">Service Return Analysis</h3>
            <p className="analytics-chart-section-desc">
              Did the owner come back for any service — vaccination, consultation, preventive care
              or procedure — after the visit?
            </p>

            <div className="summary-row">
              <SummaryCard
                label="Returned Within 30 Days"
                value={fmtPct(returns?.summary?.returnRate30)}
                color="#1e7a46"
                sub={[{ label: 'Visits', value: fmtNum(returns?.summary?.episodes) }]}
              />
              <SummaryCard
                label="Never Returned"
                value={fmtNum(returns?.summary?.neverReturned)}
                color="#c8102e"
              />
              <SummaryCard
                label="Follow-Up Kept"
                value={fmtPct(returns?.followUp?.adherenceRate)}
                color="#c6a15b"
                sub={[
                  { label: 'Scheduled', value: fmtNum(returns?.followUp?.scheduled) },
                  { label: 'Honoured', value: fmtNum(returns?.followUp?.honoured) },
                ]}
              />
              <SummaryCard
                label="Owner Retention (90 Days)"
                value={fmtPct(returns?.retention?.retentionRate)}
                sub={[{ label: 'Owners served', value: fmtNum(returns?.retention?.ownersServed) }]}
              />
            </div>

            <div className="report-table-container">
              <h3>Return rate by service type</h3>
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Visits</th>
                      <th>Pets</th>
                      <th>Returned ≤30d</th>
                      <th>Returned ≤60d</th>
                      <th>Returned ≤90d</th>
                      <th>Never Returned</th>
                      <th>Avg Days to Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(returns?.byService || []).length ? (
                      (returns?.byService || []).map((row) => (
                        <tr key={row.serviceType}>
                          <td>{row.serviceType}</td>
                          <td>{fmtNum(row.episodes)}</td>
                          <td>{fmtNum(row.pets)}</td>
                          <td>
                            {fmtNum(row.returned30)} ({fmtPct(row.returnRate30)})
                          </td>
                          <td>
                            {fmtNum(row.returned60)} ({fmtPct(row.returnRate60)})
                          </td>
                          <td>
                            {fmtNum(row.returned90)} ({fmtPct(row.returnRate90)})
                          </td>
                          <td>{fmtNum(row.neverReturned)}</td>
                          <td>{fmtNum(row.avgDaysToReturn)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="report-table-empty" colSpan={8}>
                          No service data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="analytics-chart-section">
            <h3 className="analytics-chart-section-title">Owners To Contact</h3>
            <p className="analytics-chart-section-desc">
              Follow-ups that are overdue or were never fulfilled, most overdue first.
            </p>
            <div className="report-table-container">
              <h3>
                Actionable follow-ups
                <span className="report-tab-count">
                  {fmtNum(compliance?.actionableTotal ?? 0)}
                </span>
              </h3>
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Pet</th>
                      <th>Owner</th>
                      <th>Contact</th>
                      <th>Barangay</th>
                      <th>Vaccine</th>
                      <th>Due</th>
                      <th>Days Overdue</th>
                      <th>Last Visit</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(compliance?.actionable || []).length ? (
                      (compliance?.actionable || []).map((row, index) => (
                        <tr key={`${row.pet_code}-${row.due_on}-${index}`}>
                          <td>
                            {row.pet_code} {row.pet_name}
                          </td>
                          <td>{row.owner_name}</td>
                          <td>{row.contact_number || '—'}</td>
                          <td>{row.barangay || '—'}</td>
                          <td>{row.vaccine_name}</td>
                          <td>{row.due_on}</td>
                          <td>{fmtNum(row.days_overdue)}</td>
                          <td>{row.last_service_on || '—'}</td>
                          <td>
                            <span
                              className={`analytics-status-chip analytics-status-chip--${row.outcome
                                .toLowerCase()
                                .replace(/\s+/g, '-')}`}
                            >
                              {row.outcome}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="report-table-empty" colSpan={9}>
                          No owners are overdue — every due follow-up has been met.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
