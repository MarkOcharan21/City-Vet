const express = require("express");
const router = express.Router();

const {
  registerOwner,
  login,
  forgotPassword,
  resetPassword,
  logout,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// Register Owner
router.post("/register-owner", registerOwner);

// Login (Owner, Staff, Admin)
router.post("/login", login);

// Forgot Password
router.post("/forgot-password", forgotPassword);

// Reset Password
router.post("/reset-password", resetPassword);

// Logout (all roles) — records a LOGOUT audit event
router.post("/logout", authMiddleware, logout);

module.exports = router;