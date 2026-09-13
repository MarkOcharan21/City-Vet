console.log("ResetPassword Loaded");
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../../services/api";
import PasswordInput from "../../components/PasswordInput";
import PasswordStrength from "../../components/PasswordStrength";
import PasswordChecklist from "../../components/PasswordChecklist";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import FieldError from "../../components/ui/FieldError";
import { validateResetPassword } from "../../utils/validation";

export default function ResetPassword() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(160); // 2 minutes
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const navigate = useNavigate();
  useEffect(() => {
  if (timeLeft <= 0) return;

  const timer = setInterval(() => {
    setTimeLeft((prev) => prev - 1);
  }, 1000);

  return () => clearInterval(timer);
}, [timeLeft]);

const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
const seconds = String(timeLeft % 60).padStart(2, "0");

  async function handleSubmit(e) {
    e.preventDefault();

    // Check muna kung expired na ang OTP
    if (timeLeft <= 0) {
      setError("OTP has expired. Please request a new OTP.");
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
        navigate("/owner/login");
      }, 3000);
    } catch (err) {
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
          <p>Set a new password for your owner account and sign in again.</p>
        </div>

      <div className="auth-box">
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/owner/login")}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <h3>Create a New Password</h3>

        <form onSubmit={handleSubmit}>
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
                color: timeLeft <= 10 ? "#dc2626" : "#2563eb",
            }}
          >
            OTP expires in: {minutes}:{seconds}
          </div>

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

          <button type="submit" disabled={loading || timeLeft <= 0}>
            {loading ? (
              <>
                <LoadingSpinner size={18} className="button-spinner" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        <div className="signup-divider">
          <span />
          <p>
            Remembered it?
            <Link to="/owner/login"> Sign In</Link>
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
                onClick={() => navigate("/owner/login")}
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
