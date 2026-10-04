import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

// Pre-login welcome for the Administrator portal — the same branded card the
// Staff and Veterinarian portals show before their login form. Shown at
// /admin/welcome and as the first stage of /admin/login ("before proceeding").
export default function AdminWelcomeLanding({ onContinue }) {
  return (
    <div className="clinic-access-page clinic-access-page--welcome">
      <header className="clinic-access-header">
        <Link to="/" className="clinic-access-brand">
          <span className="clinic-access-brand-mark">
            <img src="/assets/cityvet-logo.jpg" alt="" />
          </span>
          <span className="clinic-access-brand-copy">
            <strong>City Veterinary Office</strong>
            <small>City of Cabuyao</small>
          </span>
        </Link>
      </header>

      <main className="clinic-access-content">
        <section className="clinic-access-welcome-card" aria-labelledby="admin-welcome-title">
          <span className="clinic-access-icon">
            <ShieldCheck size={30} />
          </span>
          <span className="clinic-access-eyebrow">Administrator Portal</span>
          <h1 id="admin-welcome-title">Welcome</h1>
          <p>Enter your administrator workspace.</p>

          {onContinue ? (
            <button type="button" className="clinic-access-primary-button" onClick={onContinue}>
              Continue <ArrowRight size={18} />
            </button>
          ) : (
            <Link to="/admin/login?proceed=1" className="clinic-access-primary-button">
              Continue <ArrowRight size={18} />
            </Link>
          )}

          <Link
            to="/"
            className="clinic-access-back-link"
            style={{ marginTop: "1.5rem" }}
          >
            Back to Home
          </Link>
        </section>
      </main>
    </div>
  );
}