import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import api from "../../services/api";
import PasswordInput from "../../components/PasswordInput";
import PasswordStrength from "../../components/PasswordStrength";
import PasswordChecklist from "../../components/PasswordChecklist";
import {
  CABUYAO_BARANGAYS,
  CABUYAO_POB_BARANGAYS,
} from "../../data/cabuyaoBarangays";
import FieldError from "../../components/ui/FieldError";
import { validateOwnerRegistration } from "../../utils/validation";

export default function OwnerRegister() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    contact_number: "",
    address: "",
    barangay: "",
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;
    const nextValue = name === 'full_name'
      ? value.replace(/[^A-Za-z\s.'-]/g, '')
      : value;

    setForm((prev) => ({ ...prev, [name]: nextValue }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validation = validateOwnerRegistration(form);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setError(validation.message);
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/auth/register-owner", form);

      setSuccess("Account created! Redirecting to login...");

      setTimeout(() => {
        navigate("/owner/login");
      }, 1500);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) setFieldErrors(apiErrors);
      setError(
        err.response?.data?.message || "Registration failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-graphic">
        <h2>Join City Vet Cabuyao</h2>
        <p>
          Create an account to register and manage your pets online with the
          City Veterinary Office.
        </p>
      </div>

      <div className="auth-box auth-box--register">
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/owner/login")}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="auth-register-intro">
          <h3>Create Pet Owner Account</h3>
        </div>

        <form onSubmit={handleSubmit} className="auth-register-form">
          <section className="auth-form-section">
            <p className="auth-form-section-title">Account Details</p>

            <div className="auth-field">
              <label htmlFor="full_name">Full Name</label>
              <input
                id="full_name"
                name="full_name"
                placeholder="e.g. Juan Dela Cruz"
                value={form.full_name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
              <p className="auth-field-hint">Please enter your full name.</p>
              <FieldError message={fieldErrors.full_name} />
            </div>

            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                required
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <PasswordInput
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Create a password"
              />
              <PasswordStrength password={form.password} />
              <PasswordChecklist password={form.password} />
              <FieldError message={fieldErrors.password} />
            </div>
          </section>

          <section className="auth-form-section">
            <p className="auth-form-section-title">Contact & Location</p>

            <div className="auth-field">
              <label htmlFor="contact_number">Contact Number</label>
              <input
                id="contact_number"
                type="tel"
                name="contact_number"
                placeholder="09XXXXXXXXX"
                value={form.contact_number}
                onChange={handleChange}
                inputMode="numeric"
                maxLength={11}
              />
              <FieldError message={fieldErrors.contact_number} />
            </div>

            <div className="auth-field">
              <label htmlFor="address">Address</label>
              <input
                id="address"
                name="address"
                placeholder="House No., Street"
                value={form.address}
                onChange={handleChange}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="barangay">
                <span className="auth-label-with-icon">
                  <MapPin size={15} />
                  Barangay
                </span>
              </label>
              <div className="auth-select-wrap">
                <select
                  id="barangay"
                  name="barangay"
                  value={form.barangay}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select your barangay in Cabuyao</option>
                  <optgroup label="Cabuyao Barangays">
                    {CABUYAO_BARANGAYS.map((barangay) => (
                      <option key={barangay} value={barangay}>
                        {barangay}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Poblacion">
                    {CABUYAO_POB_BARANGAYS.map((barangay) => (
                      <option key={barangay} value={barangay}>
                        {barangay}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <p className="auth-field-hint">
                Choose the barangay where you reside in Cabuyao City, Laguna.
              </p>
              <FieldError message={fieldErrors.barangay} />
            </div>
          </section>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="signup-divider">
          <span></span>
          <p>
            Already have an account?
            <Link to="/owner/login"> Log In</Link>
          </p>
          <span></span>
        </div>
      </div>
    </div>
  );
}
