import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import api from "../../services/api";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const POLL_INTERVAL_MS = 8000;

export default function ForgotPassword({ portal = "owner" }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [declinedMessage, setDeclinedMessage] = useState("");

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

        {isClinicRequestFlow && (
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