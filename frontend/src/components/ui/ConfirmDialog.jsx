import { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

/**
 * ConfirmDialog — polished replacement for window.confirm()
 *
 * Props:
 *   open        boolean          — show/hide
 *   title       string           — headline text
 *   message     string           — body text
 *   confirmText string           — confirm button label (default "Delete")
 *   cancelText  string           — cancel button label  (default "Cancel")
 *   variant     "danger"|"warn"  — colour of confirm button
 *   loading     boolean          — shows spinner on confirm button
 *   onConfirm   () => void
 *   onCancel    () => void
 */
export default function ConfirmDialog({
  open,
  title       = "Are you sure?",
  message     = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText  = "Cancel",
  variant     = "danger",
  loading     = false,
  onConfirm,
  onCancel,
}) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onCancel?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmBg    = variant === "danger" ? "#dc2626"                    : "var(--color-warning)";
  const confirmHover = variant === "danger" ? "#b91c1c"                    : "#a16207";
  const iconBg       = variant === "danger" ? "rgba(220,38,38,.1)"         : "rgba(184,134,11,.1)";
  const iconColor    = variant === "danger" ? "#dc2626"                    : "var(--color-warning)";

  return (
    /* Backdrop */
    <div
      onClick={loading ? undefined : onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.35)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn .15s ease",
      }}
    >
      {/* Dialog */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: "32px 28px 28px",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 24px 64px rgba(0,0,0,.2)",
          animation: "popIn .2s ease",
          position: "relative",
        }}
      >
        {/* Close ×  */}
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            position: "absolute", top: 14, right: 14,
            background: "transparent", border: "none",
            color: "#9ca3af", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 28, borderRadius: 6,
            transition: "background .12s, color .12s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.color = "#374151"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9ca3af"; }}
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: iconBg, color: iconColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 18,
        }}>
          {variant === "danger" ? <Trash2 size={24} /> : <AlertTriangle size={24} />}
        </div>

        {/* Text */}
        <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", color: "#111827" }}>
          {title}
        </h3>
        <p style={{ margin: "0 0 26px", color: "#6b7280", fontSize: 14, lineHeight: 1.6 }}>
          {message}
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#374151",
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "background .12s",
              fontFamily: "var(--font-body)",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#f9fafb"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: confirmBg,
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.75 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              transition: "background .12s",
              fontFamily: "var(--font-body)",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = confirmHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = confirmBg; }}
          >
            {loading ? (
              <>
                <span style={{
                  width: 14, height: 14, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,.4)",
                  borderTopColor: "#fff",
                  animation: "spin .7s linear infinite",
                  display: "inline-block",
                }} />
                Processing…
              </>
            ) : confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes popIn  { from { opacity:0; transform:scale(.92) } to { opacity:1; transform:scale(1) } }
      `}</style>
    </div>
  );
}
