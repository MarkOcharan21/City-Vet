import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function OwnerWelcome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("to") || "/owner/login";

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(redirectTo);
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate, redirectTo]);

  return (
    <div className="owner-welcome-page">
      <div className="owner-welcome-content">
        <div className="owner-welcome-logo-ring">
          <img
            src="/assets/cityvet-logo.jpg"
            alt="City Veterinary Office logo"
          />
        </div>
        <h1 className="owner-welcome-title">Welcome</h1>
        <p className="owner-welcome-subtitle">City Veterinary Office</p>
        <p className="owner-welcome-tagline">City of Cabuyao</p>
      </div>
      <div className="owner-welcome-progress">
        <div className="owner-welcome-progress-bar" />
      </div>
    </div>
  );
}
