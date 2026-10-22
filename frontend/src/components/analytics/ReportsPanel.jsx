import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
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

export default function ReportsPanel({ from = '', to = '', periodLabel, onOpenFollowups }) {
  const [grace, setGrace] = useState(30);

  const [selected, setSelected] = useState('summary');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

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
            params: {
              granularity: 'yearly',
              compare: 'previousYear',
              anchor: toISO(new Date()),
            },
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

  const reportPeriodLabel = preview?.filterLabel ||
    (preview?.current ? fmtRange(preview.current) || preview.current.label :
      periodLabel || (from || to ? `${from || '…'} → ${to || '…'}` : 'All Time'));
  const previewMonths = Array.from(new Set([
    ...(preview?.registrations || []).map((row) => row.month),
    ...(preview?.vaccinations || []).map((row) => row.month),
    ...(preview?.paymentRevenue || []).map((row) => row.month),
  ])).sort((a, b) => new Date(`${a} 1`).getTime() - new Date(`${b} 1`).getTime());
  const visibleMonths = previewMonths.slice(-12);
  const comparisonRows = activeReport.key === 'yearly' ? preview?.yearly || [] : preview?.series || [];
  const visibleComparisonRows = comparisonRows.slice(activeReport.key === 'yearly' ? -5 : -6);

  return (
    <div className="analytics-panel">
      <div className="analytics-filter-row" role="group" aria-label="Report period">
        {selected === 'compliance' && (
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
        )}
        <button
          type="button"
          className="btn-secondary analytics-filter-action"
          onClick={() => setRetryCount((c) => c + 1)}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <p className="analytics-period-label">
        Report period: <strong>{reportPeriodLabel}</strong>
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
          <div className="analytics-report-preview-header">
            <div>
              <h3 className="analytics-chart-section-title">Preview — {activeReport.title}</h3>
              <p className="analytics-chart-section-desc"><CalendarRange size={14} /> {reportPeriodLabel}</p>
            </div>
            <div className="analytics-print-row">
              <button type="button" className="btn-primary" onClick={handlePrint} disabled={loading || printing || !preview}>
                <Printer size={16} /> {printing ? 'Preparing report…' : 'Print / Save PDF'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => handleExport('csv')} disabled={loading || !preview}>Export CSV</button>
              <button type="button" className="btn-secondary" onClick={() => handleExport('xlsx')} disabled={loading || !preview}>Export Excel</button>
            </div>
          </div>
          {activeReport.key === 'summary' && (
            <>
            <div className="summary-row summary-row--three">
              <SummaryCard label="Verified Pet Registrations" value={fmtNum(preview.summary?.totalPets)} />
              <SummaryCard
                label="Vaccinated Pets"
                value={fmtNum(preview.summary?.vaccinatedPets)}
                color="#1e7a46"
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
                  labels: visibleMonths,
                  datasets: [
                    { label: 'Verified registrations', data: visibleMonths.map((month) => preview.registrations?.find((row) => row.month === month)?.total || 0), backgroundColor: '#7a0c1e' },
                    { label: 'Vaccine doses', data: visibleMonths.map((month) => preview.vaccinations?.find((row) => row.month === month)?.total || 0), backgroundColor: '#1e7a46' },
                  ],
                }} />
              </div>
              <p className="analytics-visual-explanation">Each month compares verified registrations with vaccine doses recorded by service date. These are event counts, not unique pets. Pet registrations use registration date when available; revenue includes paid ledger records only.</p>
            </div>
            <div className="analytics-insight-grid">
              <div className="chart-card">
                <h3>Top 5 barangays</h3>
                <p className="analytics-visual-explanation">Ranks the five barangays with the most verified pet registrations in this report period.</p>
                <ol>
                  {(preview.barangays || []).slice(0, 5).map((row) => (
                    <li key={row.barangay}>{row.barangay}: <strong>{fmtNum(row.total)}</strong> verified pets</li>
                  ))}
                  {!(preview.barangays || []).length && <li>No verified pets with barangay data are available in this period. Check the date range or registration address records.</li>}
                </ol>
              </div>
              <div className="chart-card">
                <h3>Species split</h3>
                <p className="analytics-visual-explanation">Shows the verified pet count by species to summarize which animals make up the registered population.</p>
                <ul>
                  {(preview.species || []).slice(0, 5).map((row) => (
                    <li key={row.species}>{row.species}: <strong>{fmtNum(row.total)}</strong> verified pets</li>
                  ))}
                  {!(preview.species || []).length && <li>No verified pet species data is available in this period. Check the date range or pet records.</li>}
                </ul>
              </div>
            </div>
            </>
          )}

          {activeReport.key === 'compliance' && (
            <>
            <div className="summary-row">
              <SummaryCard
                label="Follow-ups Evaluated"
                value={fmtNum(preview.summary?.evaluable)}
                sub={[{ label: 'Follow-ups', value: fmtNum(preview.summary?.episodes) }]}
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
            <div className="chart-grid">
              <div className="chart-card">
                <h3>Follow-up outcomes</h3>
                <p className="analytics-visual-explanation">Breaks down evaluated vaccine follow-ups by outcome. Follow-ups still inside the grace period are pending and excluded from these shares.</p>
                <div className="chart-card-canvas">
                  <Doughnut
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
                        datalabels: { display: false },
                      },
                    }}
                    data={{
                      labels: (preview.buckets || []).filter((row) => row.status !== 'Pending').map((row) => row.status),
                      datasets: [{
                        data: (preview.buckets || []).filter((row) => row.status !== 'Pending').map((row) => row.total),
                        backgroundColor: ['#1e7a46', '#b8860b', '#c8102e', '#6b6062'],
                        borderWidth: 0,
                      }],
                    }}
                  />
                </div>
              </div>
              <div className="chart-card">
                <h3>Monthly on-time rate</h3>
                <p className="analytics-visual-explanation">Shows the monthly share of evaluated follow-ups returned on time. Lower values can indicate a need to review reminder and contact practices.</p>
                <div className="chart-card-canvas">
                  <Line
                    options={{
                      ...reportChartOptions,
                      plugins: { legend: { display: false }, datalabels: { display: false } },
                      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%` } } },
                    }}
                    data={{
                      labels: (preview.trend || []).map((row) => row.period),
                      datasets: [{
                        label: 'On-time rate (%)',
                        data: (preview.trend || []).map((row) => row.onTimeRate),
                        borderColor: '#1e7a46',
                        backgroundColor: 'rgba(30, 122, 70, 0.12)',
                        fill: true,
                        tension: 0,
                        pointRadius: 3,
                      }],
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="report-table-container">
              <h3>Key findings</h3>
              <ul>{(preview.analysis?.findings || []).slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
              {(preview.retentionReasons || []).some((row) => Number(row.count) > 0) && (
                <>
                  <h3>Top owner-stated reasons</h3>
                  <ul>
                    {(preview.retentionReasons || [])
                      .filter((row) => Number(row.count) > 0)
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 3)
                      .map((row) => <li key={row.key}>{row.label}: <strong>{fmtNum(row.count)}</strong></li>)}
                  </ul>
                </>
              )}
            </div>
            </>
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
              <p className="analytics-visual-explanation">The x-axis is the report period; each bar shows the selected measure for current and baseline periods. Review the table below to find which periods drove the difference.</p>
              <div className="chart-card-canvas">
                <Bar options={reportChartOptions} data={{
                  labels: (preview.series || []).map((row) => row.label),
                  datasets: [
                    { label: preview.current?.label || 'Current', data: (preview.series || []).map((row) => Number(row.current?.[preview.primaryMetric]) || 0), backgroundColor: '#c8102e' },
                    { label: preview.baseline?.label || 'Baseline', data: (preview.series || []).map((row) => Number(row.baseline?.[preview.primaryMetric]) || 0), backgroundColor: '#c6a15b' },
                  ],
                }} />
              </div>

              <div className="report-table-container">
                <h3>
                  {activeReport.key === 'yearly' ? 'Yearly totals' : 'Period by period'}
                </h3>
                <p className="analytics-chart-section-desc">This table contains the records included in the preview. “Change vs previous year” is the dose change; the remaining columns show current values or current and baseline values by period.</p>
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
                        {activeReport.key === 'yearly' && <th>Change vs previous year</th>}
                        {activeReport.key !== 'yearly' && <><th>Baseline doses</th><th>Baseline revenue</th></>}
                      </tr>
                    </thead>
                    <tbody>
                      {activeReport.key === 'yearly'
                        ? visibleComparisonRows.map((row) => (
                            <tr key={row.year}>
                              <td>{row.year}</td>
                              <td>{fmtNum(row.doses)}</td>
                              <td>{fmtNum(row.pets)}</td>
                              <td>{fmtNum(row.owners)}</td>
                              <td>{fmtPct(row.onTimeRate)}</td>
                              <td>{fmtPeso(row.revenue)}</td>
                              {activeReport.key === 'yearly' && (
                                <td>
                                  {fmtDelta(row.deltas?.doses?.delta)}
                                  {row.deltas?.doses?.pctChange != null && (
                                    <small className="analytics-table-delta">
                                      {Number(row.deltas.doses.pctChange) > 0 ? '+' : ''}
                                      {Number(row.deltas.doses.pctChange).toFixed(1)}%
                                    </small>
                                  )}
                                </td>
                              )}
                              {activeReport.key !== 'yearly' && <><td>—</td><td>—</td></>}
                            </tr>
                          ))
                        : visibleComparisonRows.map((row) => (
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
                          <td className="report-table-empty" colSpan={activeReport.key === 'yearly' ? 7 : 8}>
                            No yearly vaccination data is available. Choose another report period or check that vaccine service records have been entered.
                          </td>
                        </tr>
                      ) : null}
                      {activeReport.key !== 'yearly' && !(preview.series || []).length ? (
                        <tr>
                          <td className="report-table-empty" colSpan={8}>
                            No period comparison data is available. Choose a wider report period or check that vaccination records exist for both periods.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          <p className="analytics-preview-note">
            Summary preview only. Full tables, definitions and signature blocks are included in Print / Save PDF and the exports.
          </p>
          {activeReport.key === 'compliance' && Number(preview.actionableTotal) > 0 && (
            <div className="analytics-action-callout">
              <div>
                <strong>{fmtNum(preview.actionableTotal)} follow-ups need review</strong>
                <p>Open the follow-up list to review due episodes, owner contact details, and recorded outcomes.</p>
              </div>
              <button type="button" className="btn-primary" onClick={onOpenFollowups}>Open Follow-Up List</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
