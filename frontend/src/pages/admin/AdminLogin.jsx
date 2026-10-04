import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Clock, LockKeyhole } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "../../components/PasswordInput";

const PRE_TOKEN_KEY = "admin_pre_token";

export default function AdminLogin() {

const [email,setEmail]=useState("");

const [password,setPassword]=useState("");

const [error,setError]=useState("");

const [loading,setLoading]=useState(false);
const [sessionExpired, setSessionExpired] = useState(false);

// Step 2 of admin login: the personal access code (PIN).
const [stage, setStage] = useState("password");
const [code, setCode] = useState("");
const [codeError, setCodeError] = useState("");

const {login}=useAuth();

const navigate=useNavigate();
const [searchParams] = useSearchParams();

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

});

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
    navigate("/admin/welcome");
  }
  return;
}

finishLogin(res.data.token, res.data.user);

}catch(err){

setError(err.response?.data?.message || "Login failed.");

}

finally{

setLoading(false);

}

}

async function handleCodeSubmit(e) {
  e.preventDefault();
  setError("");
  setCodeError("");

  if (!/^\d{6}$/.test(code)) {
    setCodeError("Enter your 6-digit access code.");
    return;
  }

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
      code,
    });
    finishLogin(res.data.token, res.data.user);
  } catch (err) {
    if (err.response?.status === 409 && err.response?.data?.set_code_required) {
      navigate("/admin/welcome");
      return;
    }
    if (err.response?.status === 429) {
      setError(err.response?.data?.message || "Too many wrong attempts. Please log in again.");
      setStage("password");
      sessionStorage.removeItem(PRE_TOKEN_KEY);
      return;
    }
    setError(err.response?.data?.message || "Could not verify access code.");
  } finally {
    setLoading(false);
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

<input
type="text"
placeholder="••••••"
value={code}
onChange={(e)=>{ setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setCodeError(""); setError(""); }}
inputMode="numeric"
autoComplete="off"
maxLength={6}
required
disabled={loading}
style={{ fontFamily: "monospace", letterSpacing: "0.35em", textAlign: "center" }}
/>

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

);

}
