import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "../../components/PasswordInput";

export default function OwnerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [verified, setVerified] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  useEffect(() => {
    if (searchParams.get('session') === 'expired') {
      setSessionExpired(true);
      // Auto-dismiss the message after 8 seconds
      const timer = setTimeout(() => setSessionExpired(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  useEffect(() => {
    if (location.state?.verified) {
      setVerified(true);
      const timer = setTimeout(() => setVerified(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSessionExpired(false);
    setVerified(false);
    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      if (res.data.user.role !== "Owner") {
        setError("This login is for Pet Owners only.");
        setLoading(false);
        return;
      }

      login(res.data.token, res.data.user);

      // Redirect back to where the user was before session expired, or default dashboard
      const returnTo = searchParams.get('returnTo');
      navigate(returnTo ? decodeURIComponent(returnTo) : "/owner/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">

      {/* LEFT SIDE */}
      <div className="auth-graphic">
        <h2>City Vet Cabuyao</h2>
        <p>
          Register, track, and manage your pet's health records online.
        </p>
      </div>

      {/* RIGHT SIDE */}
      <div className="auth-box">

        {/* Back Button */}
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <h3>Pet Owner Login</h3>

        {/* Session Expired Banner */}
        {sessionExpired && (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            color: '#92400e'
          }}>
            <Clock size={20} />
            <span>Your session has expired. Please log in again to continue.</span>
          </div>
        )}

        {/* Verified Email Banner */}
        {verified && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #34d399',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            color: '#065f46'
          }}>
            <CheckCircle2 size={20} />
            <span>Your email has been verified and your account is now active. You may log in.</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>

          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />

          <div className="forgot-password">
            <Link to="/owner/forgot-password">
              Forgot Password?
            </Link>
          </div>

          {error && (
            <p className="form-error">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

        </form>

        {/* DON'T HAVE AN ACCOUNT */}
        <div className="signup-divider">

          <span></span>

          <p>
            Don't have an account?
            <Link to="/owner/register"> Create Account</Link>
          </p>

          <span></span>

        </div>

      </div>
    </div>
  );
}
