import { CalendarDays, UserRound } from "lucide-react";
import { resolveMediaUrl } from "../../utils/mediaUrl";

const AUDIENCE_META = {
  All:          { label: "All Users",      color: "#4338CA", bg: "#EEF2FF" },
  Owner:        { label: "Pet Owners",     color: "#065F46", bg: "#ECFDF5" },
  Staff:        { label: "Clinic Staff",   color: "#92400E", bg: "#FEF3C7" },
  Veterinarian: { label: "Veterinarians",  color: "#1D4ED8", bg: "#DBEAFE" },
  Admin:        { label: "Administrators", color: "#7C3AED", bg: "#EDE9FE" },
};

export default function AnnouncementCard({ item, showAudience = false, highlighted = false }) {
  const meta = AUDIENCE_META[item.audience] || AUDIENCE_META.All;

  return (
    <div
      id={`announcement-${item.id}`}
      style={{
      background: highlighted ? "#FFF7ED" : "var(--color-card)",
      borderRadius: 14,
      marginBottom: 20,
      boxShadow: highlighted
        ? "0 0 0 2px var(--color-primary), 0 2px 10px rgba(36,20,22,.06)"
        : "0 2px 10px rgba(36,20,22,.06)",
      overflow: "hidden",
      borderTop: "3px solid var(--color-accent)",
    }}>

      {/* Image banner */}
      {item.image && (
        <img
          src={resolveMediaUrl(item.image)}
          alt={item.title}
          style={{
            width: "100%",
            height: "auto",
            objectFit: "contain",
            display: "block",
            background: "var(--color-bg)",
          }}
        />
      )}

      <div style={{ padding: "18px 22px" }}>

        {/* Title + audience badge row */}
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", gap: 12, marginBottom: 10,
        }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem", lineHeight: 1.3 }}>
            {item.title}
          </h2>

          {showAudience && (
            <span style={{
              flexShrink: 0,
              background: meta.bg, color: meta.color,
              padding: "3px 10px", borderRadius: 20,
              fontSize: 12, fontWeight: 700,
            }}>
              {meta.label}
            </span>
          )}
        </div>

        {/* Message */}
        <p style={{
          margin: "0 0 16px",
          whiteSpace: "pre-line",
          lineHeight: 1.65,
          color: "var(--color-ink)",
          fontSize: 14,
        }}>
          {item.message}
        </p>

        {/* Meta footer */}
        <div style={{
          display: "flex", gap: 18, flexWrap: "wrap",
          color: "var(--color-text-muted)", fontSize: 13,
          borderTop: "1px solid var(--color-border)", paddingTop: 12,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <UserRound size={14} />
            {item.created_by_name || "Administrator"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <CalendarDays size={14} />
            {new Date(item.created_at).toLocaleString()}
          </span>
        </div>

      </div>
    </div>
  );
}
