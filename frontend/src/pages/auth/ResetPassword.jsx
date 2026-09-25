import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import api from "../../services/api";
import PasswordInput from "../../components/PasswordInput";
import PasswordStrength from "../../components/PasswordStrength";
import PasswordChecklist from "../../components/PasswordChecklist";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import FieldError from "../../components/ui/FieldError";
import { validateResetPassword } from "../../utils/validation";

const RESET_CODE_TTL_SECONDS = 15 * 60;

export default function ResetPassword({ portal = "owner" }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(
    location.state?.email || searchParams.get("email") || ""
  );
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [step, setStep] = useState(1);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(RESET_CODE_TTL_SECONDS);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const navigate = useNavigate();
  const isClinicRequestFlow = portal === "staff" || portal === "veterinarian";
  const loginPath = portal === "admin" ? "/admin/login" : portal === "veterinarian" ? "/veterinarian/login" : portal === "staff" ? "/staff/login" : "/owner/login";

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");

  async function handleVerifyCode(e) {
    e.preventDefault();

    if (timeLeft <= 0) {
      setError("The reset code has expired. Please request a new one.");
      return;
    }

    setError("");
    setMessage("");
    setFieldErrors({});

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setVerifying(true);

    try {
      await api.post("/auth/verify-reset-code", { email, otp });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to verify the reset code.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (timeLeft <= 0) {
      setError("The reset code has expired. Please request a new one.");
      return;
    }

    setError("");
    setMessage("");
    setFieldErrors({});

    const validation = validateResetPassword({ email, otp, password, confirmPassword });
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setError(validation.message);
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/reset-password", {
        email,
        otp,
        password,
      });

      setMessage(res.data.message);
      setShowSuccessModal(true);
      setTimeLeft(0);

      setTimeout(() => {
        navigate(loginPath);
      }, 3000);
    } catch (err) {
      const status = err.response?.status;
      const fieldErr = err.response?.data?.fieldErrors;

      if (fieldErr) {
        setFieldErrors(fieldErr);
      } else if ([400, 410, 429].includes(status)) {
        setStep(1);
      }

      setError(
        err.response?.data?.message ||
        "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="auth-page">
        <div className="auth-graphic">
          <h2>Reset Password</h2>
          <p>
            {step === 1
              ? "Enter the 6-digit code emailed to you, then set your new password."
              : "Your code is verified. Create your new password and sign in again."}
          </p>
        </div>

        <div className="auth-box">
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate(loginPath)}
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <h3>{step === 1 ? "Verify Your Reset Code" : "Create a New Password"}</h3>

          <div className="step-indicator">
            <span className={step === 1 ? "active" : ""}>
              <CheckCircle2 size={14} /> Enter Code
            </span>
            <span className={step === 2 ? "active" : ""}>
              <CheckCircle2 size={14} /> New Password
            </span>
          </div>

          {isClinicRequestFlow && step === 1 && (
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1e40af",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "13px",
                lineHeight: 1.5,
                marginBottom: "15px",
              }}
            >
              A 6-digit code will be emailed to you after the System Administrator approves
              your reset request. The code expires in 15 minutes.
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleVerifyCode}>
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: "" }));
                }}
                required
              />
              <FieldError message={fieldErrors.email} />

              <label>OTP Code</label>
              <input
                type="text"
                name="otp"
                placeholder="Enter the 6-digit code from your email"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setFieldErrors((prev) => ({ ...prev, otp: "" }));
                }}
                inputMode="numeric"
                maxLength={6}
                required
              />
              <FieldError message={fieldErrors.otp} />

              <div
                style={{
                  marginTop: "8px",
                  marginBottom: "15px",
                  fontWeight: "600",
                  color: timeLeft <= 60 ? "#dc2626" : "#2563eb",
                }}
              >
                Code expires in: {minutes}:{seconds}
              </div>

              {error && <p className="form-error">{error}</p>}
              {message && <p className="form-success">{message}</p>}

              <button type="submit" disabled={verifying || timeLeft <= 0}>
                {verifying ? (
                  <>
                    <LoadingSpinner size={18} className="button-spinner" />
                    Verifying...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              <label>New Password</label>
              <PasswordInput
                name="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: "" }));
                }}
                placeholder="Enter new password"
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
                placeholder="Confirm new password"
              />
              <FieldError message={fieldErrors.confirmPassword} />

              {error && <p className="form-error">{error}</p>}
              {message && <p className="form-success">{message}</p>}

              <div className="auth-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setError("");
                    setStep(1);
                  }}
                >
                  <ArrowLeft size={16} style={{ marginRight: "0.3rem", verticalAlign: "-2px" }} />
                  Back
                </button>

                <button type="submit" disabled={loading || timeLeft <= 0} style={{ flex: 1 }}>
                  {loading ? (
                    <>
                      <LoadingSpinner size={18} className="button-spinner" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="signup-divider">
            <span />
            <p>
              Remembered it?
              <Link to={loginPath}> Sign In</Link>
            </p>
            <span />
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <h3>Password Reset Successful</h3>
            <p>Your password has been updated. Redirecting to login...</p>
            <div className="logout-modal-buttons">
              <button
                className="confirm-logout-btn"
                onClick={() => navigate(loginPath)}
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}