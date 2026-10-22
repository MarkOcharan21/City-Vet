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
      <div class="card"><strong>Excluded episodes (moved/lost/deceased)</strong>${num(summary.excludedEpisodes)}</div>
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
    ${Number(data?.syntheticData?.vaccineEpisodes) > 0
      ? `<div class="notes"><strong>Data notice:</strong> ${num(data.syntheticData.vaccineEpisodes)} vaccine episodes in this report are synthetic 2025 seed records, not real clinic activity.</div>`
      : ''}

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
      'KEY FINDINGS',
      ['Finding'],
      (data?.analysis?.findings || []).map((finding) => [finding]),
      'No evaluated outcomes available.'
    )}
    ${tableBlock(
      7,
      'RECOMMENDATIONS',
      ['Recommended action'],
      (data?.analysis?.recommendations || []).map((recommendation) => [recommendation]),
      'No recommendations available.'
    )}
    <div class="notes">${esc(data?.analysis?.interpretation || '')}</div>
    ${tableBlock(
      8,
      'RETENTION REASONS RECORDED FROM OWNERS',
      ['Owner-stated reason', 'Count'],
      (data?.retentionReasons || []).map((reason) => [reason.label, num(reason.count)]),
      'No owner-stated retention reasons have been recorded.'
    )}
    ${tableBlock(
      9,
      'FACTORS AFFECTING RETURN (ASSOCIATIONS ONLY)',
      ['Factor', 'Group', 'Evaluated n', 'Returned', 'Return Rate', 'On-Time Rate'],
      (data?.factors || []).map((factor) => [
        factor.factor, `${factor.group}${factor.lowSample ? ' (small n)' : ''}`,
        num(factor.sampleSize), num(factor.returned), pct(factor.returnedRate), pct(factor.onTimeRate),
      ]),
      'No segment data available.'
    )}
    ${tableBlock(
      10,
      'ANY-SERVICE COHORT RETENTION',
      ['Cohort', '30-day Rate (n)', '60-day Rate (n)', '90-day Rate (n)'],
      (data?.cohortRetention || []).map((row) => [
        row.cohort,
        `${pct(row.rate30)} (${num(row.eligible30)})`,
        `${pct(row.rate60)} (${num(row.eligible60)})`,
        `${pct(row.rate90)} (${num(row.eligible90)})`,
      ]),
      'No cohort data available.'
    )}
    ${tableBlock(
      11,
      'DAYS TO SAME-VACCINE RETURN',
      ['Days', 'Episodes'],
      (data?.returnDayDistribution || []).map((row) => [row.label, num(row.count)]),
      'No return interval data available.'
    )}
    ${tableBlock(
      12,
      'SERVICE RETURN ANALYSIS (ANY LATER SERVICE)',
      ['Service type', 'Service episodes', 'Underlying records', 'Matured 30d', 'Returned 30d', '30d Rate', 'Matured 60d', 'Returned 60d', '60d Rate', 'Matured 90d', 'Returned 90d', '90d Rate'],
      (data?.serviceReturn?.byService || []).map((row) => [
        row.serviceType, num(row.episodes), num(row.visits),
        num(row.eligible30), num(row.returned30), pct(row.returnRate30),
        num(row.eligible60), num(row.returned60), pct(row.returnRate60),
        num(row.eligible90), num(row.returned90), pct(row.returnRate90),
      ]),
      'No service-return data available.'
    )}
    ${tableBlock(
      13,
      'OWNER RETENTION (90-DAY MATURE COHORT)',
      ['Owners with a complete 90-day window', 'Returned within 90 days', 'Retention rate'],
      [[
        num(data?.serviceReturn?.retention?.ownersServed),
        num(data?.serviceReturn?.retention?.ownersReturned),
        pct(data?.serviceReturn?.retention?.retentionRate),
      ]],
      'No owner retention data available.'
    )}

    ${tableBlock(
      14,
      'ACTIONABLE FOLLOW-UPS (OWNERS TO CONTACT)',
      ['Pet', 'Owner', 'Contact', 'Barangay', 'Vaccine', 'Dose', 'Administered', 'Due', 'Days Overdue', 'Status', 'Contact Status', 'Reasons', 'Other Reason', 'Contact Date', 'Recorded By'],
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
        r.contact_status,
        (r.reasons || []).join('; '),
        r.other_reason,
        r.contacted_at,
        r.contact_recorded_by_name || r.contact_recorded_by,
      ]),
      'No owners are overdue — every due follow-up has been met.'
    )}

    ${getPrintBarChart(15, 'FOLLOW-UP OUTCOME COUNTS', data?.buckets || [], 'status', 'total', '#C8102E')}
    ${getPrintBarChart(16, 'MONTHLY ON-TIME RATE (%)', data?.trend || [], 'period', 'onTimeRate', '#1E7A46')}
    ${getPrintBarChart(17, 'OWNER-STATED RETENTION REASONS', data?.retentionReasons || [], 'label', 'count', '#C6A15B')}

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
