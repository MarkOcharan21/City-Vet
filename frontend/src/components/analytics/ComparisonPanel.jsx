import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Printer, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../../services/api';
import SummaryCard from '../SummaryCard';
import GlobalLoadingOverlay from '../GlobalLoadingOverlay';
import { printComparisonReport } from '../../utils/comparisonReportPrint';
import './chartSetup';

const GRANULARITIES = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const COMPARE_MODES = [
  { key: 'previous', label: 'Previous Period' },
  { key: 'previousYear', label: 'Same Period Last Year' },
];

const METRIC_OPTIONS = [
  { key: 'registrations', label: 'Registrations', money: false, invert: false },
  { key: 'doses', label: 'Vaccinations', money: false, invert: false },
  { key: 'pets', label: 'Unique Pets', money: false, invert: false },
  { key: 'owners', label: 'Unique Owners', money: false, invert: false },
  { key: 'consultations', label: 'Consultations', money: false, invert: false },
  { key: 'qrIssued', label: 'QR Issued', money: false, invert: false },
  { key: 'revenue', label: 'Revenue', money: true, invert: false },
  { key: 'lostPets', label: 'Lost Pets', money: false, invert: true },
  { key: 'newOwners', label: 'New Owners', money: false, invert: false },
];

function fmtMetric(value, money = false) {
  return money ? fmtPeso(value) : fmtNum(value);
}

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function fmtNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

function fmtPct(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : '—';
}

function fmtPeso(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `₱${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';
}

function fmtDelta(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toLocaleString('en-US')}`;
}

/** "May 1, 2026 – Oct 31, 2026" — the full window, not just its first day. */
function fmtRange(range) {
  if (!range?.from || !range?.to) return null;
  const start = new Date(`${range.from}T00:00:00`);
  const end = new Date(`${range.to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${range.from} – ${range.to}`;
  }
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', options)} – ${end.toLocaleDateString('en-US', options)}`;
}

/**
 * A change indicator. `invert` flips the meaning, for metrics where a drop is
 * the good news (revenue up, lapsed episodes down).
 */
function DeltaBadge({ delta, pctChange, invert = false, suffix = '' }) {
  if (delta === null || delta === undefined) {
    return <span className="analytics-delta-badge analytics-delta-badge--flat">No data</span>;
  }

  const n = Number(delta);
  const direction = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
  const positive = invert ? direction === 'down' : direction === 'up';
  const tone = direction === 'flat' ? 'flat' : positive ? 'up' : 'down';

  return (
    <span className={`analytics-delta-badge analytics-delta-badge--${tone}`}>
      {fmtDelta(n)}
      {suffix}
      {pctChange !== null && pctChange !== undefined && (
        <em> ({Number(pctChange) > 0 ? '+' : ''}{Number(pctChange).toFixed(1)}%)</em>
      )}
    </span>
  );
}

