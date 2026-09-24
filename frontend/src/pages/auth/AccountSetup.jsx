import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import api from "../../services/api";
import PasswordInput from "../../components/PasswordInput";
import PasswordStrength from "../../components/PasswordStrength";
import PasswordChecklist from "../../components/PasswordChecklist";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import FieldError from "../../components/ui/FieldError";
import { validateAccountSetup } from "../../utils/validation";

export default function AccountSetup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [account, setAccount] = useState(null);
  const [failedMessage, setFailedMessage] = useState("");
  const [failedSeverity, setFailedSeverity] = useState("error"); // error | expired | used

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setFailedMessage("Missing setup link. Please use the link from your email.");
      return;
    }

    api
      .get(`/auth/setup/${token}`)
      .then((res) => {
        setAccount(res.data);
        const expiry = new Date(res.data.expires_at).getTime();
        const seconds = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
        setTimeLeft(seconds);
        setLoading(false);
      })
      .catch((err) => {
        const status = err.response?.status;
        const msg = err.response?.data?.message || "Could not validate the setup link.";
        setLoading(false);
        if (status === 410) {
          setFailedSeverity("expired");
          setFailedMessage(msg);
        } else if (status === 404) {
          setFailedSeverity("used");
          setFailedMessage(msg);
        } else if (typeof msg === "string" && msg.includes("already been activated")) {
          setFailedSeverity("used");
          setFailedMessage(msg);
        } else {
          setFailedSeverity("error");
          setFailedMessage(msg);
        }
      });
  }, [token]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const validation = validateAccountSetup({ password, confirmPassword });
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setError(validation.message);
      return;
    }

    setSaving(true);
    setChecking(true);

    try {
      await api.post(`/auth/setup/${token}`, { password, confirmPassword });
      setShowSuccess(true);
    } catch (err) {
      const status = err.response?.status;
      if (status === 410) {
        setFailedSeverity("expired");
        setFailedAccountMessage(err.response?.data?.message || "This setup link has expired.");
      } else if (status === 404) {
        setFailedSeverity("used");
        setFailedAccountMessage(err.response?.data?.message || "This setup link is invalid or has already been used.");
      } else {
        setError(err.response?.data?.message || "Could not complete account setup.");
      }
    } finally {
      setSaving(false);
      setChecking(false);
    }
  }

  function setFailedAccountMessage(message) {
    setAccount(null);
    setFailedMessage(message);
  }

  const minutes = String(Math.floor((timeLeft ?? 0) / 60)).padStart(2, "0");
  const seconds = String((timeLeft ?? 0) % 60).padStart(2, "0");
  const expired = timeLeft !== null && timeLeft <= 0;

  return (
    <div className="auth-page">
      <div className="auth-graphic">
        <h2>Account Setup</h2>
        <p>Activate your Clinic account and create your password to start using the system.</p>
      </div>

      <div className="auth-box">
        <button type="button" className="back-btn" onClick={() => navigate("/")}>
          <ArrowLeft size={18} />
          Back
        </button>

        {loading ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <LoadingSpinner size={32} />
          </div>
        ) : failedMessage ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <AlertTriangle size={40} color="#d97706" style={{ marginBottom: "12px" }} />
            <h3>Setup Link Problem</h3>
            <p className="form-error" style={{ margin: "12px 0 16px" }}>
              {failedMessage}
            </p>
            <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>
              {failedSeverity === "expired"
                ? "Ask the administrator to resend your setup email — the link is only valid for 10 minutes."
                : failedSeverity === "used"
                ? "Your account has already been activated. You may log in directly."
                : "If you keep seeing this, contact the City Vet office."}
            </p>
            <Link to="/staff/login" className="btn-secondary">
              Go to Staff Login
            </Link>
          </div>
        ) : (
          <>
            <h3>Activate Your Account</h3>

            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <ShieldCheck size={18} color="#15803d" />
                <span style={{ fontWeight: "700", color: "#166534" }}>{account.account_id}</span>
              </div>
              <div style={{ fontSize: "13px", color: "#166534" }}>
                {account.full_name ? `${account.full_name} · ` : ""}
                {account.role}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
                fontSize: "13px",
                fontWeight: "600",
                color: expired ? "#dc2626" : timeLeft <= 60 ? "#d97706" : "#2563eb",
              }}
            >
              <Clock size={16} />
              {expired ? "This link has expired." : `Link expires in ${minutes}:${seconds}`}
            </div>

            <p style={{ fontSize: "14px", color: "#4b5563", marginBottom: "16px" }}>
              Create a password for your account. The account will be activated and you can log in with your
              Account ID.
            </p>

            <form onSubmit={handleSubmit}>
              <label>Password</label>
              <PasswordInput
                name="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: "" }));
                }}
                placeholder="Create a strong password"
              />
              <PasswordStrength password={password} />
              <PasswordChecklist password={password} />
              <FieldError message={fieldErrors.password} />

              <label>Confirm Password</label>
              <PasswordInput
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                placeholder="Re-enter your password"
              />
              <FieldError message={fieldErrors.confirmPassword} />

              {error && <p className="form-error">{error}</p>}

              <button type="submit" disabled={saving || expired || checking}>
                {saving ? (
                  <>
                    <LoadingSpinner size={18} className="button-spinner" />
                    Activating...
                  </>
                ) : (
                  "Activate Account"
                )}
              </button>
            </form>

            <div className="signup-divider">
              <span />
              <p>
                Already activated?
                <Link to="/staff/login"> Sign In</Link>
              </p>
              <span />
            </div>
          </>
        )}
      </div>

      {showSuccess && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <h3>Account Activated</h3>
            <p>
              Your account is now active. Sign in with your Account ID
              <strong> {account?.account_id}</strong> and your new password.
            </p>
            <div className="logout-modal-buttons">
              <button className="confirm-logout-btn" onClick={() => navigate("/staff/login")}>
                Go to Staff Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}