import { useEffect, useState } from "react";
import { ShieldCheck, KeyRound, Copy, Check, AlertTriangle } from "lucide-react";
import api from "../../services/api";
import PasswordInput from "../../components/PasswordInput";
import PasswordStrength from "../../components/PasswordStrength";
import PasswordChecklist from "../../components/PasswordChecklist";
import FieldError from "../../components/ui/FieldError";
import SuccessModal from "../../components/ui/SuccessModal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

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

export default function AdminSecurity() {
  // ---- Change password ----
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [pwMessage, setPwMessage] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  // ---- Recovery key ----
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
      // Status is informational only — the cards still work without it.
    } finally {
      setLoadingStatus(false);
    }
  }

  useEffect(() => {
    loadKeyStatus();
  }, []);

  function handlePwChange(e) {
    const { name, value } = e.target;
    setPwForm((prev) => ({ ...prev, [name]: value }));
    setPwErrors((prev) => ({ ...prev, [name]: "" }));
    setPwMessage("");
  }

  async function handlePwSubmit(e) {
    e.preventDefault();
    setPwErrors({});
    setPwMessage("");

    if (!pwForm.current_password) {
      setPwErrors({ current_password: "Enter your current password." });
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwErrors({ confirm_password: "Passwords do not match." });
      return;
    }

    setSavingPw(true);
    try {
      const res = await api.post("/auth/change-password", {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
        confirm_password: pwForm.confirm_password,
      });
      setPwMessage(res.data.message || "Password changed successfully.");
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      setPwSuccess(true);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) setPwErrors(apiErrors);
      setPwMessage(err.response?.data?.message || "Could not change password.");
    } finally {
      setSavingPw(false);
    }
  }

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
    <div className="page">
      <h1>Account Security</h1>
      <p className="page-intro">
        Change your password and manage your offline recovery key — the key resets
        your password even when email is unavailable.
      </p>

      <div className="form-card user-directory-card">
        <div className="form-card-header">
          <h2>
            <ShieldCheck size={18} style={{ verticalAlign: "-3px", marginRight: "0.4rem" }} />
            Change Password
          </h2>
          <p>Requires your current password. A confirmation email is sent if the mail service is up.</p>
        </div>

        <form onSubmit={handlePwSubmit} className="validated-form">
          <div className="validated-field">
            <label htmlFor="current_password">Current Password</label>
            <PasswordInput
              name="current_password"
              value={pwForm.current_password}
              onChange={handlePwChange}
              placeholder="Enter your current password"
            />
            <FieldError message={pwErrors.current_password} />
          </div>
          <div className="validated-field">
            <label htmlFor="new_password">New Password</label>
            <PasswordInput
              name="new_password"
              value={pwForm.new_password}
              onChange={handlePwChange}
              placeholder="Create a new password"
            />
            <PasswordStrength password={pwForm.new_password} />
            <PasswordChecklist password={pwForm.new_password} />
            <FieldError message={pwErrors.new_password} />
          </div>
          <div className="validated-field">
            <label htmlFor="confirm_password">Confirm New Password</label>
            <PasswordInput
              name="confirm_password"
              value={pwForm.confirm_password}
              onChange={handlePwChange}
              placeholder="Repeat the new password"
            />
            <FieldError message={pwErrors.confirm_password} />
          </div>

          {pwMessage && !pwSuccess && <p className="form-error">{pwMessage}</p>}

          <button type="submit" className="btn-primary" disabled={savingPw}>
            {savingPw ? "Saving..." : "Change Password"}
          </button>
        </form>
      </div>

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
      </div>

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

      <SuccessModal
        open={pwSuccess}
        title="Password Changed!"
        message={pwMessage || "Your password was changed successfully."}
        confirmText="Done"
        onConfirm={() => {
          setPwSuccess(false);
          setPwMessage("");
        }}
      />
    </div>
  );
}
