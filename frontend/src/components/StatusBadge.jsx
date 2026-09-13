// Colors a status label consistently everywhere it's used.
// Per Cabuyao branding: green is reserved ONLY for completed actions,
// verified/health states, and success — never used as a generic accent.
const STATUS_COLORS = {

  Verified: "#15803D",

  Updated: "#15803D",

  Generated: "#6B7280",

  Registered: "#6B7280",

  Paid: "#15803D",

  Issued: "#15803D",

  Active: "#15803D",

  "Due Soon": "#D97706",

  Pending: "#D97706",

  Draft: "#D97706",

  Synced: "#15803D",

  "Pending Sync": "#D97706",

  Due: "#D97706",

  Open: "#D97706",

  Submitted: "#D97706",

  Rejected: "#DC2626",

  "Pending Verification": "#D97706",

  "Awaiting OR Linking": "#D97706",

  Overdue: "#DC2626",

  Inactive: "#6B7280"

};

export default function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#6b6062';
  return (
    <span className="status-badge" style={{ backgroundColor: color }}>
      {status}
    </span>
  );
}
