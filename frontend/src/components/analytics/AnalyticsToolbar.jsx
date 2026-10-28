import { useMemo } from 'react';
import { formatDateRange, formatISODate } from '../../utils/analyticsPeriods';

export default function AnalyticsToolbar({
  from,
  to,
  onFromChange,
  onToChange,
  compare,
  onCompareChange,
  compareDisabled = false,
  onPrint,
  onReports,
  printLabel = 'Print overview',
  reportsLabel = 'More reports',
  now,
  compareFrom,
  compareTo,
  onCompareFromChange,
  onCompareToChange,
  onResetComparison,
  comparisonError,
}) {
  const today = useMemo(() => formatISODate(now || new Date()), [now]);
  const selectedRange = useMemo(() => ({ from, to }), [from, to]);
  const currentLabel = formatDateRange(selectedRange) || 'Select a date range';
  const compareBlocked = Boolean(compareDisabled);

  const changeFrom = (value) => {
    const nextTo = to && value > to ? value : to;
    onFromChange(value);
    if (nextTo !== to) onToChange(nextTo);
  };

  const changeTo = (value) => {
    const nextFrom = from && value < from ? value : from;
    onToChange(value);
    if (nextFrom !== from) onFromChange(nextFrom);
  };

  const formatDisplayDate = (value) => {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const showCompareRow = Boolean(onCompareFromChange || onCompareToChange || onCompareChange);

  return (
    <div className="analytics-toolbar">
      <div className="analytics-toolbar__row">
        <div className="analytics-field analytics-field--dates">
          <label htmlFor="analytics-period-from">Date Range</label>
          <input
            id="analytics-period-from"
            type="date"
            max={today}
            value={from}
            onChange={(event) => changeFrom(event.target.value)}
          />
          <span className="analytics-field__separator">to</span>
          <input
            id="analytics-period-to"
            type="date"
            max={today}
            min={from || undefined}
            value={to}
            onChange={(event) => changeTo(event.target.value)}
          />
        </div>

        {onCompareFromChange ? (
          <div className="analytics-field analytics-field--dates">
            <label htmlFor="analytics-compare-from">Compare Date 1</label>
            <input
              id="analytics-compare-from"
              type="date"
              max={today}
              value={compareFrom || ''}
              onChange={(event) => onCompareFromChange(event.target.value)}
            />
          </div>
        ) : null}

        {onCompareToChange ? (
          <div className="analytics-field analytics-field--dates">
            <label htmlFor="analytics-compare-to">Compare Date 2</label>
            <input
              id="analytics-compare-to"
              type="date"
              max={today}
              value={compareTo || ''}
              onChange={(event) => onCompareToChange(event.target.value)}
            />
          </div>
        ) : null}

        {onCompareChange ? (
          <button
            type="button"
            title={compareBlocked ? 'Select a complete date range before comparing.' : undefined}
            aria-pressed={Boolean(compare)}
            onClick={() => onCompareChange(compare ? '' : 'custom')}
            disabled={compareBlocked || !compareFrom || !compareTo}
            className={`${compare ? 'btn-primary' : 'btn-secondary'} analytics-toolbar__action`}
          >
            Compare
          </button>
        ) : null}

        {(onCompareChange && compare) || onResetComparison ? (
          <button
            type="button"
            className="btn-secondary analytics-toolbar__action"
            onClick={() => {
              if (onResetComparison) {
                onResetComparison();
              } else if (onCompareChange) {
                onCompareChange('');
              }
            }}
          >
            Reset
          </button>
        ) : null}

        <div className="analytics-toolbar__actions">
          {onPrint ? (
            <button type="button" className="btn-primary" onClick={onPrint}>{printLabel}</button>
          ) : null}
          {onReports ? (
            <button type="button" className="btn-secondary" onClick={onReports}>{reportsLabel}</button>
          ) : null}
        </div>
      </div>

      {comparisonError ? (
        <p className="analytics-error-state" style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem' }}>
          {comparisonError}
        </p>
      ) : null}

      {compare && !compareDisabled && compareFrom && compareTo && !comparisonError ? (
        <div className="analytics-toolbar__range">
          <span className="analytics-range-chip analytics-range-chip--current">
            Comparing: <strong>{formatDisplayDate(compareFrom)}</strong> and <strong>{formatDisplayDate(compareTo)}</strong>
          </span>
        </div>
      ) : compare && !compareDisabled ? (
        <p className="analytics-period-label">
          Selected period: <strong>{currentLabel}</strong>
        </p>
      ) : null}
    </div>
  );
}
