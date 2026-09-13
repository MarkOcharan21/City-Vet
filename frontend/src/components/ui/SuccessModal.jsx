import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * SuccessModal — polished success confirmation popup.
 *
 * Props:
 *   open        boolean  — show/hide
 *   title       string   — headline (default "Success!")
 *   message     string   — body text
 *   confirmText string   — button label (default "Done")
 *   onConfirm   () => void
 */
export default function SuccessModal({
  open,
  title = "Success!",
  message = "Your changes have been saved.",
  confirmText = "Done",
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onConfirm?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onConfirm]);

  if (!open) return null;

  return (
    <div
      onClick={onConfirm}
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
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: "32px 28px 28px",
          width: "100%",
          maxWidth: 400,
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,.2)",
          animation: "popIn .2s ease",
          position: "relative",
          fontFamily: "var(--font-body)",
        }}
      >
        <button
          onClick={onConfirm}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "transparent",
            border: "none",
            color: "#9ca3af",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            transition: "background .12s, color .12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f3f4f6";
            e.currentTarget.style.color = "#374151";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#9ca3af";
          }}
        >
          <X size={16} />
        </button>

        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(22,163,74,.1)",
            color: "#16a34a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
            position: "relative",
          }}
        >
          <span className="success-modal-ring" />
          <CheckCircle2 size={32} strokeWidth={2.2} />
        </div>

        <h3
          style={{ margin: "0 0 8px", fontSize: "1.25rem", color: "#111827" }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: "0 0 24px",
            color: "#6b7280",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>

        <button
          onClick={onConfirm}
          style={{
            width: "100%",
            padding: "11px 16px",
            borderRadius: 10,
            border: "none",
            background: "#16a34a",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            transition: "background .12s",
            fontFamily: "var(--font-body)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#15803d";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#16a34a";
          }}
        >
          {confirmText}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes popIn  { from { opacity:0; transform:scale(.92) } to { opacity:1; transform:scale(1) } }
        .success-modal-ring::after {
          content: "";
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 2px solid rgba(22,163,74,.35);
          animation: ringPulse 1.6s ease-out infinite;
        }
        @keyframes ringPulse {
          0%   { transform: scale(.85); opacity: 1; }
          100% { transform: scale(1.25); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
