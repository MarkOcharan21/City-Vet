import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Bar } from 'react-chartjs-2';
import {
  BarChart3,
  CalendarRange,
  ClipboardList,
  FileBarChart,
  Printer,
  RefreshCw,
  Syringe,
} from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../../services/api';
import SummaryCard from '../SummaryCard';
import GlobalLoadingOverlay from '../GlobalLoadingOverlay';
import { printAdminReport } from '../../utils/adminReportPrint';
import { printComplianceReport } from '../../utils/complianceReportPrint';
import { printComparisonReport } from '../../utils/comparisonReportPrint';
import './chartSetup';

const PRESETS = [
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'lastYear', label: 'Last Year' },
  { key: 'all', label: 'All Time' },
];

const GRACE_OPTIONS = [0, 15, 30, 60, 90];
const reportChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' }, datalabels: { display: false } },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true, ticks: { precision: 0 } },
  },
};

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function presetRange(preset) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  switch (preset) {
    case 'thisMonth':
      return { from: `${year}-${month}-01`, to: toISO(now) };
    case 'lastMonth': {
      const first = new Date(year, now.getMonth() - 1, 1);
      const last = new Date(year, now.getMonth(), 0);
      return { from: toISO(first), to: toISO(last) };
    }
    case 'thisYear':
      return { from: `${year}-01-01`, to: toISO(now) };
    case 'lastYear':
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    default:
      return { from: '', to: '' };
  }
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

