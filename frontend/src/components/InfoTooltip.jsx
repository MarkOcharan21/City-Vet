export default function InfoTooltip({ text, label = 'More information' }) {
  if (!text) return null;
  return (
    <span className="info-tooltip">
      <button
        type="button"
        className="info-tooltip-trigger"
        aria-label={label}
        data-tooltip={text}
      >
        i
      </button>
    </span>
  );
}
