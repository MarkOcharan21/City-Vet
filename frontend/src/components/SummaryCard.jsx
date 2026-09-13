export default function SummaryCard({ label, value, color }) {
  return (
    <div className="summary-card" style={{ borderTopColor: color || '#c8102e' }}>
      <p className="summary-card-value">{value}</p>
      <p className="summary-card-label">{label}</p>
    </div>
  );
}
