import {
  formatMetricValue,
  formatPercentChange,
  formatSignedValue,
} from '../../utils/comparisonExplanation';

function toneForRow(row) {
  if (!row.delta) return 'is-flat';
  if (row.better === true) return 'is-good';
  if (row.better === false) return 'is-bad';
  return 'is-flat';
}

function changeLabel(row) {
  const percent = formatPercentChange(row.pctChange);
  if (percent) return percent;
  if (row.baseline > 0 && row.baseline < 5) return 'Baseline under 5';
  if (row.baseline === 0 && row.current > 0) return 'New activity';
  return '—';
}

export default function ComparisonSummary({
  title = 'Current vs baseline',
  subtitle = 'The same metrics, side by side for the two periods.',
  currentLabel = 'Current',
  baselineLabel = 'Baseline',
  rows = [],
  explanations = [],
  note,
  className = '',
}) {
  if (!rows.length) return null;
  return (
    <section className={`comparison-summary ${className}`.trim()}>
      <div className="comparison-summary__header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        {note ? <span className="comparison-summary__note">{note}</span> : null}
      </div>

      <div className="comparison-summary__columns">
        <span>Metric</span>
        <span>{currentLabel}</span>
        <span>{baselineLabel}</span>
        <span>Change</span>
      </div>

      <div className="comparison-summary__table" role="table" aria-label={title}>
        {rows.map((row) => (
          <div className="comparison-summary__row" role="row" key={row.key}>
            <span className="comparison-summary__metric" role="cell">{row.label}</span>
            <span className="comparison-summary__value" role="cell">
              {formatMetricValue(row.current, row.kind)}
            </span>
            <span className="comparison-summary__value comparison-summary__value--baseline" role="cell">
              {formatMetricValue(row.baseline, row.kind)}
            </span>
            <span className={`comparison-summary__change ${toneForRow(row)}`} role="cell">
              <strong>{formatSignedValue(row.delta, row.kind)}</strong>
              <small>{changeLabel(row)}</small>
            </span>
          </div>
        ))}
      </div>

      {explanations.length ? (
        <div className="comparison-summary__explanation">
          <h4>What changed</h4>
          <ul>
            {explanations.map((sentence) => (
              <li key={sentence}>{sentence}</li>
            ))}
          </ul>
          <p className="comparison-summary__disclaimer">
            These notes describe the data only; they do not establish cause.
          </p>
        </div>
      ) : null}
    </section>
  );
}
