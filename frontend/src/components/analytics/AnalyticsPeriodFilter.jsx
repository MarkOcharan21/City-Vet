import { useMemo } from 'react';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'selectedYear', label: 'Select Year' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
];

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export function getAnalyticsPeriodRange(period, from, to, now = new Date()) {
  const today = toISO(now);
  if (period === 'custom') return { from, to };
  if (period === 'today') return { from: today, to: today };
  if (period === 'week') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
    return { from: toISO(start), to: today };
  }
  if (period === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
  if (period === 'year') return { from: `${today.slice(0, 4)}-01-01`, to: today };
  if (period === 'selectedYear' && from) {
    const year = Number(from);
    const end = new Date(year, 11, 31);
    return { from: `${year}-01-01`, to: toISO(end) };
  }
  return { from: '', to: '' };
}

function shiftISODate(value, { years = 0, days = 0 }) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (years) {
    const targetYear = year + years;
    date.setDate(1);
    date.setFullYear(targetYear);
    date.setMonth(month - 1);
    date.setDate(Math.min(day, new Date(targetYear, month, 0).getDate()));
  }
  if (days) date.setDate(date.getDate() + days);
  return toISO(date);
}

export function getAnalyticsComparisonRange(range, compare, period = 'custom', selectedYear = '') {
  if (!range?.from || !range?.to || !compare) return null;
  if (period === 'selectedYear' && selectedYear) {
    const baselineYear = Number(selectedYear) - 1;
    return { from: `${baselineYear}-01-01`, to: toISO(new Date(baselineYear, 11, 31)) };
  }
  if (compare === 'previousYear') {
    return {
      from: shiftISODate(range.from, { years: -1 }),
      to: shiftISODate(range.to, { years: -1 }),
    };
  }

  const presets = { today: 1, week: 7 };
  if (presets[period]) {
    return {
      from: shiftISODate(range.from, { days: -presets[period] }),
      to: shiftISODate(range.to, { days: -presets[period] }),
    };
  }
  if (period === 'month' || period === 'year') {
    const months = period === 'month' ? 1 : 12;
    const shiftMonths = (value) => {
      const [year, month, day] = value.split('-').map(Number);
      const target = new Date(year, month - 1 - months, 1);
      target.setDate(Math.min(day, new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
      return toISO(target);
    };
    return { from: shiftMonths(range.from), to: shiftMonths(range.to) };
  }

  const start = new Date(`${range.from}T00:00:00`);
  const end = new Date(`${range.to}T00:00:00`);
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
  return {
    from: shiftISODate(range.from, { days: -days }),
    to: shiftISODate(range.to, { days: -days }),
  };
}

export function getAnalyticsPeriodLabel(period, from, to, now = new Date()) {
  if (period === 'custom') {
    if (from && to) return `${from} to ${to}`;
    if (from) return `From ${from}`;
    if (to) return `Up to ${to}`;
    return 'Choose a custom date range';
  }
  const labels = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
    selectedYear: `Year ${from}`,
    all: 'All Time',
  };
  const range = getAnalyticsPeriodRange(period, from, to, now);
  if (period === 'all') return labels.all;
  if (period === 'selectedYear') return `${labels.selectedYear} · ${range.from} to ${range.to}`;
  return `${labels[period]} · ${range.from} to ${range.to}`;
}

export default function AnalyticsPeriodFilter({
  period,
  onPeriodChange,
  from,
  to,
  onFromChange,
  onToChange,
  compare,
  onCompareChange,
  compareDisabled = false,
  onPrint,
  onReports,
}) {
  const today = useMemo(() => toISO(new Date()), []);
  const currentYear = new Date().getFullYear();
  return (
    <div className="analytics-period-toolbar">
      <div className="analytics-filter-row" role="group" aria-label="Analytics time period">
        <div className="analytics-toggle-group">
          <span className="analytics-toggle-label">Period</span>
          {PERIODS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={period === option.key}
              onClick={() => onPeriodChange(option.key)}
              className={`analytics-filter-btn${period === option.key ? ' is-active' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="analytics-inline-field">
            <label htmlFor="analytics-period-from">From</label>
            <input
              id="analytics-period-from"
              type="date"
              max={today}
              value={from}
              onChange={(event) => onFromChange(event.target.value)}
            />
            <label htmlFor="analytics-period-to">To</label>
            <input
              id="analytics-period-to"
              type="date"
              max={today}
              min={from || undefined}
              value={to}
              onChange={(event) => onToChange(event.target.value)}
            />
            <button
              type="button"
              className="btn-secondary analytics-filter-action"
              onClick={() => {
                onFromChange('');
                onToChange('');
              }}
              disabled={!from && !to}
            >
              Clear
            </button>
          </div>
        )}
        {period === 'selectedYear' && (
          <div className="analytics-inline-field">
            <label htmlFor="analytics-selected-year">Year</label>
            <select id="analytics-selected-year" value={from || String(currentYear)} onChange={(event) => onFromChange(event.target.value)}>
              {Array.from({ length: 12 }, (_, index) => currentYear - index).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        )}
        {onCompareChange && (
          <div className="analytics-toggle-group">
            <span className="analytics-toggle-label">Compare to</span>
            {[
              { key: '', label: 'Off' },
              { key: 'previousYear', label: 'Same Period Last Year' },
              { key: 'previous', label: 'Previous Period' },
            ].map((option) => (
              <button
                key={option.key || 'off'}
                type="button"
                title={compareDisabled && option.key !== '' ? 'All Time or an incomplete custom range cannot be compared.' : undefined}
                aria-pressed={(!compareDisabled && compare === option.key) || (compareDisabled && option.key === '')}
                onClick={() => onCompareChange(option.key)}
                disabled={compareDisabled && option.key !== ''}
                className={`analytics-filter-btn${
                  (!compareDisabled && compare === option.key) || (compareDisabled && option.key === '')
                    ? ' is-active'
                    : ''
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
        <div className="analytics-period-actions">
          {onPrint && <button type="button" className="btn-primary" onClick={onPrint}>Print Overview Report</button>}
          {onReports && <button type="button" className="btn-secondary" onClick={onReports}>More reports →</button>}
        </div>
      </div>
    </div>
  );
}
