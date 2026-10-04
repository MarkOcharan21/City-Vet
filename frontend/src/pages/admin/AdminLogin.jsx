import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Clock, LockKeyhole } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "../../components/PasswordInput";
import AdminWelcomeLanding from "./AdminWelcomeLanding";

const PRE_TOKEN_KEY = "admin_pre_token";

export default function AdminLogin() {

const [email,setEmail]=useState("");

const [password,setPassword]=useState("");

const [error,setError]=useState("");

const [loading,setLoading]=useState(false);
const [sessionExpired, setSessionExpired] = useState(false);

const [searchParams] = useSearchParams();

// Step 2 of admin login: the personal access code (PIN).
// The portal greets you with a welcome screen BEFORE the login form; a direct
// ?proceed=1 link (e.g. after session expiry) skips straight to the form.
const [stage, setStage] = useState(
  searchParams.get("proceed") ? "password" : "welcome"
);
const [code, setCode] = useState("");
const [codeError, setCodeError] = useState("");
// The last digit is shown briefly after typing, then re-masked, so the code
// stays secure but the user still gets feedback that a key was registered.
const [peek, setPeek] = useState("");
const peekTimer = useRef(null);
const submitTimer = useRef(null);

const {login}=useAuth();

const navigate=useNavigate();

useEffect(() => {
  if (searchParams.get('session') === 'expired') {
    setSessionExpired(true);
    const timer = setTimeout(() => setSessionExpired(false), 8000);
    return () => clearTimeout(timer);
  }
}, [searchParams]);

function finishLogin(token, userData) {
  sessionStorage.removeItem(PRE_TOKEN_KEY);
  login(token, userData);
  const returnTo = searchParams.get('returnTo');
  navigate(returnTo ? decodeURIComponent(returnTo) : "/admin/overview");
}

async function handleSubmit(e){

e.preventDefault();

setError("");
setSessionExpired(false);
setLoading(true);

try{

const res=await api.post("/auth/login",{

email,

password

}, { timeout: 45000, retryOnNetwork: true });

if(res.data.user.role!=="Admin"){

setError("This login is for Admins only.");

setLoading(false);

return;

}

// Two-step login: the password step returns a short-lived pre-token, NEVER
// a session token. Admins with a code proceed to step 2; those without one
// are sent to the welcome screen to create it first.
if (res.data.step === "code") {
  sessionStorage.setItem(PRE_TOKEN_KEY, res.data.pre_token);
  setLoading(false);
  if (res.data.has_access_code) {
    setStage("code");
  } else {
    navigate("/admin/setup");
  }
  return;
}

finishLogin(res.data.token, res.data.user);

}catch(err){

// No response = network/timeout (e.g. the free server is waking up) — say so
// plainly instead of the generic message.
setError(err.response?.data?.message || "Cannot reach the server. It may be waking up — wait a few seconds, then try again.");

}

finally{

setLoading(false);

}

}

async function verifyCode(codeValue) {
  setError("");
  setCodeError("");

  const preToken = sessionStorage.getItem(PRE_TOKEN_KEY);
  if (!preToken) {
    setStage("password");
    setError("Session expired. Please log in again.");
    return;
  }

  setLoading(true);
  try {
    const res = await api.post("/auth/verify-access-code", {
      pre_token: preToken,
      code: codeValue,
    }, { timeout: 45000, retryOnNetwork: true });
    finishLogin(res.data.token, res.data.user);
  } catch (err) {
    if (err.response?.status === 409 && err.response?.data?.set_code_required) {
      navigate("/admin/setup");
      return;
    }
    if (err.response?.status === 429) {
      setError(err.response?.data?.message || "Too many wrong attempts. Please log in again.");
      setStage("password");
      sessionStorage.removeItem(PRE_TOKEN_KEY);
      return;
    }
    // Wrong code: clear the field so the owner can immediately retype.
    setCode("");
    setPeek("");
    setError(err.response?.data?.message || "Cannot reach the server. It may be waking up — wait a few seconds, then try again.");
  } finally {
    setLoading(false);
  }
}

async function handleCodeSubmit(e) {
  e.preventDefault();
  if (!/^\d{6}$/.test(code)) {
    setCodeError("Enter your 6-digit access code.");
    return;
  }
  await verifyCode(code);
}

function handleCodeChange(e) {
  const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
  setCode(digits);
  setCodeError("");
  setError("");
  if (peekTimer.current) clearTimeout(peekTimer.current);
  if (submitTimer.current) clearTimeout(submitTimer.current);
  if (digits.length) {
    setPeek(digits[digits.length - 1]);
    peekTimer.current = setTimeout(() => setPeek(""), 700);
  }
  // Auto-enter the portal as soon as the full 6-digit code is typed.
  if (digits.length === 6) {
    submitTimer.current = setTimeout(() => verifyCode(digits), 500);
  }
}

function backToPassword() {
  sessionStorage.removeItem(PRE_TOKEN_KEY);
  setCode("");
  setCodeError("");
  setError("");
  setStage("password");
}

return(

stage === "welcome" ? (
  <AdminWelcomeLanding onContinue={() => { setSessionExpired(false); setStage("password"); }} />
) : (

<div className="auth-page">

<div className="auth-graphic">

<h2>Administrator Portal</h2>

<p>Manage users, reports and system configuration.</p>

</div>

<div className="auth-box">

<button
type="button"
className="back-btn"
onClick={()=> stage === "code" ? backToPassword() : navigate("/")}
>

<ArrowLeft size={20}/>

Back

</button>

<h3>Admin Login</h3>

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

{stage === "password" ? (
<form onSubmit={handleSubmit}>

<label>Email</label>

<input
type="email"
placeholder="Enter your email"
value={email}
onChange={(e)=>setEmail(e.target.value)}
autoCapitalize="none"
autoComplete="email"
required
/>

<label>Password</label>

<PasswordInput
value={password}
onChange={(e)=>setPassword(e.target.value)}
/>

<div className="forgot-password">

<Link to="/admin/forgot-password">Forgot Password?</Link>

</div>

{error && <p className="form-error">{error}</p>}

<button
type="submit"
disabled={loading}
>

{loading ? "Signing In..." : "Sign In"}

</button>

</form>
) : (
<form onSubmit={handleCodeSubmit}>

<p style={{ fontSize: "14px", color: "#4b5563", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
<LockKeyhole size={16} />
Enter your personal 6-digit access code to enter the portal.
</p>

<label>Access Code</label>
<div className="access-code-wrap">
  <input
    type="text"
    placeholder="••••••"
    value={code}
    onChange={handleCodeChange}
    inputMode="numeric"
    autoComplete="off"
    maxLength={6}
    required
    disabled={loading}
    className="access-code-input"
    aria-label="6-digit access code"
  />
  <div className="access-code-mask" aria-hidden="true">
    {Array.from({ length: 6 }).map((_, i) => {
      const ch = code[i];
      const showPeek = Boolean(ch) && i === code.length - 1 && peek === ch;
      return (
        <span key={i} className="access-code-cell">
          {showPeek ? ch : ch ? "•" : ""}
        </span>
      );
    })}
  </div>
</div>

{codeError && <p className="form-error">{codeError}</p>}
{error && <p className="form-error">{error}</p>}

<button
type="submit"
disabled={loading}
>

{loading ? "Verifying..." : "Enter Portal"}

</button>

</form>
)}

<div className="auth-links">

<Link to="/">Back to Home</Link>

</div>

</div>

</div>
)
);

}
