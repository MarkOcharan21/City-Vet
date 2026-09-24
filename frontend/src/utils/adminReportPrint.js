import {
  getPrintFooter,
  getPrintHeader,
  getSectionHeader,
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

export function buildAdminReportBody(dashboard, {
  title = 'Analytics Report',
  period = 'All Time',
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

  const d = dashboard?.summary || {};

  return `
    ${getPrintHeader('', dateStr)}
    <h2 class="report-title report-title--center">${esc(title)} - ${esc(period)}</h2>

    <div class="summary">
      <div class="card"><strong>Registered Pets</strong>${esc(d.totalPets)}</div>
      <div class="card"><strong>Vaccinated Pets</strong>${esc(d.vaccinatedPets)}</div>
      <div class="card"><strong>Lost Pets</strong>${esc(d.lostPets)}</div>
      <div class="card"><strong>Generated QR</strong>${esc(d.totalQr)}</div>
    </div>

    ${tableBlock(1, 'PETS BY SPECIES', ['Species', 'Total'],
      (dashboard.species || []).map((x) => [x.species, x.total]),
      'No species data found.')}

    ${tableBlock(2, 'QR STATISTICS', ['Status', 'Total'],
      (dashboard.qrStats || []).map((x) => [x.status, x.total]),
      'No QR data found.')}

    ${tableBlock(3, 'PETS BY BARANGAY', ['Barangay', 'Total'],
      (dashboard.barangays || []).map((x) => [x.barangay, x.total]),
      'No barangay data found.')}

    ${tableBlock(4, 'REGISTRATION STATUS', ['Status', 'Total'],
      (dashboard.registrationStatus || []).map((x) => [x.status, x.total]),
      'No registration status data found.')}

    ${tableBlock(5, 'MONTHLY PET REGISTRATIONS', ['Month', 'Total'],
      (dashboard.registrations || []).map((x) => [x.month, x.total]),
      'No registration trend data found.')}

    ${tableBlock(6, 'PETS BY SEX', ['Sex', 'Total'],
      (dashboard.petsBySex || []).map((x) => [x.sex || 'Unknown', x.total]),
      'No sex distribution data found.')}

    ${tableBlock(7, 'VACCINATIONS PER MONTH', ['Month', 'Total'],
      (dashboard.vaccinations || []).map((x) => [x.month, x.total]),
      'No vaccination trend data found.')}

    ${tableBlock(8, 'VACCINATION COMPLIANCE', ['Status', 'Total'],
      (dashboard.vaccinationStatus || []).map((x) => [x.status, x.total]),
      'No vaccination compliance data found.')}

    ${getPrintFooter()}
  `;
}

export function printAdminReport(dashboard, options) {
  const reportTitle = options?.title || 'Analytics Report';
  const period = options?.period || 'All Time';
  return openPrintDocument({
    title: `${reportTitle} - ${period}`,
    bodyHtml: buildAdminReportBody(dashboard, { title: reportTitle, period }),
  });
}