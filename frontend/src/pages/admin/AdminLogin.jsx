import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "../../components/PasswordInput";

export default function AdminLogin() {

const [email,setEmail]=useState("");

const [password,setPassword]=useState("");

const [error,setError]=useState("");

const [loading,setLoading]=useState(false);
const [sessionExpired, setSessionExpired] = useState(false);

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

login(res.data.token, res.data.user);

// Redirect back to where the user was, or default overview
const returnTo = searchParams.get('returnTo');
navigate(returnTo ? decodeURIComponent(returnTo) : "/admin/overview");

}catch(err){

setError(err.response?.data?.message || "Login failed.");

}

finally{

setLoading(false);

}

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
onClick={()=>navigate("/")}
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

<form onSubmit={handleSubmit}>

<label>Email</label>

<input
type="email"
placeholder="Enter your email"
value={email}
onChange={(e)=>setEmail(e.target.value)}
required
/>

<label>Password</label>

<PasswordInput
value={password}
onChange={(e)=>setPassword(e.target.value)}
/>

<div className="forgot-password">

<a href="#">Forgot Password?</a>

</div>

{error && <p className="form-error">{error}</p>}

<button
type="submit"
disabled={loading}
>

{loading ? "Signing In..." : "Sign In"}

</button>

</form>

<div className="auth-links">

<Link to="/">Back to Home</Link>

</div>

</div>

</div>

);

}
