export default function SummaryCard({ label, value, color, sub }) {
  return (
    <div className="summary-card" style={{ borderTopColor: color || '#c8102e' }}>
      <p className="summary-card-value">{value}</p>
      <p className="summary-card-label">{label}</p>
      {Array.isArray(sub) && sub.length > 0 && (
        <div className="summary-card-sub">
          {sub.map((s) => (
            <div key={s.label} className="summary-card-sub-item">
              <span className="summary-card-sub-label">{s.label}</span>
              <span className="summary-card-sub-value">{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
