import { useCallback, useEffect, useMemo, useState } from 'react';
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

const PRESETS = [
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'lastYear', label: 'Last Year' },
  { key: 'all', label: 'All Time' },
];

const GRACE_OPTIONS = [0, 15, 30, 60, 90];

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
          const params = { grace };
          if (from) params.from = from;
          if (to) params.to = to;
          const res = await api.get('/analytics/vaccine-compliance', { params });
          return res.data;
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
          const res = await api.get('/analytics/vaccination-trends', {
            params: { granularity: 'monthly', compare: 'previous', anchor: toISO(new Date()) },
          });
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
            params: { granularity: 'yearly', compare: 'previous', anchor: toISO(new Date()) },
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

  const applyPreset = (key) => {
    setPreset(key);
    const range = presetRange(key);
    setFrom(range.from);
    setTo(range.to);
  };

  const periodLabel = preview?.filterLabel || (from || to ? `${from || '…'} → ${to || '…'}` : 'All Time');

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
          {printing ? 'Preparing report…' : `Print ${activeReport.title}`}
        </button>
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

          {activeReport.key === 'summary' && (
            <div className="summary-row">
              <SummaryCard label="Registered Pets" value={fmtNum(preview.summary?.totalPets)} />
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
          )}

          {activeReport.key === 'compliance' && (
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
          )}

          {(activeReport.key === 'comparison' || activeReport.key === 'yearly') && (
            <>
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
                            </tr>
                          ))}
                      {activeReport.key === 'yearly' && !(preview.yearly || []).length ? (
                        <tr>
                          <td className="report-table-empty" colSpan={6}>
                            No yearly data available.
                          </td>
                        </tr>
                      ) : null}
                      {activeReport.key !== 'yearly' && !(preview.series || []).length ? (
                        <tr>
                          <td className="report-table-empty" colSpan={6}>
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
