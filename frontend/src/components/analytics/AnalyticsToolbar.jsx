import { useMemo } from 'react';
import { formatISODate } from '../../utils/analyticsPeriods';

export default function AnalyticsToolbar({
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
  const sameDate = Boolean(compareFrom && compareTo && compareFrom === compareTo);
  const compareBlocked = Boolean(compareDisabled) || !compareFrom || !compareTo || sameDate;

  const formatDisplayDate = (value) => {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="analytics-toolbar">
      <div className="analytics-toolbar__row">
        <div className="analytics-toolbar__group">
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
              title={
                sameDate
                  ? 'Cannot compare the same date. Please select a different date.'
                  : compareBlocked
                    ? 'Select both comparison dates before comparing.'
                    : undefined
              }
              aria-pressed={Boolean(compare)}
              onClick={() => onCompareChange(compare ? '' : 'custom')}
              disabled={compareBlocked}
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
        </div>

        {onPrint || onReports ? (
          <div className="analytics-toolbar__group analytics-toolbar__group--end">
            {onPrint ? (
              <button type="button" className="btn-primary" onClick={onPrint}>{printLabel}</button>
            ) : null}
            {onReports ? (
              <button type="button" className="btn-secondary" onClick={onReports}>{reportsLabel}</button>
            ) : null}
          </div>
        ) : null}
      </div>

      {comparisonError ? (
        <p className="analytics-inline-warning">{comparisonError}</p>
      ) : null}

      {compare && compareFrom && compareTo && !sameDate ? (
        <div className="analytics-toolbar__range">
          <span className="analytics-range-chip analytics-range-chip--current">
            Comparing: <strong>{formatDisplayDate(compareFrom)}</strong> and <strong>{formatDisplayDate(compareTo)}</strong>
          </span>
        </div>
      ) : null}
    </div>
  );
}
