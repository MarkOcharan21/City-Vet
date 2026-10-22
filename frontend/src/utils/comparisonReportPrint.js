import {
  getPrintFooter,
  getPrintHeader,
  getSectionHeader,
  getPrintBarChart,
  openPrintDocument,
} from './printReport';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

function pct(value) {
  if (value === null || value === undefined) return 'N/A';
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : '—';
}

function delta(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toLocaleString('en-US')}`;
}

function peso(value) {
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

function rowsFor(items, emptyMessage, columns = 2) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<tr><td colspan="${columns}"><em>${esc(emptyMessage)}</em></td></tr>`;
  }
  return items
    .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`)
    .join('');
}

function tableBlock(sectionNumber, title, columns, items, emptyMessage) {
  const headerCells = columns.map((col) => `<th>${esc(col)}</th>`).join('');
  return `
    ${getSectionHeader(sectionNumber, title)}
    <table class="staff-report-table">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${rowsFor(items, emptyMessage, columns.length)}</tbody>
    </table>
  `;
}

const GRANULARITY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const COMPARE_LABELS = {
  previous: 'Previous Period',
  previousYear: 'Same Period Last Year',
};

const METRIC_LABELS = {
  registrations: 'Registrations',
  doses: 'Doses',
  pets: 'Unique Pets',
  owners: 'Unique Owners',
  consultations: 'Consultations',
  qrIssued: 'QR Issued',
  revenue: 'Revenue',
  newOwners: 'New Owners',
};

/**
 * Period comparison report (daily / weekly / monthly / yearly).
 *
 * @param {object} data the /analytics/vaccination-trends payload
 * @param {{title?: string, period?: string, generatedAt?: Date}} options
 */
export function buildComparisonReportBody(data, {
  title = 'Period Comparison Report',
  period = '',
  generatedAt = new Date(),
} = {}) {
  const dateStr = new Date(generatedAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const totals = data?.totals || {};
  const current = totals.current || {};
  const baseline = totals.baseline || {};
  const granularity = GRANULARITY_LABELS[data?.granularity] || data?.granularity || '';
  const compareLabel = COMPARE_LABELS[data?.compare] || data?.compare || '';
  const currentWindow = fmtRange(data?.current) || data?.current?.label || period;
  const baselineWindow = fmtRange(data?.baseline) || data?.baseline?.label || '';

  return `
    ${getPrintHeader('', dateStr)}
    <h2 class="report-title report-title--center">${esc(title)}</h2>
    <p class="report-meta report-meta--center">
      ${esc(granularity)} comparison · baseline: ${esc(compareLabel)}<br />
      ${esc(currentWindow)}${baselineWindow ? ` compared with ${esc(baselineWindow)}` : ''}
      ${data?.current?.partial ? '<br />Current period is partial (through the reporting anchor date).' : ''}
      ${data?.baseline?.partial ? '<br />Baseline period is also partial.' : ''}
    </p>
    <div class="notes">
      Generated ${esc(dateStr)}. Doses are vaccination records; unique pets and owners are distinct IDs within the reporting window.
      Revenue is paid-ledger revenue. Percent changes are omitted when the baseline is zero or fewer than five records.
    </div>
    ${tableBlock(
      1,
      'COMPARISON SUMMARY',
      ['Metric', 'Current Period', 'Baseline', 'Change', '% Change'],
      [
        ['New pet registrations', num(current.registrations), num(baseline.registrations), delta(totals.registrations?.delta), pct(totals.registrations?.pctChange)],
        ['Doses administered', num(current.doses), num(baseline.doses), delta(totals.doses?.delta), pct(totals.doses?.pctChange)],
        ['Unique pets vaccinated', num(current.pets), num(baseline.pets), delta(totals.pets?.delta), pct(totals.pets?.pctChange)],
        ['Unique owners served', num(current.owners), num(baseline.owners), delta(totals.owners?.delta), pct(totals.owners?.pctChange)],
        ['Consultations', num(current.consultations), num(baseline.consultations), delta(totals.consultations?.delta), pct(totals.consultations?.pctChange)],
        ['QR codes issued', num(current.qrIssued), num(baseline.qrIssued), delta(totals.qrIssued?.delta), pct(totals.qrIssued?.pctChange)],
        ['Revenue collected', peso(current.revenue), peso(baseline.revenue), peso(totals.revenue?.delta), pct(totals.revenue?.pctChange)],
        ['New pet owners', num(current.newOwners), num(baseline.newOwners), delta(totals.newOwners?.delta), pct(totals.newOwners?.pctChange)],
        ['Follow-ups on time', num(current.onTime), num(baseline.onTime), '—', '—'],
        ['On-time rate', pct(current.onTimeRate), pct(baseline.onTimeRate), delta(totals.onTimeRate?.delta), pct(totals.onTimeRate?.pctChange)],
      ],
      'No comparison data available.'
    )}

    ${tableBlock(
      2,
      `PERIOD-BY-PERIOD COMPARISON (${(METRIC_LABELS[data?.primaryMetric] || 'Doses').toUpperCase()})`,
      ['Period', 'Baseline Period', `${METRIC_LABELS[data?.primaryMetric] || 'Doses'} (Current)`, `${METRIC_LABELS[data?.primaryMetric] || 'Doses'} (Baseline)`, 'Change', '% Change', 'On-Time Rate (Current)', 'On-Time Rate (Baseline)'],
      (data?.series || []).map((s) => [
        s.label,
        s.baselineLabel,
        num(s.current?.[data?.primaryMetric || 'doses'] ?? 0),
        s.baseline ? num(s.baseline[data?.primaryMetric || 'doses']) : 'No data',
        delta(s.deltas?.[data?.primaryMetric || 'doses']?.delta ?? s.delta),
        pct(s.deltas?.[data?.primaryMetric || 'doses']?.pctChange ?? s.pctChange),
        s.current ? pct(s.current.onTimeRate) : '—',
        s.baseline ? pct(s.baseline.onTimeRate) : '—',
      ]),
      'No comparison rows available.'
    )}

    ${tableBlock(
      3,
      'YEAR-OVER-YEAR SUMMARY',
      ['Year', 'Registrations', 'Previous year registrations', 'Vaccinations', 'Previous year vaccinations', 'Unique Pets', 'Previous year unique pets', 'Unique Owners', 'Previous year unique owners', 'Consultations', 'Previous year consultations', 'QR Issued', 'Previous year QR issued', 'Revenue', 'Previous year revenue', 'New Owners', 'Previous year new owners'],
      (data?.yearly || []).map((y) => {
        const previous = (data?.yearly || []).find((item) => Number(item.year) === Number(y.year) - 1);
        return [
          y.year,
          num(y.registrations), num(previous?.registrations),
          num(y.doses), num(previous?.doses),
          num(y.pets), num(previous?.pets),
          num(y.owners), num(previous?.owners),
          num(y.consultations), num(previous?.consultations),
          num(y.qrIssued), num(previous?.qrIssued),
          peso(y.revenue), peso(previous?.revenue),
          num(y.newOwners), num(previous?.newOwners),
        ];
      }),
      'No yearly data available.'
    )}
    ${getPrintBarChart(4, `CURRENT ${granularity.toUpperCase()} SERIES`, (data?.series || []).map((row) => ({
      period: row.label,
      value: Number(row.current?.[data?.primaryMetric || 'doses']) || 0,
    })), 'period', 'value', '#C8102E')}
    ${getPrintBarChart(5, `BASELINE ${granularity.toUpperCase()} SERIES`, (data?.series || []).map((row) => ({
      period: row.baselineLabel,
      value: Number(row.baseline?.[data?.primaryMetric || 'doses']) || 0,
    })), 'period', 'value', '#C6A15B')}

    ${getPrintFooter()}
  `;
}

export function printComparisonReport(data, options) {
  const reportTitle = options?.title || 'Period Comparison Report';
  const period = options?.period || '';
  return openPrintDocument({
    title: period ? `${reportTitle} - ${period}` : reportTitle,
    bodyHtml: buildComparisonReportBody(data, { title: reportTitle, period }),
  });
}