const groupedBarOptions = {
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

const rateLineOptions = {
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

export default function ComparisonPanel() {
  const [granularity, setGranularity] = useState('monthly');
  const [compare, setCompare] = useState('previous');
  const [metric, setMetric] = useState('doses');
  const [anchor, setAnchor] = useState(toISO(new Date()));

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/analytics/period-comparison', {
        params: { granularity, compare, anchor, metric },
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load comparison');
      setData(res.data);
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Failed to load comparison.';
      setError(message);
      setData(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [granularity, compare, anchor, metric]);

  useEffect(() => {
    load();
  }, [load, retryCount]);

  const totals = data?.totals || {};
  const current = totals.current || {};
  const baseline = totals.baseline || {};
  const series = data?.series || [];

  const chartData = useMemo(() => {
    const key = data?.primaryMetric || metric;
    const pick = (row) => (row ? Number(row[key]) || 0 : 0);
    return {
      metric: key,
      labels: series.map((s) => s.label),
      current: series.map((s) => pick(s.current)),
      baseline: series.map((s) => pick(s.baseline)),
      currentRate: series.map((s) => (s.current ? s.current.onTimeRate : null)),
      baselineRate: series.map((s) => (s.baseline ? s.baseline.onTimeRate : null)),
    };
  }, [series, metric, data?.primaryMetric]);

  const activeMetric = METRIC_OPTIONS.find((m) => m.key === chartData.metric) || METRIC_OPTIONS[1];

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const res = await api.get('/analytics/period-comparison', {
        params: { granularity, compare, anchor, metric },
      });
      if (!res.data?.success) {
        toast.error(res.data?.message || 'Could not build the comparison report.');
        return;
      }
      printComparisonReport(res.data, {
        title: 'Period Comparison Report',
        period: fmtRange(res.data.current) || res.data.current?.label || '',
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not build the comparison report.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="analytics-panel">
      <div className="analytics-filter-row" role="group" aria-label="Comparison controls">
        <div className="analytics-toggle-group">
          <span className="analytics-toggle-label">Granularity</span>
          {GRANULARITIES.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={granularity === option.key}
              onClick={() => setGranularity(option.key)}
              className={`analytics-filter-btn${granularity === option.key ? ' is-active' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="analytics-toggle-group">
          <span className="analytics-toggle-label">Compare against</span>
          {COMPARE_MODES.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={compare === option.key}
              onClick={() => setCompare(option.key)}
              className={`analytics-filter-btn${compare === option.key ? ' is-active' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="analytics-inline-field">
          <label htmlFor="comparison-metric">Metric</label>
          <select
            id="comparison-metric"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            {METRIC_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="analytics-inline-field">
          <label htmlFor="comparison-anchor">Anchor date</label>
          <input
            id="comparison-anchor"
            type="date"
            value={anchor}
            max={toISO(new Date())}
            onChange={(e) => setAnchor(e.target.value)}
          />
        </div>

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
          disabled={loading || printing || !data}
        >
          <Printer size={15} /> {printing ? 'Preparing…' : 'Print Comparison'}
        </button>
      </div>

      <p className="analytics-period-label">
        Comparing <strong>{fmtRange(data?.current) || data?.current?.label || '—'}</strong> against{' '}
        <strong>{fmtRange(data?.baseline) || data?.baseline?.label || '—'}</strong>
        {data?.windows ? ` · ${data.windows} period(s) per side` : ''}
      </p>

      {loading && <GlobalLoadingOverlay visible={true} message="Building comparison..." />}

      {!loading && error && (
        <div className="analytics-error-state">
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={() => setRetryCount((c) => c + 1)}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="summary-row">
            <SummaryCard
              label="Registrations"
              value={fmtNum(current.registrations)}
              sub={[
                { label: 'Baseline', value: fmtNum(baseline.registrations) },
                { label: 'Change', value: fmtDelta(totals.registrations?.delta) },
              ]}
            />
            <SummaryCard
              label="Doses Administered"
              value={fmtNum(current.doses)}
              color="#1e7a46"
              sub={[
                { label: 'Baseline', value: fmtNum(baseline.doses) },
                { label: 'Change', value: fmtDelta(totals.doses?.delta) },
              ]}
            />
            <SummaryCard
              label="Unique Pets"
              value={fmtNum(current.pets)}
              color="#c6a15b"
              sub={[
                { label: 'Baseline', value: fmtNum(baseline.pets) },
                { label: 'Change', value: fmtDelta(totals.pets?.delta) },
              ]}
            />
            <SummaryCard
              label="Unique Owners"
              value={fmtNum(current.owners)}
              color="#b8860b"
              sub={[
                { label: 'Baseline', value: fmtNum(baseline.owners) },
                { label: 'Change', value: fmtDelta(totals.owners?.delta) },
              ]}
            />
          </div>

          <div className="analytics-delta-row">
            <span className="analytics-delta-row-label">Consultations</span>
            <DeltaBadge delta={totals.consultations?.delta} pctChange={totals.consultations?.pctChange} />
            <span className="analytics-delta-row-label">QR Issued</span>
            <DeltaBadge delta={totals.qrIssued?.delta} pctChange={totals.qrIssued?.pctChange} />
            <span className="analytics-delta-row-label">Revenue</span>
            <DeltaBadge delta={totals.revenue?.delta} pctChange={totals.revenue?.pctChange} />
            <span className="analytics-delta-row-label">Lost Pets</span>
            <DeltaBadge delta={totals.lostPets?.delta} pctChange={totals.lostPets?.pctChange} invert />
            <span className="analytics-delta-row-label">New Owners</span>
            <DeltaBadge delta={totals.newOwners?.delta} pctChange={totals.newOwners?.pctChange} />
            <span className="analytics-delta-row-label">On-time rate</span>
            <DeltaBadge delta={totals.onTimeRate?.delta} pctChange={totals.onTimeRate?.pctChange} suffix=" pts" />
          </div>

          <div className="chart-grid chart-grid--1col">
            <div className="chart-card">
              <h3>{activeMetric.label} — Current vs Baseline</h3>
              <div className="chart-card-canvas">
                {series.length ? (
                  <Bar
                    options={groupedBarOptions}
                    data={{
                      labels: chartData.labels,
                      datasets: [
                        {
                          label: data.current?.label || 'Current',
                          data: chartData.current,
                          backgroundColor: '#c8102e',
                          borderRadius: 4,
                        },
                        {
                          label: data.baseline?.label || 'Baseline',
                          data: chartData.baseline,
                          backgroundColor: '#c6a15b',
                          borderRadius: 4,
                        },
                      ],
                    }}
                  />
                ) : (
                  <p className="chart-card-empty">No comparison data available.</p>
                )}
              </div>
            </div>

            <div className="chart-card">
              <h3>On-Time Rate — Current vs Baseline</h3>
              <div className="chart-card-canvas">
                {series.length ? (
                  <Line
                    options={rateLineOptions}
                    data={{
                      labels: chartData.labels,
                      datasets: [
                        {
                          label: 'Current (%)',
                          data: chartData.currentRate,
                          borderColor: '#c8102e',
                          backgroundColor: 'rgba(200, 16, 46, 0.1)',
                          fill: true,
                          tension: 0.35,
                          pointRadius: 3,
                          spanGaps: true,
                        },
                        {
                          label: 'Baseline (%)',
                          data: chartData.baselineRate,
                          borderColor: '#c6a15b',
                          backgroundColor: 'rgba(198, 161, 91, 0.1)',
                          borderDash: [6, 4],
                          tension: 0.35,
                          pointRadius: 3,
                          spanGaps: true,
                        },
                      ],
                    }}
                  />
                ) : (
                  <p className="chart-card-empty">No comparison data available.</p>
                )}
              </div>
            </div>
          </div>

          <section className="analytics-chart-section">
            <h3 className="analytics-chart-section-title">Period By Period</h3>
            <div className="report-table-container">
              <h3>Current period vs baseline</h3>
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Baseline Period</th>
                      <th>{activeMetric.label} (Current)</th>
                      <th>{activeMetric.label} (Baseline)</th>
                      <th>Change</th>
                      <th>% Change</th>
                      <th>On-Time Rate (Current)</th>
                      <th>On-Time Rate (Baseline)</th>
                      <th>Revenue (Current)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.length ? (
                      series.map((row) => (
                        <tr key={row.key}>
                          <td>{row.label}</td>
                          <td>{row.baselineLabel}</td>
                          <td>{fmtMetric(row.current?.[chartData.metric] ?? 0, activeMetric.money)}</td>
                          <td>{row.baseline ? fmtMetric(row.baseline[chartData.metric], activeMetric.money) : 'No data'}</td>
                          <td>{fmtDelta(row.deltas?.[chartData.metric]?.delta ?? row.delta)}</td>
                          <td>
                            {(row.deltas?.[chartData.metric]?.pctChange ?? row.pctChange) === null
                              ? '—'
                              : `${Number(row.deltas?.[chartData.metric]?.pctChange ?? row.pctChange).toFixed(1)}%`}
                          </td>
                          <td>{row.current ? fmtPct(row.current.onTimeRate) : '—'}</td>
                          <td>{row.baseline ? fmtPct(row.baseline.onTimeRate) : '—'}</td>
                          <td>{row.current ? fmtPeso(row.current.revenue) : '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="report-table-empty" colSpan={9}>
                          No comparison rows available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="analytics-chart-section">
            <h3 className="analytics-chart-section-title">Year-over-Year Summary</h3>
            <p className="analytics-chart-section-desc">
              Every year on record. The small figure under each value is the change against the year before it.
            </p>
            <div className="report-table-container">
              <h3>Yearly totals</h3>
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Registrations</th>
                      <th>Vaccinations</th>
                      <th>Unique Pets</th>
                      <th>Unique Owners</th>
                      <th>Consultations</th>
                      <th>QR Issued</th>
                      <th>Revenue</th>
                      <th>Lost Pets</th>
                      <th>New Owners</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.yearly || []).length ? (
                      (data.yearly || []).map((row) => {
                        const cell = (metric, money = false) => (
                          <>
                            <div>{fmtMetric(row[metric], money)}</div>
                            <small className="analytics-table-delta">{fmtDelta(row.deltas?.[metric]?.delta)}</small>
                          </>
                        );
                        return (
                          <tr key={row.year}>
                            <td>{row.year}</td>
                            <td>{cell('registrations')}</td>
                            <td>{cell('doses')}</td>
                            <td>{cell('pets')}</td>
                            <td>{cell('owners')}</td>
                            <td>{cell('consultations')}</td>
                            <td>{cell('qrIssued')}</td>
                            <td>{cell('revenue', true)}</td>
                            <td>{cell('lostPets')}</td>
                            <td>{cell('newOwners')}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="report-table-empty" colSpan={10}>
                          No yearly data available.
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
