import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "../../components/PasswordInput";

const CLINIC_LOGIN_CONFIG = {
  staff: {
    role: "Staff",
    title: "Staff Login",
    graphicTitle: "Staff Access",
    description: "Manage registrations and daily clinic tasks.",
    placeholder: "e.g. STF-2026-0001 or staff@cityvet.gov.ph",
    destination: "/staff/check-in",
    forgotPath: "/staff/forgot-password",
  },
  veterinarian: {
    role: "Veterinarian",
    title: "Veterinarian Login",
    graphicTitle: "Veterinarian Access",
    description: "Access consultations, clinical records, and care tools.",
    placeholder: "e.g. VET-2026-0001 or vet@cityvet.gov.ph",
    destination: "/veterinarian/dashboard",
    forgotPath: "/veterinarian/forgot-password",
  },
};

export default function StaffLogin({ portal = "staff" }) {

  const config = CLINIC_LOGIN_CONFIG[portal] || CLINIC_LOGIN_CONFIG.staff;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
        identifier,
        password
      });

      if(res.data.user.role !== config.role){
        setError(`This login is for ${config.role} accounts only.`);
        setLoading(false);
        return;
      }

      login(res.data.token, res.data.user);

      // Clear any previous check-in session
      sessionStorage.removeItem('staff_check_in_name');
      sessionStorage.removeItem('staff_check_in_time');

      navigate(config.destination);

    }catch(err){

      setError(err.response?.data?.message || "Login failed.");

    }finally{

      setLoading(false);

    }

  }

  return(

<div className={`auth-page clinic-login-page clinic-login-page--${portal}`}>

<div className="auth-graphic">

<h2>{config.graphicTitle}</h2>

<p>{config.description}</p>

</div>

<div className="auth-box">

<button
type="button"
className="back-btn"
  onClick={()=>navigate("/clinic/roles")}
>

<ArrowLeft size={20}/>

Back

</button>

<h3>{config.title}</h3>

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

<label>Account ID or Email</label>

<input
type="text"
placeholder={config.placeholder}
value={identifier}
onChange={(e)=>setIdentifier(e.target.value)}
required
/>

<label>Password</label>

<PasswordInput
value={password}
onChange={(e)=>setPassword(e.target.value)}
/>

<div className="forgot-password">

<Link to={config.forgotPath}>Forgot Password?</Link>

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
