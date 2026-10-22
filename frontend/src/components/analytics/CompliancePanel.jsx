import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Printer, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../../services/api';
import SummaryCard from '../SummaryCard';
import GlobalLoadingOverlay from '../GlobalLoadingOverlay';
import { useAuth } from '../../context/AuthContext';
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
  { key: 'episodes', label: 'Follow-ups with a due date' },
  { key: 'dueEvaluable', label: 'Follow-ups outside grace / evaluated' },
  { key: 'returned', label: 'Returned for the same vaccine' },
  { key: 'onTime', label: 'Returned on time' },
];

const RETENTION_REASONS = [
  ['forgot_schedule', 'Forgot / unaware of schedule'],
  ['no_reminder', 'Did not receive reminder'],
  ['distance_transport', 'Distance / transportation'],
  ['clinic_hours', 'Clinic hours did not work'],
  ['cost', 'Cost'],
  ['other_clinic', 'Went to another clinic / private vet'],
  ['moved', 'Moved / changed barangay'],
  ['lost_deceased', 'Pet lost or deceased'],
  ['pet_health_fear', 'Pet illness / fear'],
  ['other', 'Other'],
];

const REASON_ACTIONS = {
  forgot_schedule: 'Offer a reminder card or QR-linked vaccine schedule.',
  no_reminder: 'Review SMS/call reminder delivery before the due date.',
  distance_transport: 'Consider barangay outreach or a mobile vaccination day.',
  clinic_hours: 'Review clinic hours and appointment availability.',
  cost: 'Consider a low-cost or free vaccination outreach program.',
  other_clinic: 'Verify the owner’s record and update it when confirmed.',
  moved: 'Update the owner address; this episode is excluded from compliance.',
  lost_deceased: 'Update the pet status; this episode is excluded from compliance.',
  pet_health_fear: 'Offer veterinary guidance and discuss a suitable visit time.',
  other: 'Review the owner-provided note and follow up as appropriate.',
};

function localISODate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

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

