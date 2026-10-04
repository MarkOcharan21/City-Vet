import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Copy, Check, AlertTriangle, PartyPopper } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import FieldError from "../../components/ui/FieldError";

const PRE_TOKEN_KEY = "admin_pre_token";

// First-login setup for admins (open route — no session token exists yet).
// Screen 1: create the personal 6-digit access code.
// Screen 2: save the auto-generated offline recovery key.
// Only then is the portal unlocked — no code, no access.
export default function AdminWelcome() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [screen, setScreen] = useState("pin");
  const [code, setCode] = useState("");
  const [codeConfirm, setCodeConfirm] = useState("");
  const [codeError, setCodeError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [adminName, setAdminName] = useState("");

  useEffect(() => {
    const preToken = sessionStorage.getItem(PRE_TOKEN_KEY);
    if (!preToken) {
      navigate("/admin/login", { replace: true });
      return;
    }
    try {
      const payload = JSON.parse(atob(preToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      setAdminName(payload?.email?.split("@")[0] || "");
    } catch {
      /* name is decorative only */
    }
  }, [navigate]);

  function handleCodeInput(setter) {
    return (e) => {
      setter(e.target.value.replace(/\D/g, "").slice(0, 6));
      setCodeError("");
      setError("");
    };
  }

  async function handleSetup(e) {
    e.preventDefault();
    setCodeError("");
    setError("");

    if (!/^\d{6}$/.test(code)) {
      setCodeError("Access code must be exactly 6 digits.");
      return;
    }
    if (code !== codeConfirm) {
      setCodeError("Access codes do not match.");
      return;
    }

    const preToken = sessionStorage.getItem(PRE_TOKEN_KEY);
    if (!preToken) {
      navigate("/admin/login", { replace: true });
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("/auth/admin-welcome", {
        pre_token: preToken,
        code,
        code_confirm: codeConfirm,
      });
      login(res.data.token, res.data.user);
      setRecoveryKey(res.data.recovery_key || "");
      setScreen("key");
    } catch (err) {
      if (err.response?.status === 409) {
        // A code already exists (e.g. setup done in another tab) — go log in.
        sessionStorage.removeItem(PRE_TOKEN_KEY);
        navigate("/admin/login", { replace: true });
        return;
      }
      setError(err.response?.data?.message || "Could not complete setup.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!recoveryKey) return;
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
    } catch (_) {
      setCopied(false);
    }
  }

  function handleEnter() {
    sessionStorage.removeItem(PRE_TOKEN_KEY);
    navigate("/admin/overview", { replace: true });
  }

  return (
    <div className="auth-page">
      <div className="auth-graphic">
        <h2>Welcome{adminName ? `, ${adminName}` : ""}!</h2>
        <p>Secure your Administrator account in two quick steps, then enter the portal.</p>
      </div>

      <div className="auth-box">
        {screen === "pin" ? (
          <>
            <h3>
              <PartyPopper size={18} style={{ verticalAlign: "-3px", marginRight: "0.4rem" }} />
              Set Up Your Access Code
            </h3>
            <p style={{ fontSize: "14px", color: "#4b5563", marginBottom: "16px" }}>
              <strong>Step 1 of 2.</strong> Create a personal <strong>6-digit code</strong>.
              After your password, this code is asked on <strong>every</strong> admin login —
              without it, nobody enters the portal.
            </p>

            <form onSubmit={handleSetup}>
              <label>New 6-Digit Code</label>
              <input
                type="text"
                value={code}
                onChange={handleCodeInput(setCode)}
                placeholder="e.g. 482913"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                required
                disabled={saving}
                style={{ fontFamily: "monospace", letterSpacing: "0.35em", textAlign: "center" }}
              />

              <label>Confirm Code</label>
              <input
                type="text"
                value={codeConfirm}
                onChange={handleCodeInput(setCodeConfirm)}
                placeholder="Repeat the 6-digit code"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                required
                disabled={saving}
                style={{ fontFamily: "monospace", letterSpacing: "0.35em", textAlign: "center" }}
              />
              <FieldError message={codeError} />

              {error && <p className="form-error">{error}</p>}

              <button type="submit" disabled={saving}>
                {saving ? "Setting Up..." : "Create Code & Continue"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h3>
              <ShieldCheck size={18} style={{ verticalAlign: "-3px", marginRight: "0.4rem" }} />
              Save Your Recovery Key
            </h3>
            <p style={{ fontSize: "14px", color: "#4b5563", marginBottom: "16px" }}>
              <strong>Step 2 of 2.</strong> This single-use key resets your password from the
              Forgot Password page — <strong>even when email is down</strong>. It is shown
              only this once.
            </p>

            <div className="otp-fallback-box" role="status">
              <p className="otp-fallback-title">
                <AlertTriangle size={14} style={{ verticalAlign: "-2px", marginRight: "0.35rem" }} />
                Save this key now — it will never be shown again:
              </p>
              <p className="otp-fallback-code">{recoveryKey}</p>
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
              </div>
            </div>

            <button type="button" onClick={handleEnter} style={{ marginTop: "16px" }}>
              Done — Enter Admin Portal
            </button>
          </>
        )}

        <div className="auth-links">
          <Link to="/">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
