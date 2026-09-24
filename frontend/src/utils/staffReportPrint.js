import {
  getPrintHeader,
  getPrintFooter,
  getEmptyState,
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

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return esc(value);
  return esc(date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }));
}

function formatTime(value) {
  if (!value) return '—';
  const [h, m] = String(value).split(':').map(Number);
  if (Number.isNaN(h)) return esc(value);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m ?? 0).padStart(2, '0')} ${suffix}`;
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';
  return `P ${Number(value).toFixed(2)}`;
}

function formatCell(value, format = 'text') {
  if (value === null || value === undefined || value === '') return '—';
  if (format === 'date') return formatDate(value);
  if (format === 'time') return formatTime(value);
  if (format === 'money') return formatMoney(value);
  return esc(value);
}

function periodLabel(from, to) {
  if (from && to) return `${formatDate(from)} to ${formatDate(to)}`;
  if (from) return `From ${formatDate(from)} onwards`;
  if (to) return `Up to ${formatDate(to)}`;
  return 'All records';
}

export function buildStaffReportBody(report) {
  const { label, reportTitle, from, to, generatedBy, generatedAt, summaryCards, table } = report;

  const title = reportTitle || label || 'Staff Report';
  const titleText = `${title} - ${periodLabel(from, to)}`;

  const cards = (summaryCards || [])
    .map(
      (card) =>
        `<div class="card"><strong>${esc(card.label)}</strong>${esc(card.value)}</div>`
    )
    .join('');

  const headerCells = (table?.columns || [])
    .map((col) => `<th>${esc(col.label)}</th>`)
    .join('');

  const bodyRows = (table?.rows || [])
    .map(
      (row) =>
        `<tr>${(table.columns || [])
          .map((col) => `<td>${formatCell(row[col.key], col.format)}</td>`)
          .join('')}</tr>`
    )
    .join('');

  const rowsHtml =
    (table?.rows || []).length === 0
      ? getEmptyState('No records found for the selected period.')
      : bodyRows;

  return `
    ${getPrintHeader('', new Date(generatedAt).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }))}
    <h2 class="report-title report-title--center">${esc(titleText)}</h2>

    ${
      cards
        ? `<div class="summary">${cards}</div>`
        : ''
    }

    <h2 class="section-title">Detailed List</h2>
    <table class="staff-report-table">
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    ${getPrintFooter('Prepared By')}
  `;
}

export function printStaffReport(report) {
  return openPrintDocument({
    title: `${report?.reportTitle || report?.label || 'Staff Report'} - ${periodLabel(report?.from, report?.to)}`,
    bodyHtml: buildStaffReportBody(report),
  });
}