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

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

function pct(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : '—';
}

function peso(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `₱${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';
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

/**
 * Vaccine follow-up compliance report.
 *
 * @param {object} data the /analytics/vaccine-compliance payload
 * @param {{title?: string, period?: string, generatedAt?: Date}} options
 */
export function buildComplianceReportBody(data, {
  title = 'Vaccine Follow-Up Compliance Report',
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

  const summary = data?.summary || {};
  const graceDays = data?.graceDays ?? 30;

  return `
    ${getPrintHeader('', dateStr)}
    <h2 class="report-title report-title--center">${esc(title)} - ${esc(period)}</h2>

    <div class="notes">
      A vaccine episode is one dose recorded in the vaccination log. Each dose
      schedules the next one, so an episode counts as followed up when the owner
      brought the pet back for the next dose of the same vaccine. A return counts
      as <strong>late</strong> when it happens within ${esc(graceDays)} day(s) of
      the due date, and as <strong>lapsed</strong> when it happens after that.
      Follow-ups that are not due yet are reported as <strong>pending</strong>.
    </div>

    <div class="summary">
      <div class="card"><strong>Episodes</strong>${num(summary.episodes)}</div>
      <div class="card"><strong>Due & Evaluable</strong>${num(summary.evaluable)}</div>
      <div class="card"><strong>On Time</strong>${num(summary.onTime)} (${pct(summary.onTimeRate)})</div>
      <div class="card"><strong>Late</strong>${num(summary.late)} (${pct(summary.lateRate)})</div>
      <div class="card"><strong>Lapsed</strong>${num(summary.lapsed)} (${pct(summary.lapsedRate)})</div>
      <div class="card"><strong>No Return</strong>${num(summary.noReturn)} (${pct(summary.noReturnRate)})</div>
      <div class="card"><strong>Pending</strong>${num(summary.pending)}</div>
      <div class="card"><strong>Due in Next 30 Days</strong>${num(summary.pendingNext30)}</div>
      <div class="card"><strong>Distinct Pets</strong>${num(summary.distinctPets)}</div>
      <div class="card"><strong>Distinct Owners</strong>${num(summary.distinctOwners)}</div>
      <div class="card"><strong>Pets That Never Returned</strong>${num(summary.petsNeverReturning)}</div>
      <div class="card"><strong>Returned for Any Service</strong>${pct(summary.anyServiceReturnedRate)}</div>
      <div class="card"><strong>Median Days to Return</strong>${
        summary.medianDaysToReturn === null || summary.medianDaysToReturn === undefined
          ? '—'
          : num(summary.medianDaysToReturn)
      }</div>
      <div class="card"><strong>Average Days Late</strong>${
        summary.avgDaysLate === null || summary.avgDaysLate === undefined
          ? '—'
          : num(summary.avgDaysLate)
      }</div>
    </div>

    ${tableBlock(
      1,
      'FOLLOW-UP OUTCOMES',
      ['Outcome', 'Episodes', 'Share'],
      (data?.buckets || []).map((b) => [b.status, num(b.total), pct(b.pct)]),
      'No vaccination episodes found for this period.'
    )}

    ${tableBlock(
      2,
      'MONTHLY COMPLIANCE TREND',
      ['Month', 'Episodes', 'Due & Evaluable', 'On Time', 'On-Time Rate'],
      (data?.trend || []).map((t) => [t.period, num(t.episodes), num(t.evaluable), num(t.onTime), pct(t.onTimeRate)]),
      'No monthly trend data available.'
    )}

    ${tableBlock(
      3,
      'COMPLIANCE BY BARANGAY',
      ['Barangay', 'Episodes', 'On Time', 'Late', 'Lapsed', 'No Return', 'On-Time Rate'],
      (data?.byBarangay || []).map((r) => [
        r.key,
        num(r.episodes),
        num(r.onTime),
        num(r.late),
        num(r.lapsed),
        num(r.noReturn),
        pct(r.onTimeRate),
      ]),
      'No barangay breakdown available.'
    )}

    ${tableBlock(
      4,
      'COMPLIANCE BY VACCINE',
      ['Vaccine', 'Episodes', 'On Time', 'Late', 'Lapsed', 'No Return', 'On-Time Rate'],
      (data?.byVaccine || []).map((r) => [
        r.key,
        num(r.episodes),
        num(r.onTime),
        num(r.late),
        num(r.lapsed),
        num(r.noReturn),
        pct(r.onTimeRate),
      ]),
      'No vaccine breakdown available.'
    )}

    ${tableBlock(
      5,
      'COMPLIANCE BY SPECIES',
      ['Species', 'Episodes', 'On Time', 'Late', 'Lapsed', 'No Return', 'On-Time Rate'],
      (data?.bySpecies || []).map((r) => [
        r.key,
        num(r.episodes),
        num(r.onTime),
        num(r.late),
        num(r.lapsed),
        num(r.noReturn),
        pct(r.onTimeRate),
      ]),
      'No species breakdown available.'
    )}

    ${tableBlock(
      6,
      'ACTIONABLE FOLLOW-UPS (OWNERS TO CONTACT)',
      ['Pet', 'Owner', 'Contact', 'Barangay', 'Vaccine', 'Dose', 'Administered', 'Due', 'Days Overdue', 'Status'],
      (data?.actionable || []).map((r) => [
        `${r.pet_code || ''} ${r.pet_name || ''}`.trim(),
        r.owner_name,
        r.contact_number,
        r.barangay,
        r.vaccine_name,
        r.dose_label,
        r.administered_on,
        r.due_on,
        num(r.days_overdue),
        r.outcome,
      ]),
      'No owners are overdue — every due follow-up has been met.'
    )}

    ${getPrintFooter()}
  `;
}

export function printComplianceReport(data, options) {
  const reportTitle = options?.title || 'Vaccine Follow-Up Compliance Report';
  const period = options?.period || 'All Time';
  return openPrintDocument({
    title: `${reportTitle} - ${period}`,
    bodyHtml: buildComplianceReportBody(data, { title: reportTitle, period }),
  });
}
