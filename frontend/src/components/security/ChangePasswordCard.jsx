import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import api from "../../services/api";
import PasswordInput from "../PasswordInput";
import PasswordStrength from "../PasswordStrength";
import PasswordChecklist from "../PasswordChecklist";
import FieldError from "../ui/FieldError";
import SuccessModal from "../ui/SuccessModal";

// Shared change-password card used by every portal's security page.
// Calls the role-agnostic POST /auth/change-password (requires current password).
export default function ChangePasswordCard({ emailNote = "A confirmation email is sent if the mail service is up." }) {
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [pwMessage, setPwMessage] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  function handlePwChange(e) {
    const { name, value } = e.target;
    setPwForm((prev) => ({ ...prev, [name]: value }));
    setPwErrors((prev) => ({ ...prev, [name]: "" }));
    setPwMessage("");
  }

  async function handlePwSubmit(e) {
    e.preventDefault();
    setPwErrors({});
    setPwMessage("");

    if (!pwForm.current_password) {
      setPwErrors({ current_password: "Enter your current password." });
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwErrors({ confirm_password: "Passwords do not match." });
      return;
    }

    setSavingPw(true);
    try {
      const res = await api.post("/auth/change-password", {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
        confirm_password: pwForm.confirm_password,
      });
      setPwMessage(res.data.message || "Password changed successfully.");
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      setPwSuccess(true);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) setPwErrors(apiErrors);
      setPwMessage(err.response?.data?.message || "Could not change password.");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="form-card user-directory-card">
      <div className="form-card-header">
        <h2>
          <ShieldCheck size={18} style={{ verticalAlign: "-3px", marginRight: "0.4rem" }} />
          Change Password
        </h2>
        <p>Requires your current password. {emailNote}</p>
      </div>

      <form onSubmit={handlePwSubmit} className="validated-form">
        <div className="validated-field">
          <label htmlFor="current_password">Current Password</label>
          <PasswordInput
            name="current_password"
            value={pwForm.current_password}
            onChange={handlePwChange}
            placeholder="Enter your current password"
          />
          <FieldError message={pwErrors.current_password} />
        </div>
        <div className="validated-field">
          <label htmlFor="new_password">New Password</label>
          <PasswordInput
            name="new_password"
            value={pwForm.new_password}
            onChange={handlePwChange}
            placeholder="Create a new password"
          />
          <PasswordStrength password={pwForm.new_password} />
          <PasswordChecklist password={pwForm.new_password} />
          <FieldError message={pwErrors.new_password} />
        </div>
        <div className="validated-field">
          <label htmlFor="confirm_password">Confirm New Password</label>
          <PasswordInput
            name="confirm_password"
            value={pwForm.confirm_password}
            onChange={handlePwChange}
            placeholder="Repeat the new password"
          />
          <FieldError message={pwErrors.confirm_password} />
        </div>

        {pwMessage && !pwSuccess && <p className="form-error">{pwMessage}</p>}

        <button type="submit" className="btn-primary" disabled={savingPw}>
          {savingPw ? "Saving..." : "Change Password"}
        </button>
      </form>

      <SuccessModal
        open={pwSuccess}
        title="Password Changed!"
        message={pwMessage || "Your password was changed successfully."}
        confirmText="Done"
        onConfirm={() => {
          setPwSuccess(false);
          setPwMessage("");
        }}
      />
    </div>
  );
}
