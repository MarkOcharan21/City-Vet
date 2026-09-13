import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../../services/api";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", { email });

      setMessage(res.data.message);
      navigate("/owner/reset-password", {
        state: { email },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send reset link.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-graphic">
        <h2>Forgot Password</h2>
        <p>Enter your email and we will send a one-time OTP code to reset your password.</p>
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
          />

          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner size={18} className="button-spinner" />
                Sending...
              </>
            ) : (
              "Send OTP"
            )}
          </button>
        </form>

        <div className="signup-divider">
          <span />
          <p>
            Remembered your password?
            <Link to="/owner/login"> Sign In</Link>
          </p>
          <span />
        </div>
      </div>
    </div>
  );
}
