const MS_PER_DAY = 86400000;

export const ANALYTICS_GRANULARITIES = ['daily', 'weekly', 'monthly', 'yearly'];

export const ANALYTICS_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'selectedYear', label: 'Select Year' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
];

export function formatISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export function parseISODate(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(value, days) {
  const date = typeof value === 'string' ? parseISODate(value) : new Date(value);
  if (!date) return '';
  date.setDate(date.getDate() + days);
  return formatISODate(date);
}

export function addMonths(value, months) {
  const date = typeof value === 'string' ? parseISODate(value) : new Date(value);
  if (!date) return '';
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
  return formatISODate(date);
}

export function addYears(value, years) {
  const date = typeof value === 'string' ? parseISODate(value) : new Date(value);
  if (!date) return '';
  const month = date.getMonth();
  const day = date.getDate();
  date.setDate(1);
  date.setFullYear(date.getFullYear() + years);
  date.setMonth(month);
  date.setDate(Math.min(day, new Date(date.getFullYear(), month + 1, 0).getDate()));
  return formatISODate(date);
}

export function startOfWeek(value) {
  const date = typeof value === 'string' ? parseISODate(value) : new Date(value);
  if (!date) return '';
  date.setHours(0, 0, 0, 0);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return formatISODate(date);
}

export function endOfWeek(value) {
  const start = startOfWeek(value);
  return start ? addDays(start, 6) : '';
}

export function getSelectedPeriodRange(period, from, to, now = new Date()) {
  const today = formatISODate(now);
  if (period === 'custom') return { from, to };
  if (period === 'today') return { from: today, to: today };
  if (period === 'week') {
    return { from: startOfWeek(now), to: today };
  }
  if (period === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
  if (period === 'year') return { from: `${today.slice(0, 4)}-01-01`, to: today };
  if (period === 'selectedYear' && from) {
    const year = Number(from);
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  return { from: '', to: '' };
}

export function getSelectedPeriodLabel(period, from, to, now = new Date()) {
  if (period === 'custom') {
    if (from && to) return formatDateRange({ from, to });
    if (from) return `From ${formatDateRange({ from, to: from })}`;
    if (to) return `Up to ${formatDateRange({ from: to, to })}`;
    return 'Custom range';
  }
  const labels = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
    selectedYear: `Year ${from}`,
    all: 'All Time',
  };
  return labels[period] || 'Selected period';
}

export function getPreviousEqualRange(range) {
  if (!range?.from || !range?.to) return null;
  const start = parseISODate(range.from);
  const end = parseISODate(range.to);
  if (!start || !end) return null;
  const days = Math.max(1, Math.round((end - start) / MS_PER_DAY) + 1);
  return {
    from: addDays(range.from, -days),
    to: addDays(range.to, -days),
  };
}

export function getBaselinePeriodRange(
  range,
  compare,
  period = 'custom',
  selectedYear = '',
  customBaseline = null
) {
  if (!range?.from || !range?.to || !compare) return null;
  if (compare === 'custom') {
    return customBaseline?.from && customBaseline?.to
      ? { from: customBaseline.from, to: customBaseline.to }
      : null;
  }
  if (period === 'selectedYear' && selectedYear) {
    const baselineYear = Number(selectedYear) - 1;
    return { from: `${baselineYear}-01-01`, to: `${baselineYear}-12-31` };
  }
  if (compare === 'previousYear') {
    return {
      from: addYears(range.from, -1),
      to: addYears(range.to, -1),
    };
  }

  const dayPresets = { today: 1, week: 7 };
  if (dayPresets[period]) {
    return {
      from: addDays(range.from, -dayPresets[period]),
      to: addDays(range.to, -dayPresets[period]),
    };
  }
  if (period === 'month' || period === 'year') {
    const months = period === 'month' ? 1 : 12;
    return {
      from: addMonths(range.from, -months),
      to: addMonths(range.to, -months),
    };
  }
  return getPreviousEqualRange(range);
}

export function countPeriods(range, granularity) {
  if (!range?.from || !range?.to) return 1;
  if (granularity === 'daily') {
    return Math.max(1, Math.round((parseISODate(range.to) - parseISODate(range.from)) / MS_PER_DAY) + 1);
  }
  if (granularity === 'weekly') {
    const start = parseISODate(startOfWeek(range.from));
    const end = parseISODate(endOfWeek(range.to));
    return Math.max(1, Math.floor((end - start) / (MS_PER_DAY * 7)) + 1);
  }
  if (granularity === 'monthly') {
    const start = parseISODate(range.from);
    const end = parseISODate(range.to);
    return Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1);
  }
  const start = parseISODate(range.from);
  const end = parseISODate(range.to);
  return Math.max(1, end.getFullYear() - start.getFullYear() + 1);
}

export function getDefaultComparisonRange(granularity, now = new Date()) {
  const today = formatISODate(now);
  if (granularity === 'daily') {
    return { from: addDays(today, -13), to: today };
  }
  if (granularity === 'weekly') {
    return { from: addDays(startOfWeek(now), -7 * 7), to: today };
  }
  if (granularity === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return { from: formatISODate(start), to: today };
  }
  return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
}

export function getAutoBaselineRange(range, compare = 'previous', granularity = 'daily') {
  if (!range?.from || !range?.to) return null;
  if (compare === 'previousYear') {
    return { from: addYears(range.from, -1), to: addYears(range.to, -1) };
  }
  const periods = countPeriods(range, granularity);
  if (granularity === 'daily') {
    return { from: addDays(range.from, -periods), to: addDays(range.to, -periods) };
  }
  if (granularity === 'weekly') {
    return { from: addDays(range.from, -periods * 7), to: addDays(range.to, -periods * 7) };
  }
  if (granularity === 'monthly') {
    return { from: addMonths(range.from, -periods), to: addMonths(range.to, -periods) };
  }
  return { from: addYears(range.from, -periods), to: addYears(range.to, -periods) };
}

export function formatDateRange(range) {
  if (!range?.from && !range?.to) return '';
  if (!range.from) return `Up to ${formatShortDate(range.to)}`;
  if (!range.to) return `From ${formatShortDate(range.from)}`;
  if (range.from === range.to) return formatShortDate(range.from);
  return `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`;
}

export function formatShortDate(value) {
  const date = parseISODate(value);
  if (!date) return value || '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatPeriodLabel(value, granularity = 'daily') {
  const date = parseISODate(value);
  if (!date) return value || '';
  if (granularity === 'monthly') {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  if (granularity === 'yearly') return String(date.getFullYear());
  return formatShortDate(value);
}

export function getYearOptions(count = 12, now = new Date()) {
  return Array.from({ length: count }, (_, index) => now.getFullYear() - index);
}

export function toMonthValue(value) {
  return value ? value.slice(0, 7) : '';
}

export function toYearValue(value) {
  return value ? value.slice(0, 4) : '';
}

export function getRangeFromInput(granularity, fromValue, toValue) {
  if (granularity === 'monthly') {
    const from = fromValue ? `${fromValue}-01` : '';
    const to = toValue ? addDays(addMonths(`${toValue}-01`, 1), -1) : '';
    return { from, to };
  }
  if (granularity === 'yearly') {
    return {
      from: fromValue ? `${fromValue}-01-01` : '',
      to: toValue ? `${toValue}-12-31` : '',
    };
  }
  return { from: fromValue || '', to: toValue || '' };
}

export function getInputValuesForRange(granularity, range) {
  if (granularity === 'monthly') {
    return { from: toMonthValue(range?.from), to: toMonthValue(range?.to) };
  }
  if (granularity === 'yearly') {
    return { from: toYearValue(range?.from), to: toYearValue(range?.to) };
  }
  return { from: range?.from || '', to: range?.to || '' };
}

export function getGranularityInputType(granularity) {
  if (granularity === 'monthly') return 'month';
  if (granularity === 'yearly') return 'number';
  return 'date';
}
