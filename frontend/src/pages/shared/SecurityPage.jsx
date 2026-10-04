import ChangePasswordCard from "../../components/security/ChangePasswordCard";
import RecoveryKeyCard from "../../components/security/RecoveryKeyCard";

// Shared by the Staff and Veterinarian portals: change password + offline
// recovery key. Both cards call role-agnostic endpoints.
export default function SecurityPage() {
  return (
    <div className="page">
      <h1>Account Security</h1>
      <p className="page-intro">
        Change your password and keep an offline recovery key — the key resets
        your password from the Forgot Password page even when email is unavailable.
      </p>

      <ChangePasswordCard emailNote="The System Administrator is notified of password changes." />
      <RecoveryKeyCard />
    </div>
  );
}
