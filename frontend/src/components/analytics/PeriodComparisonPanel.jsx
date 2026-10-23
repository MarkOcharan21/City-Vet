import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Printer, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../../services/api';
import SummaryCard from '../SummaryCard';
import GlobalLoadingOverlay from '../GlobalLoadingOverlay';
import { printComparisonReport } from '../../utils/comparisonReportPrint';
import ComparisonSummary from './ComparisonSummary';
import {
  getAutoBaselineRange,
  getDefaultComparisonRange,
  getGranularityInputType,
  getInputValuesForRange,
  getRangeFromInput,
  getYearOptions,
  countPeriods,
  formatDateRange,
  formatISODate,
} from '../../utils/analyticsPeriods';
import {
  buildComparisonExplanation,
  buildComparisonRows,
  buildPeriodDifferenceNote,
  formatPercentChange,
  formatSignedValue,
  getLargestPeriodKeys,
} from '../../utils/comparisonExplanation';
import './chartSetup';

const GRANULARITIES = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const COMPARE_MODES = [
  { key: 'previous', label: 'Previous period' },
  { key: 'previousYear', label: 'Same period last year' },
  { key: 'custom', label: 'Custom dates' },
];

const METRIC_OPTIONS = [
  { key: 'registrations', label: 'Registrations', money: false, percent: false },
  { key: 'doses', label: 'Vaccinations', money: false, percent: false },
  { key: 'pets', label: 'Unique Pets', money: false, percent: false },
  { key: 'owners', label: 'Unique Owners', money: false, percent: false },
  { key: 'consultations', label: 'Consultations', money: false, percent: false },
  { key: 'qrIssued', label: 'QR Issued', money: false, percent: false },
  { key: 'revenue', label: 'Revenue', money: true, percent: false },
  { key: 'newOwners', label: 'New Owners', money: false, percent: false },
  { key: 'evaluable', label: 'Evaluated Follow-ups', money: false, percent: false },
  { key: 'onTime', label: 'On-Time Follow-ups', money: false, percent: false },
  { key: 'late', label: 'Late Follow-ups', money: false, percent: false },
  { key: 'lapsed', label: 'Lapsed Follow-ups', money: false, percent: false },
  { key: 'noReturn', label: 'No Same-Vaccine Return', money: false, percent: false },
];

function fmtMetric(value, money = false, percent = false) {
  return money ? fmtPeso(value) : percent ? fmtPct(value) : fmtNum(value);
}

function fmtNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

function fmtPct(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : '—';
}

