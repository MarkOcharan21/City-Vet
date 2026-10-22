import { useMemo } from 'react';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
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
  return { from: '', to: '' };
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
    all: 'All Time',
  };
  const range = getAnalyticsPeriodRange(period, from, to, now);
  return period === 'all' ? labels.all : `${labels[period]} · ${range.from} to ${range.to}`;
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
