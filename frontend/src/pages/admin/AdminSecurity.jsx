import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import api from "../../services/api";
import PasswordInput from "../../components/PasswordInput";
import FieldError from "../../components/ui/FieldError";
import SuccessModal from "../../components/ui/SuccessModal";
import ChangePasswordCard from "../../components/security/ChangePasswordCard";
import RecoveryKeyCard from "../../components/security/RecoveryKeyCard";

// Admin-only: change the personal 6-digit access code (login PIN).
// Requires the current password so a briefly-unattended session cannot swap it.
function AccessCodeCard() {
  const [form, setForm] = useState({ current_password: "", code: "", code_confirm: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    // PIN fields stay strictly numeric.
    const next = name === "current_password" ? value : value.replace(/\D/g, "").slice(0, 6);
    setForm((prev) => ({ ...prev, [name]: next }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setMessage("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setMessage("");

    if (!/^\d{6}$/.test(form.code)) {
      setErrors({ code: "Access code must be exactly 6 digits." });
      return;
    }
    if (form.code !== form.code_confirm) {
      setErrors({ code_confirm: "Access codes do not match." });
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("/auth/access-code", {
        current_password: form.current_password,
        code: form.code,
        code_confirm: form.code_confirm,
      });
      setMessage(res.data.message || "Access code updated.");
      setForm({ current_password: "", code: "", code_confirm: "" });
      setSuccess(true);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) setErrors(apiErrors);
      setMessage(err.response?.data?.message || "Could not change access code.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-card user-directory-card">
      <div className="form-card-header">
        <h2>
          <LockKeyhole size={18} style={{ verticalAlign: "-3px", marginRight: "0.4rem" }} />
          Login Access Code
        </h2>
        <p>Your personal 6-digit code, asked after your password on every admin login. It cannot be removed — only changed.</p>
      </div>

      <form onSubmit={handleSubmit} className="validated-form">
        <div className="validated-field">
          <label htmlFor="ac_current_password">Current Password</label>
          <PasswordInput
            name="current_password"
            value={form.current_password}
            onChange={handleChange}
            placeholder="Enter your current password"
          />
          <FieldError message={errors.current_password} />
        </div>
        <div className="validated-field">
          <label htmlFor="ac_code">New 6-Digit Code</label>
          <input
            type="text"
            name="code"
            value={form.code}
            onChange={handleChange}
            placeholder="e.g. 482913"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            style={{ fontFamily: "monospace", letterSpacing: "0.35em", textAlign: "center" }}
          />
          <FieldError message={errors.code} />
        </div>
        <div className="validated-field">
          <label htmlFor="ac_code_confirm">Confirm New Code</label>
          <input
            type="text"
            name="code_confirm"
            value={form.code_confirm}
            onChange={handleChange}
            placeholder="Repeat the 6-digit code"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            style={{ fontFamily: "monospace", letterSpacing: "0.35em", textAlign: "center" }}
          />
          <FieldError message={errors.code_confirm} />
        </div>

        {message && !success && <p className="form-error">{message}</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Change Access Code"}
        </button>
      </form>

      <SuccessModal
        open={success}
        title="Access Code Updated!"
        message={message || "Use the new code on your next login."}
        confirmText="Done"
        onConfirm={() => {
          setSuccess(false);
          setMessage("");
        }}
      />
    </div>
  );
}

export default function AdminSecurity() {
  return (
    <div className="page">
      <h1>Account Security</h1>
      <p className="page-intro">
        Change your password, manage your login access code, and keep an offline
        recovery key — the key resets your password even when email is unavailable.
      </p>

      <ChangePasswordCard />
      <AccessCodeCard />
      <RecoveryKeyCard />
    </div>
  );
}
