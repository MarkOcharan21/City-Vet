const express = require("express");
const router = express.Router();

const {
  registerOwner,
  verifyRegistration,
  resendRegistrationOtp,
  login,
  getSetup,
  completeSetup,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  logout,
  changePassword,
  generateRecoveryKey,
  recoveryKeyStatus,
  recoverWithKey,
  verifyAccessCode,
  adminWelcomeSetup,
  changeAccessCode,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { getResetRequestStatus } = require("../controllers/passwordResetController");

// Register Owner — step 1: creates a pending account and emails the OTP
router.post("/register-owner", registerOwner);

// Register Owner — step 2: verifies the emailed OTP and activates the account
router.post("/verify-registration", verifyRegistration);

// Register Owner — re-sends a fresh OTP for a pending registration
router.post("/resend-registration-otp", resendRegistrationOtp);

// Login (Owner, Staff, Admin — Staff/Vet may use Account ID or email)
router.post("/login", login);

// One-time account setup (Staff / Veterinarian password creation)
router.get("/setup/:token", getSetup);
router.post("/setup/:token", completeSetup);

// Forgot Password
router.post("/forgot-password", forgotPassword);

// Verify emailed reset code (step 1 of the guided reset form)
router.post("/verify-reset-code", verifyResetCode);

// Reset request status — polled by the staff Forgot Password page to know
// when the admin has approved (auto-redirect to the OTP step)
router.post("/reset-request-status", getResetRequestStatus);

// Reset Password
router.post("/reset-password", resetPassword);

// Logout (all roles) — records a LOGOUT audit event
router.post("/logout", authMiddleware, logout);

// Change password (logged-in users, any role) — requires the current password
router.post("/change-password", authMiddleware, changePassword);

// Offline recovery key (Admin, Staff, Veterinarian, Owner) — works even when
// email is down
const recoveryKeyRoles = ["Admin", "Staff", "Veterinarian", "Owner"];
router.post("/recovery-key", authMiddleware, requireRole(recoveryKeyRoles), generateRecoveryKey);
router.get("/recovery-key/status", authMiddleware, requireRole(recoveryKeyRoles), recoveryKeyStatus);

// Recover with key (public — no login needed)
router.post("/recover-with-key", recoverWithKey);

// Admin access code (login PIN) — two-step admin login
router.post("/verify-access-code", verifyAccessCode);
router.post("/admin-welcome", adminWelcomeSetup);
router.post("/access-code", authMiddleware, requireRole(["Admin"]), changeAccessCode);

module.exports = router;