import { useMemo } from 'react';
import {
  ANALYTICS_PRESETS,
  formatDateRange,
  formatISODate,
  getBaselinePeriodRange,
  getSelectedPeriodLabel,
  getSelectedPeriodRange,
  getYearOptions,
} from '../../utils/analyticsPeriods';

const COMPARE_OPTIONS = [
  { key: '', label: 'Off' },
  { key: 'previousYear', label: 'Same period last year' },
  { key: 'previous', label: 'Previous period' },
  { key: 'custom', label: 'Custom dates' },
];

export default function AnalyticsToolbar({
  period,
  onPeriodChange,
  from,
  to,
  onFromChange,
  onToChange,
  compare,
  onCompareChange,
  baselineFrom,
  baselineTo,
  onBaselineFromChange,
  onBaselineToChange,
  compareDisabled = false,
  onPrint,
  onReports,
  printLabel = 'Print overview',
  reportsLabel = 'More reports',
  now,
}) {
  const today = useMemo(() => formatISODate(now || new Date()), [now]);
  const selectedRange = useMemo(
    () => getSelectedPeriodRange(period, from, to, now || new Date()),
    [period, from, to, now]
  );
  const baselineRange = useMemo(
    () => getBaselinePeriodRange(selectedRange, compare, period, from, { from: baselineFrom, to: baselineTo }),
    [selectedRange, compare, period, from, baselineFrom, baselineTo]
  );
  const currentLabel =
    formatDateRange(selectedRange) || getSelectedPeriodLabel(period, from, to, now || new Date());
  const baselineLabel = formatDateRange(baselineRange);
  const compareBlocked = Boolean(compareDisabled);
  const baselineInputsEnabled = compare === 'custom';

  const commitRange = (nextFrom, nextTo) => {
    if (period !== 'custom') onPeriodChange('custom');
    onFromChange(nextFrom);
    onToChange(nextTo);
  };

  const changeFrom = (value) => {
    const nextTo = selectedRange.to || to;
    commitRange(value, nextTo && value > nextTo ? value : nextTo);
  };

  const changeTo = (value) => {
    const nextFrom = selectedRange.from || from;
    commitRange(value && nextFrom && value < nextFrom ? value : nextFrom, value);
  };

  return (
    <div className="analytics-toolbar">
      <div className="analytics-toolbar__row">
        <div className="analytics-segmented" role="group" aria-label="Analytics time period">
          <span className="analytics-segmented__label">Period</span>
          {ANALYTICS_PRESETS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={period === option.key}
              onClick={() => onPeriodChange(option.key)}
              className={`analytics-segmented__option${period === option.key ? ' is-active' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {period === 'selectedYear' ? (
          <div className="analytics-field">
            <label htmlFor="analytics-selected-year">Year</label>
            <select
              id="analytics-selected-year"
              value={from || String(new Date().getFullYear())}
              onChange={(event) => onFromChange(event.target.value)}
            >
              {getYearOptions(12, now || new Date()).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        ) : null}

        {period !== 'all' && period !== 'selectedYear' ? (
          <div className="analytics-field analytics-field--dates">
            <label htmlFor="analytics-period-from">Current period</label>
            <input
              id="analytics-period-from"
              type="date"
              max={today}
              value={period === 'custom' ? from : selectedRange.from}
              onChange={(event) => changeFrom(event.target.value)}
            />
            <span className="analytics-field__separator">to</span>
            <input
              id="analytics-period-to"
              type="date"
              max={today}
              min={(period === 'custom' ? from : selectedRange.from) || undefined}
              value={period === 'custom' ? to : selectedRange.to}
              onChange={(event) => changeTo(event.target.value)}
            />
          </div>
        ) : null}

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
                  title={disabled ? 'All Time or an incomplete range cannot be compared.' : undefined}
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

      {baselineInputsEnabled && onBaselineFromChange ? (
        <div className="analytics-toolbar__row analytics-toolbar__row--baseline">
          <div className="analytics-field analytics-field--dates">
            <label htmlFor="analytics-baseline-from">Baseline period</label>
            <input
              id="analytics-baseline-from"
              type="date"
              value={baselineFrom}
              onChange={(event) => onBaselineFromChange(event.target.value)}
            />
            <span className="analytics-field__separator">to</span>
            <input
              id="analytics-baseline-to"
              type="date"
              min={baselineFrom || undefined}
              value={baselineTo}
              onChange={(event) => onBaselineToChange(event.target.value)}
            />
            <button
              type="button"
              className="btn-secondary analytics-toolbar__action"
              disabled={!baselineFrom && !baselineTo}
              onClick={() => {
                onBaselineFromChange('');
                onBaselineToChange('');
                onCompareChange?.('');
              }}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

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
