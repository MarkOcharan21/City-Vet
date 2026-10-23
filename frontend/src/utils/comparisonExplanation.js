const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const COMPARISON_METRIC_DEFINITIONS = {
  registrations: { label: 'New Pet Registrations', kind: 'count' },
  doses: { label: 'Vaccine Doses Administered', kind: 'count' },
  pets: { label: 'Unique Pets Vaccinated', kind: 'count' },
  owners: { label: 'Unique Owners Served', kind: 'count' },
  consultations: { label: 'Consultations', kind: 'count' },
  qrIssued: { label: 'QR Codes Issued', kind: 'count' },
  revenue: { label: 'Revenue Collected', kind: 'money' },
  lostPets: { label: 'Lost Pets', kind: 'count', invert: true },
  newOwners: { label: 'New Pet Owners', kind: 'count' },
  evaluable: { label: 'Evaluated Vaccinations', kind: 'count' },
  onTime: { label: 'On-Time Returns', kind: 'count' },
  late: { label: 'Late Returns', kind: 'count', invert: true },
  lapsed: { label: 'Lapsed Follow-Ups', kind: 'count', invert: true },
  noReturn: { label: 'No-Return Records', kind: 'count', invert: true },
  onTimeRate: { label: 'On-Time Rate', kind: 'percent' },
  noReturnRate: { label: 'No-Return Rate', kind: 'percent', invert: true },
  anyServiceReturnedRate: { label: 'Any-Service Return Rate', kind: 'percent' },
};

const COUNT_KEYS = [
  'registrations',
  'doses',
  'pets',
  'owners',
  'consultations',
  'qrIssued',
  'revenue',
  'lostPets',
  'newOwners',
];

export const COMPARISON_SUMMARY_KEYS = [
  'registrations',
  'doses',
  'pets',
  'owners',
  'consultations',
  'qrIssued',
  'revenue',
  'lostPets',
  'newOwners',
];

export const COMPLIANCE_SUMMARY_KEYS = [
  'evaluable',
  'onTime',
  'late',
  'lapsed',
  'noReturn',
  'onTimeRate',
  'noReturnRate',
  'anyServiceReturnedRate',
];

