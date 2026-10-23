import { useMemo } from 'react';
import {
  formatDateRange,
  formatISODate,
  getBaselinePeriodRange,
} from '../../utils/analyticsPeriods';

const COMPARE_OPTIONS = [
  { key: '', label: 'Off' },
  { key: 'previous', label: 'Previous period' },
  { key: 'previousYear', label: 'Same period last year' },
];

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
}) {
  const today = useMemo(() => formatISODate(now || new Date()), [now]);
  const selectedRange = useMemo(() => ({ from, to }), [from, to]);
  const baselineRange = useMemo(
    () => getBaselinePeriodRange(selectedRange, compare),
    [selectedRange, compare]
  );
  const currentLabel = formatDateRange(selectedRange) || 'Select a date range';
  const baselineLabel = formatDateRange(baselineRange);
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

  return (
    <div className="analytics-toolbar">
      <div className="analytics-toolbar__row">
        <div className="analytics-field analytics-field--dates">
          <label htmlFor="analytics-period-from">Date range</label>
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

        {onCompareChange ? (
          <div className="analytics-segmented" role="group" aria-label="Compare with">
            <span className="analytics-segmented__label">Compare</span>
            {COMPARE_OPTIONS.map((option) => {
              const disabled = compareBlocked && option.key !== '';
              const active = (compareBlocked ? '' : compare) === option.key;
              return (
                <button
                  key={option.key || 'off'}
                  type="button"
                  title={disabled ? 'Select a complete date range before comparing.' : undefined}
                  aria-pressed={active}
                  onClick={() => onCompareChange(option.key)}
                  disabled={disabled}
                  className={`analytics-segmented__option${active ? ' is-active' : ''}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
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

      <div className="analytics-toolbar__range">
        <span className="analytics-range-chip analytics-range-chip--current">
          <span>Viewing</span>
          <strong>{currentLabel}</strong>
        </span>
        {compare && baselineLabel ? (
          <span className="analytics-range-chip analytics-range-chip--baseline">
            <span>Compared with</span>
            <strong>{baselineLabel}</strong>
          </span>
        ) : null}
      </div>
    </div>
  );
}
