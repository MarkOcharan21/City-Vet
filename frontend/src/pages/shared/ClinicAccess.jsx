import { ArrowLeft, ArrowRight, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { Link } from "react-router-dom";

function ClinicBrand() {
  return (
    <div className="clinic-access-brand">
      <span className="clinic-access-brand-mark">
        <img
          src="/assets/cityvet-logo.jpg"
          alt=""
        />
      </span>
      <span className="clinic-access-brand-copy">
        <strong>City Veterinary Office</strong>
        <small>City of Cabuyao</small>
      </span>
    </div>
  );
}

export function ClinicWelcome() {
  return (
    <div className="clinic-access-page clinic-access-page--welcome">
      <header className="clinic-access-header">
        <ClinicBrand />
      </header>

      <main className="clinic-access-content">
        <section className="clinic-access-welcome-card" aria-labelledby="clinic-welcome-title">
          <span className="clinic-access-icon">
            <ShieldCheck size={30} />
          </span>
          <span className="clinic-access-eyebrow">City Vet Portal</span>
          <h1 id="clinic-welcome-title">Welcome</h1>
          <p>Enter your City Vet workspace.</p>
          <Link to="/clinic/roles" className="clinic-access-primary-button">
            Continue <ArrowRight size={18} />
          </Link>
        </section>
      </main>
    </div>
  );
}

export function ClinicRoleSelection() {
  return (
    <div className="clinic-access-page">
      <header className="clinic-access-header">
        <ClinicBrand />
      </header>

      <main className="clinic-access-content">
        <section className="clinic-role-panel" aria-labelledby="clinic-role-title">
          <Link to="/clinic/welcome" className="clinic-access-back-link">
            <ArrowLeft size={17} /> Back
          </Link>

          <div className="clinic-role-heading">
            <span className="clinic-access-eyebrow">Access portal</span>
            <h1 id="clinic-role-title">Describe your role</h1>
            <p>Choose your City Vet workspace.</p>
          </div>

          <div className="clinic-role-grid">
            <Link
              to="/staff/login"
              className="clinic-role-card clinic-role-card--staff"
              aria-label="Continue to Staff login"
            >
              <span className="clinic-role-icon">
                <Users size={25} />
              </span>
              <span className="clinic-role-name">Staff</span>
              <span className="clinic-role-title">Staff Portal</span>
              <span className="clinic-role-description">Handle registrations and daily clinic tasks.</span>
              <span className="clinic-role-action">
                Continue <ArrowRight size={16} />
              </span>
            </Link>

            <Link
              to="/veterinarian/login"
              className="clinic-role-card clinic-role-card--veterinarian"
              aria-label="Continue to Veterinarian login"
            >
              <span className="clinic-role-icon">
                <Stethoscope size={25} />
              </span>
              <span className="clinic-role-name">Veterinarian</span>
              <span className="clinic-role-title">Veterinarian Portal</span>
              <span className="clinic-role-description">Manage consultations and veterinary records.</span>
              <span className="clinic-role-action">
                Continue <ArrowRight size={16} />
              </span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