export default function CompliancePanel({ from = '', to = '', initialSubTab = '' }) {
  const { user } = useAuth();
  const canManageContacts = ['Admin', 'Staff'].includes(user?.role);
  const [subTab, setSubTab] = useState(['summary', 'service', 'reasons', 'followups'].includes(initialSubTab) ? initialSubTab : 'summary');
  const [grace, setGrace] = useState(30);
  const [barangay, setBarangay] = useState('');

  const [compliance, setCompliance] = useState(null);
  const [returns, setReturns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [search, setSearch] = useState('');
  const [contactStatusFilter, setContactStatusFilter] = useState('');
  const [vaccineFilter, setVaccineFilter] = useState('');
  const [sortBy, setSortBy] = useState('daysOverdue');
  const [page, setPage] = useState(1);
  const [selectedFactor, setSelectedFactor] = useState('Barangay');
  const [breakdown, setBreakdown] = useState('barangay');
  const [showAllCohorts, setShowAllCohorts] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showAllFactors, setShowAllFactors] = useState(false);
  const [showAllBarangays, setShowAllBarangays] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactDraft, setContactDraft] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = { grace, limit: 10, page, sortBy };
    if (from) params.from = from;
    if (to) params.to = to;
    if (barangay.trim()) params.barangay = barangay.trim();
    if (search.trim()) params.search = search.trim();
    if (contactStatusFilter) params.contactStatus = contactStatusFilter;
    if (vaccineFilter) params.vaccine = vaccineFilter;

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
  }, [from, to, grace, barangay, search, contactStatusFilter, vaccineFilter, sortBy, page]);

  const saveContact = async () => {
    if (!editingContact || !contactDraft) return;
    try {
      await api.put(`/analytics/vaccine-follow-up/${editingContact.id}/contact`, contactDraft);
      toast.success('Follow-up contact saved.');
      setEditingContact(null);
      setContactDraft(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save follow-up contact.');
    }
  };

  const exportActionableCsv = () => {
    const rows = compliance?.actionable || [];
    if (!rows.length) {
      toast.error('There are no follow-up rows on this page to export.');
      return;
    }
    const columns = [
      ['Pet code', 'pet_code'], ['Pet', 'pet_name'], ['Owner', 'owner_name'],
      ['Contact', 'contact_number'], ['Barangay', 'barangay'], ['Vaccine', 'vaccine_name'],
      ['Due date', 'due_on'], ['Days overdue', 'days_overdue'], ['Last service', 'last_service_on'],
      ['Outcome', 'outcome'], ['Contact status', 'contact_status'], ['Reasons', 'reasons'],
      ['Other reason', 'other_reason'], ['Contact date', 'contacted_at'],
    ];
    const csv = [
      columns.map(([label]) => csvCell(label)).join(','),
      ...rows.map((row) => columns
        .map(([, key]) => csvCell(key === 'reasons' ? (row[key] || []).join('; ') : row[key]))
        .join(',')),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vaccine-follow-ups-page.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    load();
  }, [load, retryCount]);

  useEffect(() => {
    setPage(1);
  }, [from, to]);

  useEffect(() => {
    if (!canManageContacts && subTab === 'followups') setSubTab('summary');
  }, [canManageContacts, subTab]);

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

      params.limit = 1000;
      params.page = 1;
      const [res, serviceReturn] = await Promise.all([
        api.get('/analytics/vaccine-compliance', { params }),
        api.get('/analytics/return-rate', { params }),
      ]);
      if (!res.data?.success) {
        toast.error(res.data?.message || 'Could not build the report.');
        return;
      }
      printComplianceReport({ ...res.data, serviceReturn: serviceReturn.data }, {
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
  const factorOptions = useMemo(
    () => Array.from(new Set((compliance?.factors || []).map((row) => row.factor))),
    [compliance]
  );
  const selectedFactors = (compliance?.factors || []).filter((row) => row.factor === selectedFactor);
  const visibleFactors = showAllFactors ? selectedFactors : selectedFactors.slice(0, 8);
  const barangayRows = (compliance?.byBarangay || [])
    .slice()
    .sort((a, b) => a.onTimeRate - b.onTimeRate);
  const visibleBarangays = showAllBarangays ? barangayRows : barangayRows.slice(0, 8);
  const lowestBarangays = new Set(
    barangayRows
      .filter((row) => Number(row.evaluable) >= 30)
      .slice(0, 3)
      .map((row) => row.key)
  );
  const biggestGaps = selectedFactors
    .filter((row) => row.sampleSize >= 30 && Number.isFinite(Number(row.returnedRate)))
    .sort((a, b) => a.returnedRate - b.returnedRate)
    .slice(0, 5);
  const contactProgress = compliance?.contactProgress || { contacted: 0, actionable: compliance?.actionableTotal || 0 };
  const contactedPct = contactProgress.actionable
    ? Math.round((contactProgress.contacted / contactProgress.actionable) * 100)
    : 0;
  const recordedReasons = (compliance?.retentionReasons || []).filter((row) => row.count > 0);
  const topReasons = recordedReasons.slice().sort((a, b) => b.count - a.count).slice(0, 3);

  return (
    <div className="analytics-panel">
      <div className="analytics-filter-row" role="group" aria-label="Compliance filters">
        <div className="analytics-inline-field">
          <label htmlFor="compliance-grace">Grace period</label>
          <select
            id="compliance-grace"
            value={grace}
            onChange={(e) => { setPage(1); setGrace(Number(e.target.value)); }}
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
            onChange={(e) => { setPage(1); setBarangay(e.target.value); }}
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
            setGrace(30);
            setBarangay('');
            setSearch('');
            setContactStatusFilter('');
            setVaccineFilter('');
            setSortBy('daysOverdue');
            setPage(1);
          }}
          disabled={grace === 30 && !barangay && !search && !contactStatusFilter && !vaccineFilter && sortBy === 'daysOverdue'}
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

      <div className="analytics-subtabs" role="tablist" aria-label="Vaccine compliance sections">
        {[
          ['summary', 'Summary'],
          ['service', 'Service Return'],
          ['reasons', "Why Owners Don't Return"],
          ...(canManageContacts ? [['followups', 'Follow-Up List']] : []),
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={subTab === key}
            className={`analytics-subtab${subTab === key ? ' is-active' : ''}`}
            onClick={() => setSubTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="analytics-period-label">
        Showing: <strong>{compliance?.filterLabel || 'All Time'}</strong>
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
          {subTab === 'summary' && (
          <>
          <div className="summary-row">
            <SummaryCard
              label="Follow-ups Evaluated"
              value={fmtNum(summary.evaluable)}
              hint="A follow-up is one vaccination record with a due date. Evaluated follow-ups are outside the grace period; those still inside it are pending and excluded."
              sub={[
                { label: 'Evaluated', value: fmtNum(summary.evaluable) },
                { label: 'Pending in grace', value: fmtNum(summary.pending) },
              ]}
            />
            <SummaryCard
              label="On-Time Compliance"
              value={fmtPct(summary.onTimeRate)}
              color="#1e7a46"
              hint="On time = returned for the same vaccine on or before the due date plus grace. Late = returned after that. Lapsed = never returned and beyond the grace period."
              sub={[
                { label: 'On time', value: fmtNum(summary.onTime) },
                { label: 'Late', value: fmtNum(summary.late) },
                { label: 'Lapsed', value: fmtNum(summary.lapsed) },
              ]}
            />
            <SummaryCard
              label="No Same-Vaccine Return"
              value={fmtNum(summary.noReturn)}
              color="#c8102e"
              hint="Evaluated follow-ups where the pet never received the next dose of the same vaccine."
              sub={[
                { label: 'Share of evaluated', value: fmtPct(summary.noReturnRate) },
                { label: 'Pets affected', value: fmtNum(summary.petsNeverReturning) },
              ]}
            />
            <SummaryCard
              label="Any-Service Return Rate"
              value={fmtPct(summary.anyServiceReturnedRate)}
              color="#c6a15b"
              hint="Share of evaluated vaccine follow-ups where the pet had any later clinic service, even a different service type."
              sub={[
                { label: 'Follow-ups in denominator', value: fmtNum(summary.evaluable) },
                { label: 'Distinct pets in period', value: fmtNum(summary.distinctPets) },
              ]}
            />
          </div>
          {Number(compliance.actionableTotal) > 0 && (
            <div className="analytics-action-callout">
              <div>
                <strong>{fmtNum(compliance.actionableTotal)} follow-ups need review</strong>
                <p>Open the list to check the due date, owner contact progress, and recorded outcome for each follow-up.</p>
              </div>
              <button type="button" className="btn-primary" onClick={() => setSubTab('followups')}>Open Follow-Up List</button>
            </div>
          )}

          <div className="chart-grid chart-grid--1col">
            <div className="chart-card">
              <h3>Follow-Up Outcomes</h3>
              <p className="analytics-visual-explanation">Each slice is an evaluated vaccine follow-up, not a unique pet. On Time and Late mean the same vaccine was given; Lapsed and No Return have no matching dose after the due date and grace period. Pending episodes are excluded.</p>
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
                  <p className="chart-card-empty">No follow-ups are due in this period. Choose a wider date range to review earlier due episodes.</p>
                )}
              </div>
              {Number(summary.pending) > 0 && (
                <p className="analytics-chart-section-desc">
                  {fmtNum(summary.pending)} follow-up(s) pending in the grace period are excluded from the outcomes above.
                </p>
              )}
            </div>

            <div className="chart-card">
              <h3>Monthly On-Time Rate</h3>
              <p className="analytics-visual-explanation">Shows the share of evaluated follow-ups returned on time each month. Hover a point for the sample size; treat periods with fewer than 30 evaluated follow-ups as directional only.</p>
              <p className="analytics-chart-section-desc">
                The tooltip shows evaluated sample size and follow-ups still pending; periods with n &lt; 30 are small samples.
              </p>
              <div className="chart-card-canvas">
                {(compliance?.trend || []).length ? (
                  <Line
                    options={{
                      ...lineOptions,
                      plugins: {
                        ...lineOptions.plugins,
                        tooltip: {
                          ...lineOptions.plugins.tooltip,
                          callbacks: {
                            afterLabel: (context) => {
                              const point = compliance?.trend?.[context.dataIndex];
                              return point
                                ? [`Evaluated n=${point.evaluable}`, `Pending=${point.pending}`, point.lowSample ? 'Small sample (n < 30)' : '']
                                : '';
                            },
                          },
                        },
                      },
                    }}
                    data={{
                      labels: (compliance?.trend || []).map((t) => t.period),
                      datasets: [
                        {
                          label: 'On-time rate (%)',
                          data: (compliance?.trend || []).map((t) => t.onTimeRate),
                          borderColor: '#1e7a46',
                          backgroundColor: 'rgba(30, 122, 70, 0.12)',
                          fill: true,
                          tension: 0,
                          pointRadius: (compliance?.trend || []).map((t) => (t.lowSample ? 5 : 3)),
                          pointStyle: (compliance?.trend || []).map((t) => (t.lowSample ? 'triangle' : 'circle')),
                        },
                      ],
                    }}
                  />
                ) : (
                  <p className="chart-card-empty">No monthly trend is available yet. Choose a wider date range or wait until more follow-ups are evaluated.</p>
                )}
              </div>
            </div>
          </div>

          <section className="analytics-chart-section">
            <h3 className="analytics-chart-section-title">Key Findings & Recommendations</h3>
            <div className="analytics-insight-grid">
              <div className="chart-card">
                <h3>Key Findings</h3>
                <ul>{(compliance.analysis?.findings || []).map((finding) => <li key={finding}>{finding}</li>)}</ul>
                <p>{compliance.analysis?.interpretation}</p>
              </div>
              <div className="chart-card">
                <h3>Recommended Actions</h3>
                <ul>{(compliance.analysis?.recommendations || []).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
          </section>

          <div className="analytics-breakdown-switch" role="group" aria-label="Compliance breakdown">
            <button type="button" className={breakdown === 'barangay' ? 'is-active' : ''} aria-pressed={breakdown === 'barangay'} onClick={() => setBreakdown('barangay')}>
              By Barangay
            </button>
            <button type="button" className={breakdown === 'vaccine' ? 'is-active' : ''} aria-pressed={breakdown === 'vaccine'} onClick={() => setBreakdown('vaccine')}>
              By Vaccine
            </button>
          </div>
          </>
          )}

          {subTab === 'reasons' && (
          <>
          <div className="analytics-reasons-order">
          <section className="analytics-chart-section analytics-order-contact">
            <div className="analytics-contact-progress" role="status">
              Contact progress: <strong>{fmtNum(contactProgress.contacted)} of {fmtNum(contactProgress.actionable)}</strong>
              {' '}actionable follow-ups contacted ({contactedPct}%)
              <progress value={contactProgress.contacted} max={Math.max(contactProgress.actionable, 1)} aria-label="Follow-up contact progress" />
              {canManageContacts && (
                <button type="button" className="analytics-inline-link" onClick={() => setSubTab('followups')}>
                  Go to Follow-Up List →
                </button>
              )}
            </div>
            <p className="analytics-chart-section-desc">
              Reasons below come only from what owners told clinic staff during follow-up contact. A missed visit alone is never treated as a reason.
            </p>
          </section>
          <section className="analytics-chart-section analytics-order-factors">
            <h3 className="analytics-chart-section-title">Factors Affecting Return</h3>
            <p className="analytics-chart-section-desc">
              These are associations in recorded clinic data, not proof of why an owner did or did not return. Rates use evaluated follow-ups; n &lt; 30 is a small sample.
            </p>
            <label className="analytics-inline-field">
              <span>Compare by factor</span>
              <select value={selectedFactor} onChange={(event) => setSelectedFactor(event.target.value)}>
                {factorOptions.map((factor) => <option key={factor} value={factor}>{factor}</option>)}
              </select>
            </label>
            {biggestGaps.length > 0 && (
              <div className="chart-card">
                <h3>Largest return gaps (n ≥ 30)</h3>
                <ul>{biggestGaps.map((row) => (
                  <li key={row.group}>{row.group}: {fmtPct(row.returnedRate)} return rate from {fmtNum(row.sampleSize)} follow-ups.</li>
                ))}</ul>
              </div>
            )}
            <div className="report-table-wrapper">
              <table className="report-table">
                <thead><tr><th>Group</th><th>n Evaluated</th><th>Returned</th><th>Return Rate</th><th>On-Time Rate</th></tr></thead>
                <tbody>
                  {visibleFactors.map((row) => (
                    <tr key={`${row.factor}-${row.group}`}>
                      <td>{row.group}{row.lowSample ? ' *' : ''}</td>
                      <td>{fmtNum(row.sampleSize)}</td><td>{fmtNum(row.returned)}</td>
                      <td>{fmtPct(row.returnedRate)}</td><td>{fmtPct(row.onTimeRate)}</td>
                    </tr>
                  ))}
                  {!visibleFactors.length && (
                    <tr><td className="report-table-empty" colSpan={5}>No evaluated follow-ups match this factor and period. Try a broader date range or another factor.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {selectedFactors.length > 8 && (
              <button type="button" className="btn-secondary" onClick={() => setShowAllFactors((value) => !value)}>
                {showAllFactors ? 'Show top 8 groups' : `Show all ${selectedFactors.length} groups`}
              </button>
            )}
          </section>

          <section className="analytics-chart-section analytics-order-reasons">
            <h3 className="analytics-chart-section-title">Retention Reasons Recorded</h3>
            <p className="analytics-chart-section-desc">
              Only reasons explicitly recorded during owner contact are shown. Missing reasons are not inferred from a missed visit.
            </p>
            <div className="chart-card">
              <div className="chart-card-canvas">
              {(compliance.retentionReasons || []).some((reason) => reason.count > 0) ? (
                <Bar
                  options={{
                    ...barOptions,
                    indexAxis: 'y',
                    plugins: {
                      ...barOptions.plugins,
                      tooltip: {
                        ...barOptions.plugins.tooltip,
                        callbacks: {
                          afterLabel: (context) => {
                            const reason = recordedReasons[context.dataIndex];
                            const denominator = Number(compliance.reasonContacted) || 0;
                            return `${denominator ? Math.round((reason.count / denominator) * 100) : 0}% of contacted follow-ups`;
                          },
                        },
                      },
                    },
                  }}
                  data={{
                    labels: recordedReasons.map((reason) => reason.label),
                    datasets: [{
                      label: 'Recorded owner-stated reasons',
                      data: recordedReasons.map((reason) => reason.count),
                      backgroundColor: '#2879a8',
                      borderRadius: 4,
                    }],
                  }}
                />
              ) : (
                <div className="chart-card-empty">
                  <p>No owner-stated reasons have been recorded yet. Record an owner contact in the Follow-Up List to add a reason.</p>
                  {canManageContacts && (
                    <button type="button" className="analytics-inline-link" onClick={() => setSubTab('followups')}>
                      Record contact in the Follow-Up List →
                    </button>
                  )}
                </div>
              )}
              </div>
            </div>
            <h3>Suggested actions from the top recorded reasons</h3>
            {topReasons.length ? (
              <ol>{topReasons.map((reason) => (
                <li key={reason.key}><strong>{reason.label} ({fmtNum(reason.count)}):</strong> {REASON_ACTIONS[reason.key] || 'Review the recorded reason and follow up as appropriate.'}</li>
              ))}</ol>
            ) : <p>Suggested actions will appear once reasons are recorded during follow-up.</p>}
          </section>
          </div>
          </>
          )}

          {subTab === 'summary' && breakdown === 'vaccine' && (
          <>
          <section className="analytics-chart-section">
            <h3 className="analytics-chart-section-title">Outcome By Vaccine</h3>
            <p className="analytics-chart-section-desc">Compare on-time and no-return follow-up counts by vaccine. Hover a group for its evaluated sample size and rates; low-sample groups need cautious interpretation.</p>
            <div className="chart-grid chart-grid--1col">
              <div className="chart-card">
                <h3>On Time vs No Return</h3>
                <div className="chart-card-canvas">
                  {(compliance?.byVaccine || []).length ? (
                    <Bar
                      options={{
                        ...barOptions,
                        plugins: {
                          ...barOptions.plugins,
                          tooltip: {
                            ...barOptions.plugins.tooltip,
                            callbacks: {
                              afterBody: (items) => {
                                const row = compliance?.byVaccine?.[items[0]?.dataIndex];
                                return row
                                  ? [`Evaluated n=${row.evaluable}`, `On-time rate: ${fmtPct(row.onTimeRate)}`, `No-return rate: ${fmtPct(row.noReturnRate)}`, row.lowSample ? 'Small sample (n < 30)' : '']
                                  : '';
                              },
                            },
                          },
                        },
                      }}
                      data={{
                        labels: (compliance?.byVaccine || []).map((r) => `${r.key} (n=${r.evaluable}${r.lowSample ? '*' : ''})`),
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
                    <p className="chart-card-empty">No vaccine breakdown is available for this period. Choose a wider date range or check that vaccine follow-ups have due dates.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
          </>
          )}

          {subTab === 'summary' && breakdown === 'barangay' && (
          <>
          <section className="analytics-chart-section">
            <h3 className="analytics-chart-section-title">Compliance By Barangay</h3>
            <div className="report-table-container">
              <h3>Barangay breakdown</h3>
              <p className="analytics-chart-section-desc">
                Sorted by the lowest on-time rate first to surface possible follow-up gaps. Groups with fewer than 30 evaluated follow-ups are tagged as small samples and should not be treated as stable rankings.
              </p>
              <div className="report-table-wrapper analytics-table-scroll">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Barangay</th>
                      <th>Evaluated follow-ups</th>
                      <th>On time</th>
                      <th>Late</th>
                      <th>Lapsed</th>
                      <th>No return</th>
                      <th>On-time rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(compliance?.byBarangay || []).length ? (
                      visibleBarangays.map((row) => (
                        <tr key={row.key} className={lowestBarangays.has(row.key) ? 'analytics-row-low' : undefined}>
                          <td>
                            {row.key}
                            {row.lowSample && <span className="analytics-small-sample">small sample</span>}
                          </td>
                          <td>{fmtNum(row.evaluable)}</td>
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
                          No evaluated follow-ups have a barangay value in this period. Choose a wider date range or review the registration address data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {barangayRows.length > 8 && (
                <button type="button" className="btn-secondary" onClick={() => setShowAllBarangays((value) => !value)}>
                  {showAllBarangays ? 'Show lowest 8 barangays' : `Show all ${barangayRows.length} barangays`}
                </button>
              )}
            </div>
          </section>
          </>
          )}

          {subTab === 'summary' && (
          <details className="analytics-details">
            <summary>Funnel & days to return</summary>
            <section className="analytics-chart-section">
              <h3 className="analytics-chart-section-title">Days to Same-Vaccine Return</h3>
              <p className="analytics-chart-section-desc">Counts how many evaluated follow-ups returned within each day range after the due date. This helps distinguish quick returns from long delays; it excludes episodes that have not matured beyond the grace period.</p>
              <div className="chart-card-canvas">
                {(compliance.returnDayDistribution || []).some((bucket) => bucket.count > 0) ? (
                  <Bar
                    options={barOptions}
                    data={{
                      labels: compliance.returnDayDistribution.map((bucket) => bucket.label),
                      datasets: [{
                        label: 'Returned follow-ups',
                        data: compliance.returnDayDistribution.map((bucket) => bucket.count),
                        backgroundColor: '#1e7a46',
                        borderRadius: 4,
                      }],
                    }}
                  />
                ) : <p className="chart-card-empty">No same-vaccine returns have a complete interval in this period yet. Broaden the date range or check again after more due dates have passed.</p>}
              </div>
            </section>

            <section className="analytics-chart-section">
              <h3 className="analytics-chart-section-title">Follow-Up Funnel</h3>
              <p className="analytics-chart-section-desc">
                Each stage counts follow-ups (one vaccination record with a due date), not unique pets. Follow-ups within the grace period are pending and excluded from evaluated rates.
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
          </details>
          )}

          {subTab === 'service' && (
          <>
          <section className="analytics-chart-section">
            <h3 className="analytics-chart-section-title">Service Return Analysis</h3>
            <p className="analytics-chart-section-desc">
              This measures whether a pet had any later clinic service, not whether it returned for the same vaccine. One episode is one pet, service type, and service date; only episodes with a complete observation window count toward each return rate.
            </p>

            <div className="summary-row">
              <SummaryCard
                label="Returned Within 30 Days"
                value={fmtPct(returns?.summary?.returnRate30)}
                color="#1e7a46"
                sub={[{ label: 'Matured service episodes', value: fmtNum(returns?.summary?.eligible30) }]}
              />
              <SummaryCard
                label="Service episodes with no later service"
                value={fmtNum(returns?.summary?.neverReturned)}
                color="#c8102e"
              />
              <SummaryCard
                label="Follow-up adherence (scheduled/honoured)"
                value={fmtPct(returns?.followUp?.adherenceRate)}
                color="#c6a15b"
                sub={[
                  { label: 'Scheduled', value: fmtNum(returns?.followUp?.scheduled) },
                  { label: 'Honoured', value: fmtNum(returns?.followUp?.honoured) },
                  { label: 'Pending appointments', value: fmtNum(returns?.followUp?.pending) },
                ]}
              />
              <SummaryCard
                label="Owner Retention (90 Days)"
                value={fmtPct(returns?.retention?.retentionRate)}
                sub={[
                  { label: 'Owners with a complete 90-day window', value: fmtNum(returns?.retention?.ownersServed) },
                  { label: 'Returned', value: fmtNum(returns?.retention?.ownersReturned) },
                ]}
              />
            </div>

            <section className="analytics-chart-section">
              <h3 className="analytics-chart-section-title">Any-Service Cohort Retention</h3>
              <p className="analytics-chart-section-desc">
                Cohorts are grouped by month of first vaccine service. Each 30/60/90-day rate uses only episodes with the full observation window; use lower rates to identify cohorts that may need reminder or outreach review.
              </p>
              <div className="report-table-wrapper analytics-table-scroll">
                <table className="report-table">
                  <thead><tr><th>First vaccine service cohort</th><th>30-day return</th><th>n</th><th>60-day return</th><th>n</th><th>90-day return</th><th>n</th></tr></thead>
                  <tbody>
                    {(showAllCohorts ? compliance.cohortRetention || [] : (compliance.cohortRetention || []).slice(-8)).map((row) => (
                      <tr key={row.key}>
                        <td>{row.cohort}</td><td>{fmtPct(row.rate30)}</td><td>{fmtNum(row.eligible30)}</td>
                        <td>{fmtPct(row.rate60)}</td><td>{fmtNum(row.eligible60)}</td>
                        <td>{fmtPct(row.rate90)}</td><td>{fmtNum(row.eligible90)}</td>
                      </tr>
                    ))}
                    {!(compliance.cohortRetention || []).length && (
                      <tr><td className="report-table-empty" colSpan={7}>No completed vaccine-service cohorts yet. Cohorts appear after enough time has passed to observe the 30, 60, or 90-day return windows.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {(compliance.cohortRetention || []).length > 8 && (
                <button type="button" className="btn-secondary" onClick={() => setShowAllCohorts((value) => !value)}>
                  {showAllCohorts ? 'Show recent 8 cohorts' : `Show all ${compliance.cohortRetention.length} cohorts`}
                </button>
              )}
            </section>

            <div className="report-table-container">
              <h3>Return rate by service type</h3>
              <p className="analytics-chart-section-desc">Compare services by the share of matured episodes followed by another clinic service. The returned / eligible values show the numerator and denominator behind each percentage.</p>
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Service episodes (pet × service × date)</th>
                      <th>Underlying records</th>
                      <th>Pets</th>
                      <th>Returned ≤30d</th>
                      <th>Returned ≤60d</th>
                      <th>Returned ≤90d</th>
                      <th>No Later Service Recorded</th>
                      <th>Avg Days to Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(returns?.byService || []).length ? (
                      (showAllServices ? returns?.byService || [] : (returns?.byService || []).slice(0, 6)).map((row) => (
                        <tr key={row.serviceType}>
                          <td>{row.serviceType}</td>
                          <td>{fmtNum(row.episodes)}</td>
                          <td>{fmtNum(row.visits)}</td>
                          <td>{fmtNum(row.pets)}</td>
                          <td>
                            {fmtNum(row.returned30)} / {fmtNum(row.eligible30)} ({fmtPct(row.returnRate30)})
                          </td>
                          <td>
                            {fmtNum(row.returned60)} / {fmtNum(row.eligible60)} ({fmtPct(row.returnRate60)})
                          </td>
                          <td>
                            {fmtNum(row.returned90)} / {fmtNum(row.eligible90)} ({fmtPct(row.returnRate90)})
                          </td>
                          <td>{fmtNum(row.neverReturned)}</td>
                          <td>{fmtNum(row.avgDaysToReturn)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="report-table-empty" colSpan={9}>
                          No service episodes are available in this period. Choose a wider date range or check that clinic services have been recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {(returns?.byService || []).length > 6 && (
                <button type="button" className="btn-secondary" onClick={() => setShowAllServices((value) => !value)}>
                  {showAllServices ? 'Show top 6 services' : `Show all ${returns.byService.length} services`}
                </button>
              )}
            </div>
          </section>
          </>
          )}

          {canManageContacts && subTab === 'followups' && (
          <>
          <section className="analytics-chart-section">
            <div className="analytics-contact-progress" role="status">
              Contact progress: <strong>{fmtNum(contactProgress.contacted)} / {fmtNum(contactProgress.actionable)}</strong>
              {' '}follow-ups contacted ({contactedPct}%)
              <progress value={contactProgress.contacted} max={Math.max(contactProgress.actionable, 1)} aria-label="Follow-up contact progress" />
            </div>
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
              <div className="analytics-filter-row" role="group" aria-label="Follow-up list controls">
                <input aria-label="Search owners to contact" value={search} placeholder="Search pet or owner" onChange={(event) => { setPage(1); setSearch(event.target.value); }} />
                <select aria-label="Filter by vaccine" value={vaccineFilter} onChange={(event) => { setPage(1); setVaccineFilter(event.target.value); }}>
                  <option value="">All vaccines</option>
                  {(compliance.actionableFilters?.vaccines || []).map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <select aria-label="Filter by contact status" value={contactStatusFilter} onChange={(event) => { setPage(1); setContactStatusFilter(event.target.value); }}>
                  <option value="">All contact statuses</option>
                  {(compliance.actionableFilters?.contactStatuses || []).map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <select aria-label="Sort follow-ups" value={sortBy} onChange={(event) => { setPage(1); setSortBy(event.target.value); }}>
                  <option value="daysOverdue">Most overdue first</option><option value="dueDate">Due date</option><option value="owner">Owner name</option><option value="pet">Pet name</option>
                </select>
                <button type="button" className="btn-secondary" onClick={exportActionableCsv}>Export this page</button>
              </div>
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Pet</th>
                      <th>Owner</th>
                      <th>Barangay</th>
                      <th>Vaccine</th>
                      <th>Due</th>
                      <th>Last service</th>
                      <th>Outcome</th>
                      <th>Contact status / action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(compliance?.actionable || []).length ? (
                      (compliance?.actionable || []).map((row, index) => (
                        <tr key={`${row.pet_code}-${row.due_on}-${index}`}>
                          <td>
                            <strong>{row.pet_name || '—'}</strong>
                            <br /><small>{row.pet_code}</small>
                          </td>
                          <td>
                            {row.owner_name}
                            <br /><small>{row.contact_number || '—'}</small>
                          </td>
                          <td>{row.barangay || '—'}</td>
                          <td>{row.vaccine_name}</td>
                          <td>
                            {row.due_on}
                            {Number(row.days_overdue) > 0 && (
                              <span className="analytics-small-sample analytics-overdue-badge">
                                {fmtNum(row.days_overdue)} days overdue
                              </span>
                            )}
                          </td>
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
                          <td>
                            <span
                              className={`analytics-status-chip analytics-status-chip--${String(row.contact_status || 'not yet contacted')
                                .toLowerCase()
                                .replace(/\s+/g, '-')}`}
                            >
                              {row.contact_status || 'Not yet contacted'}
                            </span>
                            <button type="button" className="btn-secondary" onClick={() => {
                              setEditingContact(row);
                              setContactDraft({
                                contactStatus: row.contact_status,
                                reasons: row.reasons || [],
                                otherReason: row.other_reason || '',
                                contactedAt: row.contacted_at || localISODate(),
                              });
                            }}>Record contact</button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="report-table-empty" colSpan={8}>
                          <>
                            No follow-ups match these filters. {compliance.actionableTotal > 0 ? 'Clear the search or filters to see the available follow-ups.' : 'There are no actionable follow-ups for the selected period and grace setting.'}
                            {compliance.actionableTotal > 0 && (search || vaccineFilter || contactStatusFilter) && (
                              <button type="button" className="analytics-inline-link" onClick={() => {
                                setSearch('');
                                setVaccineFilter('');
                                setContactStatusFilter('');
                                setSortBy('daysOverdue');
                                setPage(1);
                              }}>Clear list filters</button>
                            )}
                          </>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {editingContact && contactDraft && (
                <div
                  className="followup-contact-backdrop"
                  role="presentation"
                  onClick={() => { setEditingContact(null); setContactDraft(null); }}
                >
                  <aside
                    className="followup-contact-editor"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="followup-contact-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                  <h3 id="followup-contact-title">Contact record — {editingContact.owner_name} ({editingContact.pet_name})</h3>
                  {editingContact.contact_recorded_by_name && (
                    <p>Last recorded by: {editingContact.contact_recorded_by_name}</p>
                  )}
                  <label>Contact status
                    <select value={contactDraft.contactStatus} onChange={(event) => setContactDraft({ ...contactDraft, contactStatus: event.target.value })}>
                      {(compliance.actionableFilters?.contactStatuses || []).map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                  {contactDraft.contactStatus !== 'Not yet contacted' && (
                    <label>Contact date
                      <input type="date" value={contactDraft.contactedAt} onChange={(event) => setContactDraft({ ...contactDraft, contactedAt: event.target.value })} />
                    </label>
                  )}
                  <fieldset>
                    <legend>Owner-stated reasons (select all that apply)</legend>
                    {RETENTION_REASONS.map(([key, label]) => (
                      <label key={key}>
                        <input type="checkbox" checked={contactDraft.reasons.includes(key)} onChange={(event) => {
                          const reasons = event.target.checked
                            ? [...contactDraft.reasons, key]
                            : contactDraft.reasons.filter((reason) => reason !== key);
                          setContactDraft({ ...contactDraft, reasons });
                        }} />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                  {contactDraft.reasons.includes('other') && (
                    <label>Other reason
                      <input value={contactDraft.otherReason} onChange={(event) => setContactDraft({ ...contactDraft, otherReason: event.target.value })} />
                    </label>
                  )}
                  <div className="analytics-filter-row">
                    <button type="button" className="btn-primary" onClick={saveContact}>Save contact</button>
                    <button type="button" className="btn-secondary" onClick={() => { setEditingContact(null); setContactDraft(null); }}>Cancel</button>
                  </div>
                  </aside>
                </div>
              )}
              <div className="analytics-filter-row" aria-label="Follow-up pagination">
                <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
                <span>Page {compliance.actionablePage || page} of {Math.max(1, compliance.actionablePages || 1)}</span>
                <button type="button" className="btn-secondary" disabled={page >= (compliance.actionablePages || 1)} onClick={() => setPage((current) => current + 1)}>Next</button>
              </div>
            </div>
          </section>
        </>
      )}
          </>
        )}
    </div>
  );
}