function fmtPeso(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `₱${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';
}

const groupedBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { padding: 14, usePointStyle: true, font: { family: 'Inter', size: 12 } },
    },
    tooltip: { backgroundColor: '#241416', padding: 12, cornerRadius: 8 },
    datalabels: { display: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'Inter' } } },
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1, font: { family: 'Inter' } },
      grid: { color: 'rgba(36, 20, 22, 0.06)' },
    },
  },
};

export default function PeriodComparisonPanel() {
  const [granularity, setGranularity] = useState('monthly');
  const [compare, setCompare] = useState('previous');
  const [metric, setMetric] = useState('doses');
  const [chartStyle, setChartStyle] = useState('bars');
  const [showEarlierYears, setShowEarlierYears] = useState(false);
  const [range, setRange] = useState(() => getDefaultComparisonRange('monthly'));
  const [baselineRange, setBaselineRange] = useState(() =>
    getAutoBaselineRange(getDefaultComparisonRange('monthly'), 'previous', 'monthly')
  );

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const windows = Math.min(60, countPeriods(range, granularity));
  const inputType = getGranularityInputType(granularity);
  const rangeInputs = getInputValuesForRange(granularity, range);
  const baselineInputs = getInputValuesForRange(granularity, baselineRange);
  const yearOptions = useMemo(() => getYearOptions(20), []);
  const currentDate = useMemo(() => formatISODate(new Date()), []);
  const currentMonth = currentDate.slice(0, 7);

  const buildParams = useCallback(() => {
    const params = {
      granularity,
      compare: compare === 'custom' ? 'previous' : compare,
      metric,
      from: range.from,
      to: range.to,
      windows,
    };
    if (compare === 'custom') {
      params.baselineFrom = baselineRange.from;
      params.baselineTo = baselineRange.to;
    }
    return params;
  }, [granularity, compare, metric, range.from, range.to, windows, baselineRange.from, baselineRange.to]);

  const loadComparison = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/analytics/period-comparison', { params: buildParams() });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load comparison');
      setData(res.data);
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to load comparison.';
      setError(message);
      setData(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    loadComparison();
  }, [loadComparison, retryCount]);

  const applyRange = (nextRange) => {
    const from = nextRange.from && nextRange.to && nextRange.from > nextRange.to ? nextRange.to : nextRange.from;
    const to = nextRange.from && nextRange.to && nextRange.from > nextRange.to ? nextRange.from : nextRange.to;
    const normalized = { from, to };
    setRange(normalized);
    if (compare === 'custom') {
      setBaselineRange(getAutoBaselineRange(normalized, 'previous', granularity));
    }
  };

  const changeRangeBound = (bound, value) => {
    const values = { ...rangeInputs, [bound]: value };
    applyRange(getRangeFromInput(granularity, values.from, values.to));
  };

  const changeBaselineBound = (bound, value) => {
    const values = { ...baselineInputs, [bound]: value };
    setBaselineRange(getRangeFromInput(granularity, values.from, values.to));
  };

  const changeGranularity = (next) => {
    setGranularity(next);
    const nextRange = getDefaultComparisonRange(next);
    setRange(nextRange);
    setBaselineRange(getAutoBaselineRange(nextRange, next === 'yearly' ? 'previousYear' : 'previous', next));
    if (next === 'yearly') setCompare('previousYear');
  };

  const changeCompare = (next) => {
    setCompare(next);
    setBaselineRange(getAutoBaselineRange(range, next === 'custom' ? 'previous' : next, granularity));
  };

  const totals = data?.totals || {};
  const current = totals.current || {};
  const baseline = totals.baseline || {};
  const series = data?.series || [];
  const yearlyRows = data?.yearly || [];
  const visibleYearlyRows = showEarlierYears ? yearlyRows : yearlyRows.slice(-5);

  const chartData = useMemo(() => {
    const key = data?.primaryMetric || metric;
    const pick = (row) => (row ? Number(row[key]) || 0 : 0);
    return {
      metric: key,
      labels: series.map((s) => s.label),
      current: series.map((s) => pick(s.current)),
      baseline: series.map((s) => pick(s.baseline)),
    };
  }, [series, metric, data?.primaryMetric]);

  const activeMetric = METRIC_OPTIONS.find((m) => m.key === chartData.metric) || METRIC_OPTIONS[1];

  const chipDelta = (option) => {
    const change = totals[option.key] || {};
    const currentValue = Number(current[option.key]) || 0;
    const baselineValue = Number(baseline[option.key]) || 0;
    if (baselineValue < 5) {
      if (!baselineValue && !currentValue) return 'No data';
      return `${formatSignedValue(change.delta, option.money ? 'money' : 'count')} vs baseline`;
    }
    if (change.pctChange == null) return '—';
    return formatPercentChange(change.pctChange);
  };

  const comparisonChartOptions = useMemo(() => {
    if (activeMetric.percent) {
      return {
        ...groupedBarOptions,
        scales: {
          ...groupedBarOptions.scales,
          y: {
            ...groupedBarOptions.scales.y,
            max: 100,
            ticks: { ...groupedBarOptions.scales.y.ticks, callback: (value) => `${value}%` },
          },
        },
      };
    }
    if (!activeMetric.money) return groupedBarOptions;
    return {
      ...groupedBarOptions,
      scales: {
        ...groupedBarOptions.scales,
        y: {
          ...groupedBarOptions.scales.y,
          ticks: {
            ...groupedBarOptions.scales.y.ticks,
            callback: (value) => `₱${Number(value).toLocaleString('en-US')}`,
          },
        },
      },
    };
  }, [activeMetric.money, activeMetric.percent]);

  const comparisonRows = useMemo(
    () => buildComparisonRows({
      current,
      baseline,
      deltas: totals,
      keys: METRIC_OPTIONS.map((option) => option.key),
    }),
    [current, baseline, totals]
  );

  const comparisonExplanations = useMemo(
    () => buildComparisonExplanation({
      rows: comparisonRows,
      series,
      primaryKey: chartData.metric,
      currentLabel: formatDateRange(data?.current) || data?.current?.label || 'the current period',
      baselineLabel: formatDateRange(data?.baseline) || data?.baseline?.label || 'the baseline period',
      currentPartial: data?.current?.partial,
      baselinePartial: data?.baseline?.partial,
    }),
    [comparisonRows, series, chartData.metric, data?.current, data?.baseline]
  );

  const largestPeriodKeys = useMemo(
    () => getLargestPeriodKeys(series, chartData.metric),
    [series, chartData.metric]
  );

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const res = await api.get('/analytics/period-comparison', { params: buildParams() });
      if (!res.data?.success) {
        toast.error(res.data?.message || 'Could not build the comparison report.');
        return;
      }
      printComparisonReport(res.data, {
        title: 'Period Comparison Report',
        period: formatDateRange(res.data.current) || res.data.current?.label || '',
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not build the comparison report.');
    } finally {
      setPrinting(false);
    }
  };

  const renderRangeInputs = (values, onChange, prefix, isBaseline = false) => {
    if (granularity === 'yearly') {
      return (
        <>
          <label htmlFor={`${prefix}-from`}>{isBaseline ? 'Baseline period' : 'Current period'}</label>
          <select
            id={`${prefix}-from`}
            value={values.from}
            onChange={(event) => onChange('from', event.target.value)}
          >
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <span className="analytics-field__separator">to</span>
          <select
            id={`${prefix}-to`}
            value={values.to}
            onChange={(event) => onChange('to', event.target.value)}
          >
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </>
      );
    }
    const maxValue = isBaseline ? undefined : inputType === 'month' ? currentMonth : currentDate;
    return (
      <>
        <label htmlFor={`${prefix}-from`}>{isBaseline ? 'Baseline period' : 'Current period'}</label>
        <input
          id={`${prefix}-from`}
          type={inputType}
          max={maxValue}
          value={values.from}
          onChange={(event) => onChange('from', event.target.value)}
        />
        <span className="analytics-field__separator">to</span>
        <input
          id={`${prefix}-to`}
          type={inputType}
          max={maxValue}
          min={values.from || undefined}
          value={values.to}
          onChange={(event) => onChange('to', event.target.value)}
        />
      </>
    );
  };

  const currentLabel = formatDateRange(data?.current) || data?.current?.label || formatDateRange(range);
  const baselineLabel = formatDateRange(data?.baseline) || data?.baseline?.label || formatDateRange(baselineRange);

  return (
    <div className="analytics-panel">
      <div className="analytics-toolbar analytics-toolbar--comparison">
        <div className="analytics-toolbar__row">
          <div className="analytics-segmented" role="group" aria-label="Comparison granularity">
            <span className="analytics-segmented__label">Group by</span>
            {GRANULARITIES.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={granularity === option.key}
                onClick={() => changeGranularity(option.key)}
                className={`analytics-segmented__option${granularity === option.key ? ' is-active' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="analytics-field analytics-field--dates">
            {renderRangeInputs(rangeInputs, changeRangeBound, 'comparison-current')}
          </div>

          <div className="analytics-segmented" role="group" aria-label="Compare against">
            <span className="analytics-segmented__label">Compare</span>
            {COMPARE_MODES.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={compare === option.key}
                onClick={() => changeCompare(option.key)}
                className={`analytics-segmented__option${compare === option.key ? ' is-active' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="analytics-field">
            <label htmlFor="comparison-metric">Metric</label>
            <select id="comparison-metric" value={metric} onChange={(event) => setMetric(event.target.value)}>
              {METRIC_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="analytics-toolbar__actions">
            <button
              type="button"
              className="btn-secondary analytics-toolbar__action"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <button
              type="button"
              className="btn-primary analytics-toolbar__action"
              onClick={handlePrint}
              disabled={loading || printing || !data}
            >
              <Printer size={15} /> {printing ? 'Preparing…' : 'Print comparison'}
            </button>
          </div>
        </div>

        {compare === 'custom' ? (
          <div className="analytics-toolbar__row analytics-toolbar__row--baseline">
            <div className="analytics-field analytics-field--dates">
              {renderRangeInputs(baselineInputs, changeBaselineBound, 'comparison-baseline', true)}
            </div>
          </div>
        ) : null}

        <div className="analytics-toolbar__range">
          <span className="analytics-range-chip analytics-range-chip--current">
            <span>Viewing</span>
            <strong>{currentLabel}</strong>
          </span>
          <span className="analytics-range-chip analytics-range-chip--baseline">
            <span>Compared with</span>
            <strong>{baselineLabel}</strong>
          </span>
          <span className="analytics-range-chip analytics-range-chip--quiet">
            {windows} {granularity === 'daily' ? 'day' : granularity === 'weekly' ? 'week' : granularity === 'monthly' ? 'month' : 'year'}{windows === 1 ? '' : 's'} per side
          </span>
        </div>
      </div>

      <div className="analytics-metric-chips" role="group" aria-label="Quick comparison metrics">
        {METRIC_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`analytics-metric-chip${metric === option.key ? ' is-active' : ''}`}
            aria-pressed={metric === option.key}
            onClick={() => setMetric(option.key)}
          >
            {option.label}
            <small>{chipDelta(option)}</small>
          </button>
        ))}
      </div>

      {loading && <GlobalLoadingOverlay visible={true} message="Building comparison..." />}

      {!loading && error && (
        <div className="analytics-error-state">
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={() => setRetryCount((count) => count + 1)}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <ComparisonSummary
            title="All metrics at a glance"
            subtitle="Every comparable metric for the current and baseline windows."
            currentLabel={currentLabel}
            baselineLabel={baselineLabel}
            rows={comparisonRows}
            explanations={comparisonExplanations}
            note={data?.current?.partial || data?.baseline?.partial ? 'One period is still in progress' : undefined}
          />

          <div className="summary-row">
            <SummaryCard
              label={`${activeMetric.label} — Current`}
              value={fmtMetric(current[chartData.metric], activeMetric.money, activeMetric.percent)}
            />
            <SummaryCard
              label={`${activeMetric.label} — Baseline`}
              value={fmtMetric(baseline[chartData.metric], activeMetric.money, activeMetric.percent)}
            />
            <SummaryCard
              label="Absolute Change"
              value={activeMetric.percent
                ? `${formatSignedValue(totals[chartData.metric]?.delta, 'percent')}`
                : formatSignedValue(totals[chartData.metric]?.delta, activeMetric.money ? 'money' : 'count')}
            />
            <SummaryCard
              label="Percent Change"
              value={formatPercentChange(totals[chartData.metric]?.pctChange)
                || (Number(baseline[chartData.metric]) > 0 ? 'N/A (<5 baseline)' : 'New')}
            />
          </div>

          {activeMetric.key === 'registrations' && (
            <p className="analytics-chart-section-desc">
              Registrations are grouped by registration date (falling back to encoded date when missing). Bulk encoding can still make registration-date totals differ from the date records were entered.
            </p>
          )}

          <div className="analytics-chart-mode" role="group" aria-label="Comparison chart type">
            <button type="button" aria-pressed={chartStyle === 'bars'} className={chartStyle === 'bars' ? 'is-active' : ''} onClick={() => setChartStyle('bars')}>Bars</button>
            <button type="button" aria-pressed={chartStyle === 'line'} className={chartStyle === 'line' ? 'is-active' : ''} onClick={() => setChartStyle('line')}>Line</button>
          </div>
          <div className="chart-grid chart-grid--1col">
            <div className="chart-card">
              <h3>{activeMetric.label} — Current vs Baseline ({chartStyle === 'bars' ? 'Bars' : 'Line'})</h3>
              <p className="analytics-visual-explanation">The horizontal axis shows each period in the selected granularity; the vertical axis shows {activeMetric.money ? 'paid revenue in pesos' : activeMetric.label.toLowerCase()}. Matching colors identify the current and baseline series.</p>
              <div className="chart-card-canvas">
                {series.length ? (
                  chartStyle === 'bars' ? (
                    <Bar
                      options={comparisonChartOptions}
                      data={{
                        labels: chartData.labels,
                        datasets: [
                          {
                            label: data.current?.label || 'Current',
                            data: chartData.current,
                            backgroundColor: '#c8102e',
                            borderRadius: 4,
                          },
                          {
                            label: data.baseline?.label || 'Baseline',
                            data: chartData.baseline,
                            backgroundColor: '#c6a15b',
                            borderRadius: 4,
                          },
                        ],
                      }}
                    />
                  ) : (
                    <Line
                      options={comparisonChartOptions}
                      data={{
                        labels: chartData.labels,
                        datasets: [
                          { label: data.current?.label || 'Current', data: chartData.current, borderColor: '#c8102e', backgroundColor: 'rgba(200, 16, 46, 0.1)', fill: true, tension: 0, pointRadius: 3, spanGaps: true },
                          { label: data.baseline?.label || 'Baseline', data: chartData.baseline, borderColor: '#c6a15b', backgroundColor: 'rgba(198, 161, 91, 0.1)', borderDash: [6, 4], tension: 0, pointRadius: 3, spanGaps: true },
                        ],
                      }}
                    />
                  )
                ) : (
                  <p className="chart-card-empty">No comparison data is available for these windows. Choose another date range or granularity, or check that records exist in both periods.</p>
                )}
              </div>
            </div>
          </div>

          <section className="analytics-chart-section">
            <h3 className="analytics-chart-section-title">Period by period</h3>
            <p className="analytics-chart-section-desc">Use this table to find which individual periods account for the overall change shown above. “No data” means that baseline period has no recorded value.</p>
            <div className="report-table-container">
              <h3>Current period vs baseline</h3>
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Baseline Period</th>
                      <th>{activeMetric.label} (Current)</th>
                      <th>{activeMetric.label} (Baseline)</th>
                      <th>Change</th>
                      <th>% Change</th>
                      <th>What changed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.length ? (
                      (granularity === 'yearly' ? (showEarlierYears ? series : series.slice(-5)) : series).map((row) => (
                        <tr key={row.key}>
                          <td>{row.label}</td>
                          <td>{row.baselineLabel}</td>
                          <td>{fmtMetric(row.current?.[chartData.metric] ?? 0, activeMetric.money, activeMetric.percent)}</td>
                          <td>{row.baseline ? fmtMetric(row.baseline[chartData.metric], activeMetric.money, activeMetric.percent) : 'No data'}</td>
                          <td>{activeMetric.percent ? `${formatSignedValue(row.deltas?.[chartData.metric]?.delta ?? row.delta, 'percent')}` : formatSignedValue(row.deltas?.[chartData.metric]?.delta ?? row.delta, activeMetric.money ? 'money' : 'count')}</td>
                          <td>{formatPercentChange(row.deltas?.[chartData.metric]?.pctChange ?? row.pctChange) || '—'}</td>
                          <td className="analytics-table-note">
                            {buildPeriodDifferenceNote({
                              row,
                              metricKey: chartData.metric,
                              largestIncreaseKey: largestPeriodKeys.increaseKey,
                              largestDecreaseKey: largestPeriodKeys.decreaseKey,
                            })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="report-table-empty" colSpan={7}>
                          No period rows are available for this selection. Try another date range or granularity.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {granularity === 'yearly' && series.length > 5 && (
                <button type="button" className="btn-secondary" onClick={() => setShowEarlierYears((show) => !show)}>
                  {showEarlierYears ? 'Show latest 5 years' : `Show earlier years (${series.length - 5})`}
                </button>
              )}
            </div>
          </section>

          <section className="analytics-chart-section">
            <h3 className="analytics-chart-section-title">Year-over-year summary</h3>
            <p className="analytics-chart-section-desc">
              Each cell shows the year's actual value, the previous year's actual value, and the change. The current year is year-to-date (YTD), so compare it cautiously with a complete prior year.
            </p>
            <div className="report-table-container">
              <h3>Yearly totals</h3>
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Registrations</th>
                      <th>Vaccinations</th>
                      <th>Unique Pets</th>
                      <th>Unique Owners</th>
                      <th>Consultations</th>
                      <th>QR Issued</th>
                      <th>Revenue</th>
                      <th>New Owners</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyRows.length ? (
                      visibleYearlyRows.map((row) => {
                        const cell = (metricKey, money = false) => {
                          const previous = yearlyRows.find((item) => Number(item.year) === Number(row.year) - 1);
                          return (
                            <>
                              <div>{fmtMetric(row[metricKey], money)}</div>
                              <small className="analytics-table-delta">{previous ? `vs ${previous.year}: ${fmtMetric(previous[metricKey], money)}` : 'No prior year'}</small>
                              <small className="analytics-table-delta">Change: {formatSignedValue(row.deltas?.[metricKey]?.delta, money ? 'money' : 'count')}</small>
                            </>
                          );
                        };
                        return (
                          <tr key={row.year}>
                            <td>
                              {row.year}
                              {Number(row.year) === new Date().getFullYear() && (
                                <span className="analytics-small-sample" title="Year to date; the change is against the full previous year.">
                                  YTD
                                </span>
                              )}
                            </td>
                            <td>{cell('registrations')}</td>
                            <td>{cell('doses')}</td>
                            <td>{cell('pets')}</td>
                            <td>{cell('owners')}</td>
                            <td>{cell('consultations')}</td>
                            <td>{cell('qrIssued')}</td>
                            <td>{cell('revenue', true)}</td>
                            <td>{cell('newOwners')}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="report-table-empty" colSpan={9}>
                          No yearly data is available yet. Check that records have been entered for multiple years.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {yearlyRows.length > 5 && (
                <button type="button" className="btn-secondary" onClick={() => setShowEarlierYears((show) => !show)}>
                  {showEarlierYears ? 'Show latest 5 years' : `Show earlier years (${yearlyRows.length - 5})`}
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
