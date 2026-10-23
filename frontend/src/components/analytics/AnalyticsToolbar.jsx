import { useMemo } from 'react';
import {
  formatDateRange,
  formatISODate,
  getBaselinePeriodRange,
} from '../../utils/analyticsPeriods';

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

        {onCompareChange ? (
          <button
            type="button"
            title={compareBlocked ? 'Select a complete date range before comparing.' : undefined}
            aria-pressed={Boolean(compare)}
            onClick={() => onCompareChange(compare ? '' : 'previous')}
            disabled={compareBlocked}
            className={`${compare ? 'btn-primary' : 'btn-secondary'} analytics-toolbar__action`}
          >
            Compare
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

      <div className="analytics-toolbar__range">
        <span className="analytics-range-chip analytics-range-chip--current">
          <span>Viewing</span>
          <strong>{currentLabel}</strong>
        </span>
        {compare && baselineLabel && compareDisabled === false ? (
          <span className="analytics-range-chip analytics-range-chip--baseline">
            <span>Compared with</span>
            <strong>{baselineLabel}</strong>
          </span>
        ) : null}
      </div>
    </div>
  );
}