export default function ReportsPanel() {
  const [preset, setPreset] = useState('thisYear');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [grace, setGrace] = useState(30);

  const [selected, setSelected] = useState('summary');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const range = presetRange('thisYear');
    setFrom(range.from);
    setTo(range.to);
  }, []);

  const REPORTS = useMemo(
    () => [
      {
        key: 'summary',
        title: 'Analytics Summary Report',
        description:
          'Registrations, species mix, QR issuance, vaccination volume and revenue for the selected period.',
        icon: BarChart3,
        load: async () => {
          const params = {};
          if (from) params.from = from;
          if (to) params.to = to;
          const res = await api.get('/analytics/dashboard', { params });
          return res.data;
        },
        print: (data) =>
          printAdminReport(data, {
            title: 'Analytics Report',
            period: data.filterLabel || 'All Time',
          }),
      },
      {
        key: 'compliance',
        title: 'Vaccine Follow-Up Compliance Report',
        description:
          'Did owners come back for the next dose? On-time, late, lapsed and never-returned follow-ups, with the owners to contact.',
        icon: Syringe,
        load: async () => {
          const params = { grace, limit: 1000, page: 1 };
          if (from) params.from = from;
          if (to) params.to = to;
          const [res, serviceReturn] = await Promise.all([
            api.get('/analytics/vaccine-compliance', { params }),
            api.get('/analytics/return-rate', { params }),
          ]);
          return { ...res.data, serviceReturn: serviceReturn.data };
        },
        print: (data) =>
          printComplianceReport(data, {
            title: 'Vaccine Follow-Up Compliance Report',
            period: data.filterLabel || 'All Time',
          }),
      },
      {
        key: 'comparison',
        title: 'Period Comparison Report',
        description:
          'Current window against the previous period, broken down daily, weekly, monthly or yearly.',
        icon: FileBarChart,
        load: async () => {
          const params = { granularity: 'monthly', compare: 'previous', anchor: toISO(new Date()), windows: 60 };
          if (from && to) {
            params.from = from;
            params.to = to;
          }
          const res = await api.get('/analytics/vaccination-trends', { params });
          return res.data;
        },
        print: (data) =>
          printComparisonReport(data, {
            title: 'Vaccination Period Comparison Report',
            period: fmtRange(data.current) || data.current?.label || '',
          }),
      },
      {
        key: 'yearly',
        title: 'Yearly Vaccination Report',
        description:
          'Every year on record with doses, pets, owners, on-time rate, revenue and the change against the year before.',
        icon: ClipboardList,
        load: async () => {
          const res = await api.get('/analytics/vaccination-trends', {
            params: { granularity: 'yearly', compare: 'previousYear', anchor: toISO(new Date()) },
          });
          return res.data;
        },
        print: (data) =>
          printComparisonReport(data, {
            title: 'Yearly Vaccination Report',
            period: fmtRange(data.current) || data.current?.label || '',
          }),
      },
    ],
    [from, to, grace]
  );

  const activeReport = REPORTS.find((report) => report.key === selected) || REPORTS[0];

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await activeReport.load();
      setPreview(data);
    } catch (err) {
      const message = err.response?.data?.message || 'Could not build this report.';
      setError(message);
      setPreview(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [activeReport]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview, retryCount]);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const data = await activeReport.load();
      if (!data?.success) {
        toast.error(data?.message || 'Could not build the report.');
        return;
      }
      activeReport.print(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not build the report.');
    } finally {
      setPrinting(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const data = await activeReport.load();
      if (!data?.success) {
        toast.error(data?.message || 'Could not build the report.');
        return;
      }
      const sheets = {};
      if (activeReport.key === 'summary') {
        sheets['Summary'] = [
          { Metric: 'Verified pet registrations', Value: data.summary?.totalPets },
          { Metric: 'Unique vaccinated pets', Value: data.summary?.vaccinatedPets },
          { Metric: 'Lost pets', Value: data.summary?.lostPets },
          { Metric: 'QR codes issued', Value: data.summary?.totalQr },
        ];
        sheets['Registrations'] = data.registrations || [];
        sheets['Vaccinations'] = data.vaccinations || [];
        sheets['Revenue'] = data.paymentRevenue || [];
        sheets['Species'] = data.species || [];
        sheets['Barangays'] = data.barangays || [];
        sheets['Data Quality'] = [data.dataQuality || {}];
      } else if (activeReport.key === 'compliance') {
        sheets['Summary'] = [data.summary || {}];
        sheets['Outcomes'] = data.buckets || [];
        sheets['Monthly Trend'] = data.trend || [];
        sheets['Cohort Retention'] = data.cohortRetention || [];
        sheets['Retention Reasons'] = data.retentionReasons || [];
        sheets['Factors'] = data.factors || [];
        sheets['Service Return'] = data.serviceReturn?.byService || [];
        sheets['Service Retention'] = [data.serviceReturn?.retention || {}];
        sheets['Owners to Contact'] = (data.actionable || []).map((row) => ({
          ...row,
          reasons: (row.reasons || []).join('; '),
        }));
      } else {
        sheets['Current vs Baseline'] = [
          { Period: 'Current', ...(data.totals?.current || {}) },
          { Period: 'Baseline', ...(data.totals?.baseline || {}) },
        ];
        sheets[activeReport.key === 'yearly' ? 'Yearly' : 'Period Series'] =
          activeReport.key === 'yearly' ? data.yearly || [] : (data.series || []).map((row) => ({
            Period: row.label,
            'Baseline period': row.baselineLabel,
            'Current value': row.current?.[data.primaryMetric],
            'Baseline value': row.baseline?.[data.primaryMetric],
            Change: row.delta,
            'Percent change': row.pctChange,
            'Current on-time rate': row.current?.onTimeRate,
            'Baseline on-time rate': row.baseline?.onTimeRate,
            'Current revenue': row.current?.revenue,
            'Baseline revenue': row.baseline?.revenue,
          }));
      }

      const workbook = XLSX.utils.book_new();
      for (const [name, rows] of Object.entries(sheets)) {
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: 'No data for this section.' }]),
          name.slice(0, 31)
        );
      }
      const extension = format === 'csv' ? 'csv' : 'xlsx';
      const fileName = `${activeReport.key}-analytics-report.${extension}`;
      if (format === 'csv') {
        const csvWorkbook = XLSX.utils.book_new();
        const allRows = Object.entries(sheets).flatMap(([section, rows]) =>
          rows.map((row) => ({ Section: section, Data: JSON.stringify(row) }))
        );
        XLSX.utils.book_append_sheet(
          csvWorkbook,
          XLSX.utils.json_to_sheet(allRows.length ? allRows : [{ Note: 'No data for this report.' }]),
          'Report Data'
        );
        XLSX.writeFile(csvWorkbook, fileName, { bookType: 'csv' });
      } else {
        XLSX.writeFile(workbook, fileName);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not export this report.');
    }
  };

  const applyPreset = (key) => {
    setPreset(key);
    const range = presetRange(key);
    setFrom(range.from);
    setTo(range.to);
  };

  const periodLabel = preview?.filterLabel ||
    (preview?.current ? fmtRange(preview.current) || preview.current.label :
      from || to ? `${from || '…'} → ${to || '…'}` : 'All Time');
  const previewMonths = Array.from(new Set([
    ...(preview?.registrations || []).map((row) => row.month),
    ...(preview?.vaccinations || []).map((row) => row.month),
    ...(preview?.paymentRevenue || []).map((row) => row.month),
  ])).sort((a, b) => new Date(`${a} 1`).getTime() - new Date(`${b} 1`).getTime());

  return (
    <div className="analytics-panel">
      <div className="analytics-filter-row" role="group" aria-label="Report period">
        <div className="analytics-toggle-group">
          <span className="analytics-toggle-label">Quick period</span>
          {PRESETS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={preset === option.key}
              onClick={() => applyPreset(option.key)}
              className={`analytics-filter-btn${preset === option.key ? ' is-active' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="analytics-inline-field">
          <label htmlFor="report-from">From</label>
          <input
            id="report-from"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPreset('');
            }}
          />
        </div>
        <div className="analytics-inline-field">
          <label htmlFor="report-to">To</label>
          <input
            id="report-to"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPreset('');
            }}
          />
        </div>
        <div className="analytics-inline-field">
          <label htmlFor="report-grace">Grace period</label>
          <select
            id="report-grace"
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
        <button
          type="button"
          className="btn-secondary analytics-filter-action"
          onClick={() => setRetryCount((c) => c + 1)}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <p className="analytics-period-label">
        Report period: <strong>{periodLabel}</strong>
      </p>

      <div className="report-catalogue">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          const isActive = report.key === activeReport.key;
          return (
            <button
              key={report.key}
              type="button"
              className={`report-catalogue-card${isActive ? ' is-active' : ''}`}
              onClick={() => setSelected(report.key)}
              aria-pressed={isActive}
            >
              <span className="report-catalogue-icon">
                <Icon size={18} />
              </span>
              <span className="report-catalogue-body">
                <span className="report-catalogue-title">{report.title}</span>
                <span className="report-catalogue-desc">{report.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="analytics-print-row">
        <button
          type="button"
          className="btn-primary"
          onClick={handlePrint}
          disabled={loading || printing || !preview}
        >
          <Printer size={16} />{' '}
          {printing ? 'Preparing report…' : `Print / Save PDF`}
        </button>
        <button type="button" className="btn-secondary" onClick={() => handleExport('csv')} disabled={loading || !preview}>Export CSV</button>
        <button type="button" className="btn-secondary" onClick={() => handleExport('xlsx')} disabled={loading || !preview}>Export Excel</button>
      </div>

      {loading && <GlobalLoadingOverlay visible={true} message="Preparing report preview..." />}

      {!loading && error && (
        <div className="analytics-error-state">
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={() => setRetryCount((c) => c + 1)}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && preview && (
        <section className="analytics-chart-section">
          <h3 className="analytics-chart-section-title">
            Preview — {activeReport.title}
          </h3>
          <p className="analytics-chart-section-desc">
            <CalendarRange size={14} /> {periodLabel}
          </p>
          {((preview.dataQuality?.syntheticSeedPets || 0) + (preview.dataQuality?.syntheticSeedVaccinations || 0) +
            (preview.dataQuality?.syntheticSeedPayments || 0) + (preview.syntheticData?.current?.pets || 0) +
            (preview.syntheticData?.current?.vaccinations || 0) + (preview.syntheticData?.current?.payments || 0) +
            (preview.syntheticData?.vaccineEpisodes || 0)) > 0 && (
            <p className="analytics-warning">
              Synthetic 2025 seed data is included. Clearly exclude or disclose these records before using this as an official clinic report.
            </p>
          )}

          {activeReport.key === 'summary' && (
            <>
            <div className="summary-row">
              <SummaryCard label="Verified Pet Registrations" value={fmtNum(preview.summary?.totalPets)} />
              <SummaryCard
                label="Vaccinated Pets"
                value={fmtNum(preview.summary?.vaccinatedPets)}
                color="#1e7a46"
              />
              <SummaryCard
                label="Lost Pets"
                value={fmtNum(preview.summary?.lostPets)}
                color="#c8102e"
              />
              <SummaryCard
                label="Generated QR"
                value={fmtNum(preview.summary?.totalQr)}
                color="#c6a15b"
              />
            </div>
            <div className="report-table-container">
              <h3>Monthly registrations and vaccinations</h3>
              <div className="chart-card-canvas">
                <Bar options={reportChartOptions} data={{
                  labels: previewMonths,
                  datasets: [
                    { label: 'Verified registrations', data: previewMonths.map((month) => preview.registrations?.find((row) => row.month === month)?.total || 0), backgroundColor: '#7a0c1e' },
                    { label: 'Vaccine doses', data: previewMonths.map((month) => preview.vaccinations?.find((row) => row.month === month)?.total || 0), backgroundColor: '#1e7a46' },
                  ],
                }} />
              </div>
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead><tr><th>Month</th><th>Verified registrations</th><th>Vaccine doses</th><th>Paid revenue</th></tr></thead>
                  <tbody>{previewMonths.map((month) => {
                    const registrations = preview.registrations?.find((entry) => entry.month === month);
                    const vaccinations = preview.vaccinations?.find((entry) => entry.month === month);
                    const revenue = preview.paymentRevenue?.find((entry) => entry.month === month);
                    return <tr key={month}><td>{month}</td><td>{fmtNum(registrations?.total)}</td><td>{fmtNum(vaccinations?.total)}</td><td>{fmtPeso(revenue?.total)}</td></tr>;
                  })}</tbody>
                </table>
              </div>
              <p>Pet registrations use registration date when available. Revenue includes paid ledger records only.</p>
            </div>
            <div className="report-table-container">
              <h3>Species and barangay distribution</h3>
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead><tr><th>Species</th><th>Verified pets</th><th>Barangay</th><th>Verified pets</th></tr></thead>
                  <tbody>{Array.from({ length: Math.max(preview.species?.length || 0, preview.barangays?.length || 0) }).map((_, index) => (
                    <tr key={index}><td>{preview.species?.[index]?.species || '—'}</td><td>{fmtNum(preview.species?.[index]?.total)}</td><td>{preview.barangays?.[index]?.barangay || '—'}</td><td>{fmtNum(preview.barangays?.[index]?.total)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
            </>
          )}

          {activeReport.key === 'compliance' && (
            <>
            <div className="summary-row">
              <SummaryCard
                label="Episodes Evaluated"
                value={fmtNum(preview.summary?.evaluable)}
                sub={[{ label: 'Episodes', value: fmtNum(preview.summary?.episodes) }]}
              />
              <SummaryCard
                label="On-Time Rate"
                value={fmtPct(preview.summary?.onTimeRate)}
                color="#1e7a46"
              />
              <SummaryCard
                label="Never Returned"
                value={fmtNum(preview.summary?.noReturn)}
                color="#c8102e"
              />
              <SummaryCard
                label="Owners To Contact"
                value={fmtNum(preview.actionableTotal)}
                color="#c6a15b"
              />
            </div>
            <div className="report-table-container">
              <h3>Follow-up outcome breakdown</h3>
              <div className="chart-card-canvas">
                <Bar options={reportChartOptions} data={{
                  labels: (preview.buckets || []).map((row) => row.status),
                  datasets: [{ label: 'Vaccine episodes', data: (preview.buckets || []).map((row) => row.total), backgroundColor: ['#1e7a46', '#b8860b', '#c8102e', '#6b6062', '#c6a15b'] }],
                }} />
              </div>
              <div className="report-table-wrapper"><table className="report-table">
                <thead><tr><th>Outcome</th><th>Episodes</th><th>Share</th></tr></thead>
                <tbody>{(preview.buckets || []).map((row) => <tr key={row.status}><td>{row.status}</td><td>{fmtNum(row.total)}</td><td>{fmtPct(row.pct)}</td></tr>)}</tbody>
              </table></div>
              <h3>Key findings</h3><ul>{(preview.analysis?.findings || []).map((item) => <li key={item}>{item}</li>)}</ul>
              <h3>Recommendations</h3><ul>{(preview.analysis?.recommendations || []).map((item) => <li key={item}>{item}</li>)}</ul>
              <h3>Monthly on-time trend (evaluated n and pending shown)</h3>
              <div className="chart-card-canvas">
                <Bar options={reportChartOptions} data={{
                  labels: (preview.trend || []).map((row) => row.period),
                  datasets: [{ label: 'On-time rate (%)', data: (preview.trend || []).map((row) => row.onTimeRate), backgroundColor: '#1e7a46' }],
                }} />
              </div>
              <h3>Owner-stated retention reasons</h3><div className="report-table-wrapper"><table className="report-table">
                <thead><tr><th>Reason</th><th>Count</th></tr></thead>
                <tbody>{(preview.retentionReasons || []).map((row) => <tr key={row.key}><td>{row.label}</td><td>{fmtNum(row.count)}</td></tr>)}</tbody>
              </table></div>
              <h3>Any-service retention and follow-up</h3>
              <p>
                {fmtPct(preview.serviceReturn?.summary?.returnRate30)} of mature service episodes had any-service return within 30 days;
                owner retention within 90 days was {fmtPct(preview.serviceReturn?.retention?.retentionRate)}.
              </p>
            </div>
            </>
          )}

          {(activeReport.key === 'comparison' || activeReport.key === 'yearly') && (
            <>
              <div className="chart-card-canvas">
                <Bar options={reportChartOptions} data={{
                  labels: (preview.series || []).map((row) => row.label),
                  datasets: [
                    { label: preview.current?.label || 'Current', data: (preview.series || []).map((row) => Number(row.current?.[preview.primaryMetric]) || 0), backgroundColor: '#c8102e' },
                    { label: preview.baseline?.label || 'Baseline', data: (preview.series || []).map((row) => Number(row.baseline?.[preview.primaryMetric]) || 0), backgroundColor: '#c6a15b' },
                  ],
                }} />
              </div>
              <div className="summary-row">
                <SummaryCard
                  label="Doses"
                  value={fmtNum(preview.totals?.current?.doses)}
                  sub={[{ label: 'Baseline', value: fmtNum(preview.totals?.baseline?.doses) }]}
                />
                <SummaryCard
                  label="Unique Pets"
                  value={fmtNum(preview.totals?.current?.pets)}
                  color="#1e7a46"
                />
                <SummaryCard
                  label="On-Time Rate"
                  value={fmtPct(preview.totals?.current?.onTimeRate)}
                  color="#b8860b"
                />
                <SummaryCard
                  label="Revenue"
                  value={fmtPeso(preview.totals?.current?.revenue)}
                  color="#c6a15b"
                />
              </div>

              <div className="report-table-container">
                <h3>
                  {activeReport.key === 'yearly' ? 'Yearly totals' : 'Period by period'}
                </h3>
                <div className="report-table-wrapper">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>{activeReport.key === 'yearly' ? 'Year' : 'Period'}</th>
                        <th>Doses</th>
                        <th>Pets</th>
                        <th>Owners</th>
                        <th>On-Time Rate</th>
                        <th>Revenue</th>
                        {activeReport.key !== 'yearly' && <><th>Baseline doses</th><th>Baseline revenue</th></>}
                      </tr>
                    </thead>
                    <tbody>
                      {activeReport.key === 'yearly'
                        ? (preview.yearly || []).map((row) => (
                            <tr key={row.year}>
                              <td>{row.year}</td>
                              <td>{fmtNum(row.doses)}</td>
                              <td>{fmtNum(row.pets)}</td>
                              <td>{fmtNum(row.owners)}</td>
                              <td>{fmtPct(row.onTimeRate)}</td>
                              <td>{fmtPeso(row.revenue)}</td>
                              {activeReport.key !== 'yearly' && <><td>—</td><td>—</td></>}
                            </tr>
                          ))
                        : (preview.series || []).map((row) => (
                            <tr key={row.key}>
                              <td>{row.label}</td>
                              <td>{fmtNum(row.current?.doses ?? 0)}</td>
                              <td>{fmtNum(row.current?.pets ?? 0)}</td>
                              <td>{fmtNum(row.current?.owners ?? 0)}</td>
                              <td>
                                {row.current ? fmtPct(row.current.onTimeRate) : '—'}
                              </td>
                              <td>{row.current ? fmtPeso(row.current.revenue) : '—'}</td>
                              <td>{row.baseline ? fmtNum(row.baseline.doses) : '—'}</td>
                              <td>{row.baseline ? fmtPeso(row.baseline.revenue) : '—'}</td>
                            </tr>
                          ))}
                      {activeReport.key === 'yearly' && !(preview.yearly || []).length ? (
                        <tr>
                          <td className="report-table-empty" colSpan={activeReport.key === 'yearly' ? 6 : 8}>
                            No yearly data available.
                          </td>
                        </tr>
                      ) : null}
                      {activeReport.key !== 'yearly' && !(preview.series || []).length ? (
                        <tr>
                          <td className="report-table-empty" colSpan={8}>
                            No comparison data available.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
