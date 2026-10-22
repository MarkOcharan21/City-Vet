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

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

function delta(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toLocaleString('en-US')}`;
}

function peso(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `₱${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';
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
      <div class="card"><strong>Verified Pet Registrations</strong>${esc(d.totalPets)}</div>
      <div class="card"><strong>Unique Vaccinated Pets</strong>${esc(d.vaccinatedPets)}</div>
      <div class="card"><strong>Lost Pets</strong>${esc(d.lostPets)}</div>
      <div class="card"><strong>Generated QR</strong>${esc(d.totalQr)}</div>
    </div>
    <div class="notes">
      Definitions: verified pet registrations are verified pet records grouped by registration date (encoded date fallback);
      unique vaccinated pets are distinct pets with at least one vaccine record in the selected service-date range;
      revenue is paid ledger revenue only. The date range is ${esc(period)}.
    </div>
    ${dashboard.dataQuality?.syntheticIncluded && (Number(dashboard.dataQuality?.syntheticSeedPets) + Number(dashboard.dataQuality?.syntheticSeedVaccinations) + Number(dashboard.dataQuality?.syntheticSeedPayments)) > 0
      ? `<div class="notes"><strong>Data notice:</strong> this report includes synthetic 2025 seed data (${num(dashboard.dataQuality?.syntheticSeedPets)} pets, ${num(dashboard.dataQuality?.syntheticSeedVaccinations)} vaccine records, ${num(dashboard.dataQuality?.syntheticSeedPayments)} payments). Do not interpret these as real clinic activity.</div>`
      : ''}
    ${tableBlock(1, 'KEY FINDINGS', ['Finding'], [
      [`${num(d.totalPets)} verified pet registrations and ${num(d.vaccinatedPets)} unique vaccinated pets are in this report period.`],
      ...((dashboard.barangays || []).length ? [[`${dashboard.barangays[0].barangay} has the highest number of verified pet registrations (${num(dashboard.barangays[0].total)}).`]] : []),
      ...((Number(dashboard.dataQuality?.lateEncodedRegistrations) + Number(dashboard.dataQuality?.lateEncodedVaccinations)) > 0
        ? [['Some records were entered after their service/registration date; interpret encoding trends with caution.']]
        : []),
    ], 'No findings available.')}
    ${tableBlock(2, 'RECOMMENDATIONS', ['Recommended action'], [
      ['Complete owner barangay and vaccine due-date data to improve follow-up analysis.'],
      ['Compare records by service/registration date rather than encoding date where available.'],
    ], 'No recommendations available.')}

    ${tableBlock(3, 'PETS BY SPECIES', ['Species', 'Total'],
      (dashboard.species || []).map((x) => [x.species, x.total]),
      'No species data found.')}

    ${tableBlock(4, 'QR CODES ISSUED', ['Status', 'Total'],
      (dashboard.qrStats || []).map((x) => [x.status, x.total]),
      'No QR data found.')}

    ${tableBlock(5, 'PETS BY BARANGAY', ['Barangay', 'Total'],
      (dashboard.barangays || []).map((x) => [x.barangay, x.total]),
      'No barangay data found.')}

    ${tableBlock(6, 'PET VERIFICATION STATUS', ['Status', 'Total'],
      (dashboard.registrationStatus || []).map((x) => [x.status, x.total]),
      'No registration status data found.')}

    ${tableBlock(7, 'MONTHLY VERIFIED PET REGISTRATIONS', ['Month', 'Total'],
      (dashboard.registrations || []).map((x) => [x.month, x.total]),
      'No registration trend data found.')}

    ${tableBlock(8, 'PETS BY SEX', ['Sex', 'Total'],
      (dashboard.petsBySex || []).map((x) => [x.sex || 'Unknown', x.total]),
      'No sex distribution data found.')}

    ${tableBlock(9, 'VACCINE DOSES PER MONTH', ['Month', 'Total'],
      (dashboard.vaccinations || []).map((x) => [x.month, x.total]),
      'No vaccination trend data found.')}

    ${tableBlock(10, 'LATEST VACCINE DUE STATUS (VERIFIED PETS)', ['Status', 'Total'],
      (dashboard.vaccinationStatus || []).map((x) => [x.status, x.total]),
      'No vaccination compliance data found.')}

    ${tableBlock(11, 'DATA QUALITY', ['Quality check', 'Count'], [
      ['Verified pets without barangay', num(dashboard.dataQuality?.missingBarangay)],
      ['Vaccine records without due date', num(dashboard.dataQuality?.missingDueDate)],
      ['Late-encoded registrations', num(dashboard.dataQuality?.lateEncodedRegistrations)],
      ['Late-encoded vaccinations', num(dashboard.dataQuality?.lateEncodedVaccinations)],
    ], 'No data quality checks available.')}

    ${getPrintBarChart(12, 'MONTHLY REGISTRATION TREND', dashboard.registrations || [], 'month', 'total', '#7A0C1E')}
    ${getPrintBarChart(13, 'MONTHLY VACCINE DOSES', dashboard.vaccinations || [], 'month', 'total', '#1E7A46')}
    ${getPrintBarChart(14, 'MONTHLY PAID REVENUE', dashboard.paymentRevenue || [], 'month', 'total', '#C6A15B')}

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