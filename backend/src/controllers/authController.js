const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const crypto = require('crypto');
const { sendResetCodeEmail, sendRegistrationOtpEmail, isEmailConfigured } = require('../services/emailService');
const { logAudit } = require('../middleware/auditMiddleware');
const {
  trim,
  isValidEmail,
  isValidOtp,
  validationError,
  validateOwnerRegistration,
  validateResetPassword,
  validateAccountSetup,
} = require('../utils/validation');

function roleLabel(role) {
  const map = { Admin: 'Admin', Staff: 'Staff', Veterinarian: 'Veterinarian', Owner: 'Pet Owner' };
  return map[role] || role || 'User';
}

const OTP_TTL_MINUTES = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 30;

function generateRegistrationOtp() {
  return String(crypto.randomInt(100000, 1000000)).padStart(6, '0');
}

function otpMatches(stored, provided) {
  const a = String(stored || '');
  const b = String(provided || '').trim();
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

// POST /api/auth/register-owner
// Public signup — only Pet Owners can self-register.
// Step 1 of 2: validates the details, creates a 'pending' account, then emails
// a 6-digit OTP. The account only becomes active after the OTP is verified
// (see verifyRegistration below). Staff/Admin/Vet accounts are created by an
// Admin (see userController).
async function registerOwner(req, res) {
  const { email, password, full_name, contact_number, address, barangay } = req.body;
  const validation = validateOwnerRegistration({ email, password, full_name, contact_number, barangay });

  if (!validation.valid) {
    return validationError(res, validation.message, validation.errors);
  }

  const normalizedEmail = trim(email).toLowerCase();

  if (!isEmailConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Email service is not configured. Please contact the administrator.',
    });
  }

  try {
    const [existing] = await db.query('SELECT id, status, role FROM users WHERE email = ?', [normalizedEmail]);

    if (existing.length > 0 && existing[0].role !== 'Owner') {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    if (existing.length > 0 && existing[0].status === 'active') {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    if (existing.length > 0 && existing[0].status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'This email is linked to an inactive account. Contact the administrator.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = trim(full_name);
    const otp = generateRegistrationOtp();
    const otpExpiry = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    let userId;
    let action;

    if (existing.length > 0) {
      // Unfinished (pending) registration — refresh its details and re-issue the code.
      userId = existing[0].id;
      await db.query(
        `UPDATE users
         SET password = ?, full_name = ?, status = 'pending',
             verify_code = ?, verify_code_expiry = ?, verify_sent_at = NOW()
         WHERE id = ?`,
        [hashedPassword, fullName, otp, otpExpiry, userId]
      );
      action = 'UPDATE';
    } else {
      const [userResult] = await db.query(
        `INSERT INTO users (role, email, password, full_name, status, verify_code, verify_code_expiry, verify_sent_at)
         VALUES ('Owner', ?, ?, ?, 'pending', ?, ?, NOW())`,
        [normalizedEmail, hashedPassword, fullName, otp, otpExpiry]
      );
      userId = userResult.insertId;
      action = 'CREATE';
    }

    try {
      await sendRegistrationOtpEmail(normalizedEmail, otp, OTP_TTL_MINUTES);
    } catch (emailErr) {
      console.warn('Registration OTP email failed:', emailErr.message);
      return res.status(502).json({
        success: false,
        message: 'We could not send the verification email. Please try again.',
      });
    }

    res.status(201).json({
      success: true,
      email: normalizedEmail,
      message: `A 6-digit verification code was sent to ${normalizedEmail}. Enter it to activate your account. The code expires in ${OTP_TTL_MINUTES} minutes.`,
    });

    await logAudit(req, {
      user_id: userId,
      staff_name: fullName,
      action,
      entity_type: 'user',
      entity_id: userId,
      description: `Pet owner registration started for "${fullName}" (${normalizedEmail}) — awaiting email verification`
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed.', error: error.message });
  }
}

// POST /api/auth/verify-registration
// Step 2 of 2: confirms the emailed OTP and activates the pending Owner
// account. The credentials used here are the ones that get stored — only the
// person who owns the email inbox can complete this step.
async function verifyRegistration(req, res) {
  const { email, otp, password, full_name, contact_number, address, barangay } = req.body;

  const validation = validateOwnerRegistration({ email, password, full_name, contact_number, barangay });
  if (!validation.valid) {
    return validationError(res, validation.message, validation.errors);
  }

  if (!isValidOtp(otp)) {
    return validationError(res, 'Enter the 6-digit code from your email.', { otp: 'Enter the 6-digit code from your email.' });
  }

  const normalizedEmail = trim(email).toLowerCase();

  try {
    const [rows] = await db.query(
      'SELECT id, status, role, verify_code, verify_code_expiry FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No pending account found with that email. Please register again.',
      });
    }

    const user = rows[0];

    if (user.role !== 'Owner') {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    if (user.status === 'active') {
      return res.status(409).json({ success: false, message: 'This account has already been verified. You may now log in.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'This email is linked to an inactive account. Contact the administrator.',
      });
    }

    if (!user.verify_code || !user.verify_code_expiry) {
      return res.status(410).json({ success: false, message: 'Your verification code has expired. Request a new code.' });
    }

    if (new Date(user.verify_code_expiry) < new Date()) {
      return res.status(410).json({ success: false, message: 'Your verification code has expired. Request a new code.' });
    }

    if (!otpMatches(user.verify_code, otp)) {
      return res.status(400).json({ success: false, message: 'Incorrect verification code. Please try again.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = trim(full_name);

    await db.query(
      `UPDATE users
       SET password = ?, full_name = ?, status = 'active',
           verify_code = NULL, verify_code_expiry = NULL, verify_sent_at = NULL
       WHERE id = ?`,
      [hashedPassword, fullName, user.id]
    );

    const [ownerRows] = await db.query('SELECT id FROM pet_owners WHERE user_id = ?', [user.id]);
    if (ownerRows.length > 0) {
      await db.query(
        `UPDATE pet_owners
         SET full_name = ?, contact_number = ?, address = ?, barangay = ?
         WHERE user_id = ?`,
        [fullName, trim(contact_number) || null, trim(address) || null, trim(barangay), user.id]
      );
    } else {
      await db.query(
        `INSERT INTO pet_owners (user_id, full_name, contact_number, address, barangay)
         VALUES (?, ?, ?, ?, ?)`,
        [user.id, fullName, trim(contact_number) || null, trim(address) || null, trim(barangay)]
      );
    }

    res.json({ success: true, message: 'Email verified. Your account is now active — you may log in.' });

    await logAudit(req, {
      user_id: user.id,
      staff_name: fullName,
      action: 'UPDATE',
      entity_type: 'user',
      entity_id: user.id,
      old_value: { status: 'pending' },
      new_value: { status: 'active' },
      description: `Pet owner "${fullName}" verified their email (${normalizedEmail}) and activated their account`
    });
  } catch (error) {
    console.error('Verify registration error:', error);
    res.status(500).json({ success: false, message: 'Verification failed.', error: error.message });
  }
}

// POST /api/auth/resend-registration-otp
// Re-emails a fresh verification code for a pending registration, throttled to
// one code every 30 seconds to prevent OTP flooding.
async function resendRegistrationOtp(req, res) {
  const email = trim(req.body.email);
  if (!isValidEmail(email)) {
    return validationError(res, 'Enter a valid email address.', { email: 'Enter a valid email address.' });
  }

  const normalizedEmail = email.toLowerCase();

  if (!isEmailConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Email service is not configured. Please contact the administrator.',
    });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, status, role, verify_sent_at FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No pending account found with that email. Please register first.' });
    }

    const user = rows[0];

    if (user.role !== 'Owner') {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    if (user.status === 'active') {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'This email is linked to an inactive account. Contact the administrator.',
      });
    }

    if (user.verify_sent_at) {
      const elapsedSeconds = (Date.now() - new Date(user.verify_sent_at).getTime()) / 1000;
      if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds} second(s) before requesting a new code.`,
          retry_after: waitSeconds,
        });
      }
    }

    const otp = generateRegistrationOtp();
    const otpExpiry = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await db.query(
      `UPDATE users
       SET verify_code = ?, verify_code_expiry = ?, verify_sent_at = NOW()
       WHERE id = ?`,
      [otp, otpExpiry, user.id]
    );

    try {
      await sendRegistrationOtpEmail(normalizedEmail, otp, OTP_TTL_MINUTES);
    } catch (emailErr) {
      console.warn('Resend OTP email failed:', emailErr.message);
      return res.status(502).json({
        success: false,
        message: 'We could not send the verification email. Please try again.',
      });
    }

    res.json({
      success: true,
      message: `A new verification code was sent to ${normalizedEmail}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    });

    await logAudit(req, {
      user_id: user.id,
      staff_name: null,
      action: 'CREATE',
      entity_type: 'user',
      entity_id: user.id,
      description: `Re-sent registration verification code to ${normalizedEmail}`
    });
  } catch (error) {
    console.error('Resend registration OTP error:', error);
    res.status(500).json({ success: false, message: 'Could not resend the verification code.', error: error.message });
  }
}

