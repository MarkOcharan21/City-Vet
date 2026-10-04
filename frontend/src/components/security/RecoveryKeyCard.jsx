import { useEffect, useState } from "react";
import { KeyRound, Copy, Check, AlertTriangle } from "lucide-react";
import api from "../../services/api";
import ConfirmDialog from "../ui/ConfirmDialog";

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Shared offline recovery-key card used by every portal's security page.
// Generates a single-use key (shown once), usable on the Forgot Password
// page even when email is down.
export default function RecoveryKeyCard() {
  const [keyStatus, setKeyStatus] = useState({ has_active_key: false, created_at: null });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [keyError, setKeyError] = useState("");
  const [copied, setCopied] = useState(false);

  async function loadKeyStatus() {
    setLoadingStatus(true);
    try {
      const res = await api.get("/auth/recovery-key/status");
      setKeyStatus({
        has_active_key: Boolean(res.data.has_active_key),
        created_at: res.data.created_at || null,
      });
    } catch (_) {
      // Status is informational only — generation still works without it.
    } finally {
      setLoadingStatus(false);
    }
  }

  useEffect(() => {
    loadKeyStatus();
  }, []);

  async function handleGenerate() {
    setConfirmGenerate(false);
    setKeyError("");
    setCopied(false);
    setGenerating(true);
    try {
      const res = await api.post("/auth/recovery-key");
      setNewKey({ key: res.data.recovery_key, created_at: res.data.created_at || null });
      await loadKeyStatus();
    } catch (err) {
      setKeyError(err.response?.data?.message || "Could not generate recovery key.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!newKey?.key) return;
    try {
      await navigator.clipboard.writeText(newKey.key);
      setCopied(true);
    } catch (_) {
      setCopied(false);
    }
  }

  return (
    <div className="form-card user-directory-card">
      <div className="form-card-header">
        <h2>
          <KeyRound size={18} style={{ verticalAlign: "-3px", marginRight: "0.4rem" }} />
          Offline Recovery Key
        </h2>
        <p>
          A single-use key that resets your password from the Forgot Password page
          without needing email. Save it somewhere safe — it is shown only once.
        </p>
      </div>

      {loadingStatus ? (
        <p className="table-meta">Checking recovery key status...</p>
      ) : keyStatus.has_active_key ? (
        <p className="form-success">
          <Check size={15} style={{ verticalAlign: "-2px", marginRight: "0.35rem" }} />
          You have an active recovery key (generated {formatDateTime(keyStatus.created_at)}).
          Generating a new one invalidates it.
        </p>
      ) : (
        <p className="table-meta">No active recovery key. Generate one below.</p>
      )}

      {keyError && <p className="form-error">{keyError}</p>}

      {newKey ? (
        <div className="otp-fallback-box" role="status">
          <p className="otp-fallback-title">
            <AlertTriangle size={14} style={{ verticalAlign: "-2px", marginRight: "0.35rem" }} />
            Save this key now — it will never be shown again:
          </p>
          <p className="otp-fallback-code">{newKey.key}</p>
          <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", marginTop: "0.8rem" }}>
            <button type="button" className="btn-secondary btn-sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check size={14} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy Key
                </>
              )}
            </button>
            <button type="button" className="btn-primary btn-sm" onClick={() => setNewKey(null)}>
              Done — I Saved It
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn-primary"
          disabled={generating}
          onClick={() => setConfirmGenerate(true)}
        >
          {generating ? "Generating..." : keyStatus.has_active_key ? "Generate New Key" : "Generate Recovery Key"}
        </button>
      )}

      <ConfirmDialog
        open={confirmGenerate}
        title="Generate a new recovery key?"
        message="This invalidates any previous unused key. The new key is shown only once — save it somewhere safe (printed copy or password manager)."
        confirmText="Generate Key"
        cancelText="Cancel"
        loading={generating}
        onConfirm={handleGenerate}
        onCancel={() => setConfirmGenerate(false)}
      />
    </div>
  );
}
