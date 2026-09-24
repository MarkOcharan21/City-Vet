import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Mail, Loader } from "lucide-react";
import api from "../../services/api";
import PasswordInput from "../../components/PasswordInput";
import PasswordStrength from "../../components/PasswordStrength";
import PasswordChecklist from "../../components/PasswordChecklist";
import {
  CABUYAO_BARANGAYS,
  CABUYAO_POB_BARANGAYS,
} from "../../data/cabuyaoBarangays";
import FieldError from "../../components/ui/FieldError";
import SuccessModal from "../../components/ui/SuccessModal";
import { validateOwnerRegistration, isValidOtp } from "../../utils/validation";

const OTP_TTL_SECONDS = 300;
const RESEND_COOLDOWN_SECONDS = 30;

function formatClock(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

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
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpTimeLeft, setOtpTimeLeft] = useState(OTP_TTL_SECONDS);
  const [verified, setVerified] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (step !== 2 || otpTimeLeft <= 0) return;
    const timer = setInterval(() => setOtpTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [step, otpTimeLeft]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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
    setFieldErrors({});

    const validation = validateOwnerRegistration(form);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setError(validation.message);
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post("/auth/register-owner", form);

      setOtpMessage(res.data.message || "A verification code was sent to your email.");
      setOtp("");
      setOtpError("");
      setOtpTimeLeft(OTP_TTL_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setStep(2);
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

  async function handleVerify(e) {
    e.preventDefault();
    setOtpError("");
    setOtpMessage("");

    if (!isValidOtp(otp)) {
      setOtpError("Enter the 6-digit code from your email.");
      return;
    }

    if (otpTimeLeft <= 0) {
      setOtpError("Your code has expired. Request a new one.");
      return;
    }

    setVerifying(true);

    try {
      const res = await api.post("/auth/verify-registration", { ...form, otp });

      setVerified(true);
      setOtpMessage(res.data.message || "Email verified. Your account is now active.");
    } catch (err) {
      const status = err.response?.status;
      if (status === 410) {
        setOtpError("Your code has expired. Request a new one.");
        setOtpTimeLeft(0);
      } else {
        setOtpError(err.response?.data?.message || "Verification failed. Please try again.");
      }
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending) return;

    setResending(true);
    setOtpError("");
    setOtpMessage("");

    try {
      const res = await api.post("/auth/resend-registration-otp", { email: form.email });

      setOtp("");
      setOtpTimeLeft(OTP_TTL_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtpMessage(res.data.message || "A new verification code was sent to your email.");
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        const wait = err.response?.data?.retry_after;
        if (typeof wait === "number" && wait > 0) setResendCooldown(wait);
        setOtpError(err.response?.data?.message || "Please wait a moment before requesting a new code.");
      } else {
        setOtpError(err.response?.data?.message || "Could not resend the code. Please try again.");
      }
    } finally {
      setResending(false);
    }
  }

  function goBackToForm() {
    setStep(1);
    setOtp("");
    setOtpError("");
    setOtpMessage("");
    setVerified(false);
  }

  function handleSuccessConfirm() {
    navigate("/owner/login", { state: { verified: true } });
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
          onClick={() => (step === 1 ? navigate("/owner/login") : goBackToForm())}
        >
          <ArrowLeft size={18} />
          {step === 1 ? "Back" : "Change Email"}
        </button>

        {step === 1 ? (
          <>
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

              <button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader size={18} className="spinner button-spinner" />
                    Sending Code...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="auth-register-intro auth-otp-head">
              <h3>Verify Your Email</h3>
              <p className="auth-otp-subtitle">
                Enter the 6-digit code we sent to your email to activate your
                account.
              </p>
            </div>

            <div className="auth-otp-email">
              <Mail size={15} />
              <span>{form.email.toLowerCase()}</span>
            </div>

            <form onSubmit={handleVerify} className="auth-register-form auth-otp-form">
              <div className="auth-field auth-field--otp">
                <label htmlFor="otp">Verification Code</label>
                <input
                  id="otp"
                  type="text"
                  name="otp"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setOtpError("");
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                />
                {!verified && (
                  <p className={`otp-timer${otpTimeLeft <= 0 ? " is-expired" : ""}`}>
                    {otpTimeLeft <= 0
                      ? "This code has expired — request a new one."
                      : `Code expires in ${formatClock(otpTimeLeft)}`}
                  </p>
                )}
                <FieldError message={otpError} />
              </div>

              {otpMessage && <p className="form-success">{otpMessage}</p>}

              <button type="submit" disabled={verifying || verified || otpTimeLeft <= 0}>
                {verifying ? (
                  <>
                    <Loader size={18} className="spinner button-spinner" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Activate Account"
                )}
              </button>

              <div className="auth-otp-resend-row">
                <button
                  type="button"
                  className="auth-otp-resend"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || resending || verified}
                >
                  {resending ? "Sending..." : resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Resend code"}
                </button>
              </div>
            </form>
          </>
        )}

        <div className="signup-divider">
          <span></span>
          <p>
            Already have an account?
            <Link to="/owner/login"> Log In</Link>
          </p>
          <span></span>
        </div>
      </div>

      <SuccessModal
        open={verified}
        title="Account Created Successfully!"
        message="Your account is now active. Click the button below to log in with your email and password."
        confirmText="Log In Account"
        onConfirm={handleSuccessConfirm}
      />
    </div>
  );
}