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
  resetPassword,
  logout,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

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

// Reset Password
router.post("/reset-password", resetPassword);

// Logout (all roles) — records a LOGOUT audit event
router.post("/logout", authMiddleware, logout);

module.exports = router;