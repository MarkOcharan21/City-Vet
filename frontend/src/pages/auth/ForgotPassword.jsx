import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import api from "../../services/api";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import PasswordInput from "../../components/PasswordInput";

const POLL_INTERVAL_MS = 8000;

export default function ForgotPassword({ portal = "owner" }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [declinedMessage, setDeclinedMessage] = useState("");
  // Offline recovery key (works even when email is down) — all portals.
  const [useRecoveryKey, setUseRecoveryKey] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [keyDone, setKeyDone] = useState(false);

  const navigate = useNavigate();
  const pollRef = useRef(null);

  const isClinicRequestFlow = portal === "staff" || portal === "veterinarian";
  const loginPath = portal === "admin" ? "/admin/login" : portal === "veterinarian" ? "/veterinarian/login" : portal === "staff" ? "/staff/login" : "/owner/login";
  const resetPath = portal === "admin" ? "/admin/reset-password" : portal === "veterinarian" ? "/veterinarian/reset-password" : portal === "staff" ? "/staff/reset-password" : "/owner/reset-password";

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setWaitingForApproval(false);
  }

  function startPolling(submittedEmail) {
    stopPolling();
    setDeclinedMessage("");
    setWaitingForApproval(true);

    pollRef.current = setInterval(async () => {
      try {
        const res = await api.post("/auth/reset-request-status", {
          email: submittedEmail,
        });

        if (res.data?.ready) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setWaitingForApproval(false);
          navigate(resetPath, { state: { email: submittedEmail } });
        } else if (res.data?.declined) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setWaitingForApproval(false);
          setDeclinedMessage(
            res.data.decline_reason
              ? `Your password reset request was declined by the administrator: "${res.data.decline_reason}". Please contact the System Administrator to confirm your identity.`
              : "Your password reset request was declined by the administrator. Please contact the System Administrator."
          );
        }
      } catch (err) {
        // Network hiccup — keep polling on the next tick.
      }
    }, POLL_INTERVAL_MS);
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  async function handleRecoveryKeySubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/recover-with-key", {
        email,
        recovery_key: recoveryKey,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setMessage(res.data.message || "Password reset successfully. You may now log in.");
      setKeyDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

  function toggleRecoveryKey() {
    setError("");
    setMessage("");
    setDeclinedMessage("");
    setKeyDone(false);
    // Don't leave the clinic approval poll running behind the key form.
    stopPolling();
    setUseRecoveryKey((prev) => !prev);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setDeclinedMessage("");
    setLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", { email });

      setMessage(res.data.message);

      if (!isClinicRequestFlow) {
        navigate(resetPath, {
          state: { email },
        });
      } else {
        startPolling(email);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send reset request.");

      // Already approved earlier — send the staff straight to the OTP step.
      if (err.response?.status === 409 && isClinicRequestFlow) {
        navigate(resetPath, { state: { email } });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-graphic">
        <h2>Forgot Password</h2>
        <p>
          {isClinicRequestFlow
            ? "Enter your registered email. The System Administrator will be asked to approve a password reset, then a one-time code will be sent to you."
            : "Enter your email and we will send a one-time OTP code to reset your password."}
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

        <h3>Reset Your Password</h3>

        {useRecoveryKey ? (
          <form onSubmit={handleRecoveryKeySubmit}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder={portal === "admin" ? "Enter your admin email" : "Enter your email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || keyDone}
            />

            <label>Recovery Key</label>
            <input
              type="text"
              name="recovery_key"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
              required
              disabled={loading || keyDone}
              autoComplete="off"
              style={{ fontFamily: "monospace", letterSpacing: "0.08em" }}
            />

            <label>New Password</label>
            <PasswordInput
              name="new_password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Create a new password"
            />

            <label>Confirm New Password</label>
            <PasswordInput
              name="confirm_password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat the new password"
            />

            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}

            {!keyDone && (
              <button type="submit" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            )}

            {keyDone && (
              <p className="form-success" style={{ textAlign: "center" }}>
                <Link to={loginPath}>Sign In with your new password</Link>
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || waitingForApproval}
          />

          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}

          {waitingForApproval && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "8px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                color: "#92400e",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              <RefreshCw size={15} className="spin" style={{ flexShrink: 0 }} />
              <span>
                Waiting for administrator approval. You will be redirected
                automatically once a reset code is emailed to you.
              </span>
            </div>
          )}

          {declinedMessage && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              {declinedMessage}
            </div>
          )}

          <button type="submit" disabled={loading || waitingForApproval}>
            {loading ? (
              <>
                <LoadingSpinner size={18} className="button-spinner" />
                Sending...
              </>
            ) : (
              "Submit Request"
            )}
          </button>
        </form>
        )}

        {!keyDone && (
          <p
            style={{
              textAlign: "center",
              marginTop: "14px",
              marginBottom: 0,
              color: "#6B7280",
              fontSize: "14px",
            }}
          >
            {useRecoveryKey ? (
              <>
                Have an email code instead?{" "}
                <button
                  type="button"
                  onClick={toggleRecoveryKey}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "var(--color-primary)",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Use email code.
                </button>
              </>
            ) : (
              <>
                No email access?{" "}
                <button
                  type="button"
                  onClick={toggleRecoveryKey}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "var(--color-primary)",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Use recovery key instead.
                </button>
              </>
            )}
          </p>
        )}

        {isClinicRequestFlow && !useRecoveryKey && (
          <p
            style={{
              textAlign: "center",
              marginTop: "14px",
              marginBottom: 0,
              color: "#6B7280",
              fontSize: "14px",
            }}
          >
            Nakakuha ka na ba ng reset code mula sa administrator?
            <Link to={resetPath}> I-enter ito dito.</Link>
          </p>
        )}

        <div className="signup-divider">
          <span />
          <p>
            Remembered your password?
            <Link to={loginPath}> Sign In</Link>
          </p>
          <span />
        </div>
      </div>
    </div>
  );
}