export function roundTo(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

export function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function formatPercentValue(value, digits = 1) {
  return `${(Number(value) || 0).toFixed(digits)}%`;
}

export function formatMetricValue(value, kind = 'count') {
  if (kind === 'money') return formatMoney(value);
  if (kind === 'percent') return formatPercentValue(value);
  return formatNumber(value);
}

export function formatSignedValue(value, kind = 'count') {
  const amount = Number(value) || 0;
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  const absolute = Math.abs(amount);
  if (kind === 'money') return `${sign}${formatMoney(absolute)}`;
  if (kind === 'percent') return `${sign}${absolute.toFixed(1)} pp`;
  return `${sign}${formatNumber(absolute)}`;
}

export function formatPercentChange(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const amount = Number(value);
  if (amount === 0) return '0.0%';
  return `${amount > 0 ? '+' : ''}${amount.toFixed(1)}%`;
}

export function getMetricDefinition(key) {
  return COMPARISON_METRIC_DEFINITIONS[key] || { label: key, kind: 'count' };
}

function getDelta(current, baseline) {
  const currentValue = Number(current) || 0;
  const baselineValue = Number(baseline) || 0;
  const delta = roundTo(currentValue - baselineValue, 2);
  const pctChange =
    baselineValue >= 5 ? roundTo((delta / baselineValue) * 100, 1) : null;
  return { delta, pctChange };
}

export function buildComparisonRows({
  current = {},
  baseline = {},
  deltas = {},
  keys = COMPARISON_SUMMARY_KEYS,
}) {
  return keys.map((key) => {
    const definition = getMetricDefinition(key);
    const currentValue = Number(current?.[key]) || 0;
    const baselineValue = Number(baseline?.[key]) || 0;
    const change = deltas?.[key] || getDelta(currentValue, baselineValue);
    const delta = change.delta == null ? roundTo(currentValue - baselineValue, 2) : Number(change.delta);
    const pctChange = change.pctChange == null ? null : Number(change.pctChange);
    const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    const better = delta === 0 ? null : definition.invert ? delta < 0 : delta > 0;
    return {
      key,
      label: definition.label,
      shortLabel: definition.label.replace('Vaccine ', '').replace(' Collected', ''),
      kind: definition.kind,
      invert: Boolean(definition.invert),
      current: currentValue,
      baseline: baselineValue,
      delta,
      pctChange,
      direction,
      better,
    };
  });
}

export function getLargestPeriodKeys(series, metricKey) {
  let increaseKey = null;
  let decreaseKey = null;
  let largestIncrease = 0;
  let largestDecrease = 0;
  for (const row of series || []) {
    const delta = Number(row?.deltas?.[metricKey]?.delta);
    if (!Number.isFinite(delta) || delta === 0) continue;
    if (delta > largestIncrease) {
      largestIncrease = delta;
      increaseKey = row.key;
    }
    if (delta < largestDecrease) {
      largestDecrease = delta;
      decreaseKey = row.key;
    }
  }
  return { increaseKey, decreaseKey };
}

export function buildPeriodDifferenceNote({
  row,
  metricKey,
  largestIncreaseKey,
  largestDecreaseKey,
}) {
  if (!row) return '';
  const definition = getMetricDefinition(metricKey);
  const change = row?.deltas?.[metricKey] || {};
  const delta = Number(change.delta) || 0;
  if (!delta) return 'No change.';

  const percentLabel = formatPercentChange(change.pctChange);
  const direction = delta > 0 ? 'Up' : 'Down';
  const amountText =
    definition.kind === 'percent'
      ? `${Math.abs(delta).toFixed(1)} pp`
      : formatMetricValue(Math.abs(delta), definition.kind);
  let note = `${direction} ${amountText}`;
  note += percentLabel ? ` (${percentLabel})` : ' (baseline under 5)';
  if (row.key === largestIncreaseKey) note += ' · largest increase';
  if (row.key === largestDecreaseKey) note += ' · largest decline';
  return note;
}

function describeRowChange(row) {
  const direction = row.delta > 0 ? 'rose' : 'fell';
  const amount =
    row.kind === 'percent'
      ? `${Math.abs(row.delta).toFixed(1)} percentage points`
      : formatMetricValue(Math.abs(row.delta), row.kind);
  const percentLabel = formatPercentChange(row.pctChange);
  const changeText = percentLabel ? `${amount} (${percentLabel})` : amount;
  const currentText = formatMetricValue(row.current, row.kind);
  const baselineText = formatMetricValue(row.baseline, row.kind);
  const outcome =
    row.better === true ? 'an improvement' : row.better === false ? 'a decline' : 'little practical change';
  return `${row.label} ${direction} by ${changeText}, from ${baselineText} to ${currentText} — ${outcome}.`;
}

export function buildComparisonExplanation({
  rows = [],
  series = [],
  primaryKey = 'doses',
  currentLabel = 'the current period',
  baselineLabel = 'the baseline period',
  currentPartial = false,
  baselinePartial = false,
  maxSentences = 4,
}) {
  if (!rows.length) {
    return ['No comparison data is available for these periods.'];
  }

  const sentences = [];
  const meaningful = rows
    .filter((row) => row.delta !== 0 && row.pctChange != null)
    .sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));

  if (meaningful.length) {
    meaningful.slice(0, 2).forEach((row) => sentences.push(describeRowChange(row)));
  } else {
    const changes = rows.filter((row) => row.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    if (changes.length) {
      changes.slice(0, 2).forEach((row) => sentences.push(describeRowChange(row)));
    } else {
      sentences.push(`Activity was broadly stable between ${baselineLabel} and ${currentLabel}.`);
    }
  }

  if (series.length) {
    const metricDefinition = getMetricDefinition(primaryKey);
    let biggestIncrease = null;
    let biggestDecrease = null;
    for (const row of series) {
      const delta = Number(row?.deltas?.[primaryKey]?.delta);
      if (!Number.isFinite(delta) || delta === 0) continue;
      if (delta > 0 && (!biggestIncrease || delta > biggestIncrease.delta)) {
        biggestIncrease = { label: row.label, delta };
      }
      if (delta < 0 && (!biggestDecrease || delta < biggestDecrease.delta)) {
        biggestDecrease = { label: row.label, delta };
      }
    }
    const drivers = [];
    if (biggestIncrease) {
      drivers.push(
        `${biggestIncrease.label} added ${formatMetricValue(biggestIncrease.delta, metricDefinition.kind)}`
      );
    }
    if (biggestDecrease) {
      drivers.push(
        `${biggestDecrease.label} dropped ${formatMetricValue(Math.abs(biggestDecrease.delta), metricDefinition.kind)}`
      );
    }
    if (drivers.length) {
      sentences.push(`Biggest period-level movement: ${drivers.join('; ')}.`);
    }
  }

  if (rows.some((row) => row.baseline > 0 && row.baseline < 5)) {
    sentences.push('Percentage change is hidden where the baseline has fewer than five records.');
  }
  if (currentPartial || baselinePartial) {
    sentences.push('One of the periods is still in progress, so treat the comparison as directional.');
  }

  return sentences.slice(0, maxSentences);
}

export function getTrendMonthLabels() {
  return MONTHS.slice();
}