// POST /api/auth/login
// Shared login for all 3 portals — the role returned tells the frontend
// which dashboard to redirect to. Staff/Veterinarian may sign in with either
// their Account ID (e.g. STF-2026-0001) or their email.
async function login(req, res) {
  const { password } = req.body;
  const identifier = trim(req.body.identifier ?? req.body.email);

  if (!identifier || !password) {
    return res.status(400).json({ success: false, message: 'Account ID/email and password are required.' });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, email, account_id, password, role, full_name, status
       FROM users
       WHERE email = ? OR account_id = ?`,
      [identifier.toLowerCase(), identifier.toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid account ID/email or password.' });
    }

    const user = rows[0];

    if (user.status === 'pending') {
      const message = user.role === 'Owner'
        ? 'Your account is not yet verified. Check your email for the 6-digit verification code, then complete the code on the registration page.'
        : 'Your account is still pending setup. Check your email for the one-time setup link, or ask the administrator to resend it.';
      return res.status(401).json({ success: false, message });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Contact the administrator.',
      });
    }

    if (!user.password) {
      return res.status(401).json({ success: false, message: 'Invalid account ID/email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid account ID/email or password.' });
    }

    // Staff and Veterinarian accounts must have a registered full_name in the database.
    // If the account has no name set, block login to prevent incomplete accounts from accessing the portal.
    if (['Staff', 'Veterinarian'].includes(user.role) && !user.full_name?.trim()) {
      return res.status(401).json({ success: false, message: 'Your staff account has no registered name. Please contact the administrator.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        account_id: user.account_id || null,
        role: user.role,
        full_name: user.full_name || null,
      }
    });

    await logAudit(req, {
      user_id: user.id,
      staff_name: user.full_name || null,
      action: 'LOGIN',
      entity_type: 'auth',
      description: `${roleLabel(user.role)} "${user.full_name}" logged in`,
      new_value: { role: user.role, email: user.email, account_id: user.account_id || null }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed.', error: error.message });
  }
}

// GET /api/auth/setup/:token  — validates the one-time account setup link
async function getSetup(req, res) {
  const token = String(req.params.token || '').trim();
  if (!token) {
    return res.status(400).json({ success: false, message: 'Missing setup token.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, account_id, full_name, role, status, setup_token_expiry FROM users WHERE setup_token = ?',
      [token]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'This setup link is invalid or has already been used.' });
    }

    const user = rows[0];

    if (user.status === 'active') {
      return res.status(400).json({ success: false, message: 'This account has already been activated. You may now log in.' });
    }

    if (!user.setup_token_expiry || new Date(user.setup_token_expiry) < new Date()) {
      return res.status(410).json({ success: false, message: 'This setup link has expired. Ask the administrator to resend it.' });
    }

    if (user.status === 'inactive') {
      return res.status(400).json({ success: false, message: 'This account is inactive. Contact the administrator.' });
    }

    res.json({
      success: true,
      account_id: user.account_id,
      full_name: user.full_name || null,
      role: user.role,
      expires_at: user.setup_token_expiry,
    });
  } catch (error) {
    console.error('Get setup error:', error);
    res.status(500).json({ success: false, message: 'Could not validate the setup link.', error: error.message });
  }
}

// POST /api/auth/setup/:token  — sets the password and activates the account
async function completeSetup(req, res) {
  const token = String(req.params.token || '').trim();
  const { password, confirmPassword } = req.body;
  const validation = validateAccountSetup({ password, confirmPassword });

  if (!validation.valid) {
    return validationError(res, validation.message, validation.errors);
  }

  if (!token) {
    return res.status(400).json({ success: false, message: 'Missing setup token.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, account_id, full_name, role, status, setup_token_expiry FROM users WHERE setup_token = ?',
      [token]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'This setup link is invalid or has already been used.' });
    }

    const user = rows[0];

    if (user.status === 'active') {
      return res.status(400).json({ success: false, message: 'This account has already been activated. You may now log in.' });
    }

    if (!user.setup_token_expiry || new Date(user.setup_token_expiry) < new Date()) {
      return res.status(410).json({ success: false, message: 'This setup link has expired. Ask the administrator to resend it.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `UPDATE users
       SET password = ?, status = 'active', setup_token = NULL, setup_token_expiry = NULL
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    res.json({
      success: true,
      message: 'Account activated. You may now log in with your Account ID and new password.',
      account_id: user.account_id,
      role: user.role,
    });

    await logAudit(req, {
      user_id: user.id,
      staff_name: user.full_name || null,
      action: 'UPDATE',
      entity_type: 'user',
      entity_id: user.id,
      old_value: { status: 'pending' },
      new_value: { status: 'active', account_id: user.account_id || null },
      description: `Activated ${user.role} account "${user.full_name || user.account_id || user.id}" (password set)`
    });
  } catch (error) {
    console.error('Complete setup error:', error);
    res.status(500).json({ success: false, message: 'Could not complete account setup.', error: error.message });
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!trim(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email is required.',
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid email address.',
    });
  }

  try {
    const [rows] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [trim(email).toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No account found with that email.",
      });
    }

    const code = String(crypto.randomInt(100000, 1000000)).padStart(6, '0');
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.query(
      `UPDATE users
       SET reset_code = ?, reset_code_expiry = ?
       WHERE email = ?`,
      [code, expiry, trim(email).toLowerCase()]
    );

    await sendResetCodeEmail(email, code);

    res.json({
      success: true,
      message: "OTP sent to your email. Use it within 15 minutes.",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send reset OTP.",
      error: error.message,
    });
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  const { email, otp, password } = req.body;
  const validation = validateResetPassword({ email, otp, password });

  if (!validation.valid) {
    return validationError(res, validation.message, validation.errors);
  }

  try {
    const [rows] = await db.query(
      `SELECT id, full_name
       FROM users
       WHERE email = ?
       AND reset_code = ?
       AND reset_code_expiry > NOW()`,
      [trim(email).toLowerCase(), trim(otp)]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `UPDATE users
       SET password = ?,
           reset_code = NULL,
           reset_code_expiry = NULL
       WHERE id = ?`,
      [hashedPassword, rows[0].id]
    );

    res.json({
      success: true,
      message: "Password updated successfully.",
    });

    await logAudit(req, {
      user_id: rows[0].id,
      staff_name: rows[0].full_name || null,
      action: "UPDATE",
      entity_type: "user",
      entity_id: rows[0].id,
      description: `Password changed for ${trim(email).toLowerCase()}`,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Password reset failed.",
      error: error.message,
    });
  }
}

// POST /api/auth/logout
// Logs out the authenticated user and records a LOGOUT audit event.
async function logout(req, res) {
  try {
    const user = req.user || {};
    let fullName = null;

    if (user.id) {
      const [rows] = await db.query('SELECT full_name FROM users WHERE id = ?', [user.id]);
      fullName = rows[0]?.full_name || null;
    }

    await logAudit(req, {
      user_id: user.id,
      staff_name: fullName,
      action: 'LOGOUT',
      entity_type: 'auth',
      description: `${roleLabel(user.role)} "${fullName || 'Unknown'}" logged out`
    });

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Logout failed.', error: error.message });
  }
}

module.exports = {
  registerOwner,
  verifyRegistration,
  resendRegistrationOtp,
  login,
  getSetup,
  completeSetup,
  forgotPassword,
  resetPassword,
  logout,
};
