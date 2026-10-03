const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const crypto = require('crypto');
const { sendResetCodeEmail, sendRegistrationOtpEmail, sendNotificationEmail, isEmailConfigured } = require('../services/emailService');
const { logAudit } = require('../middleware/auditMiddleware');
const { createStaffResetRequest } = require('./passwordResetController');
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

const MAX_RESET_ATTEMPTS = 5;

// Direct link to the guided reset form for the requester's portal, so the
// emailed code can take the user straight to the OTP step (email pre-filled).
function resetUrlFor(req, role, email) {
  const origin = (req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5178').replace(/\/$/, '');
  const path = role === 'Admin' ? '/admin/reset-password' : role === 'Owner' ? '/owner/reset-password' : '/staff/reset-password';
  const query = email ? `?email=${encodeURIComponent(trim(email).toLowerCase())}` : '';
  return `${origin}${path}${query}`;
}

// Shared OTP validation for both reset-password (final step) and
// verify-reset-code (step 1 of the guided reset form). Applies the same
// expiry, lockout, and attempt-counting rules so counters stay in sync.
// Returns { ok: true, user } on a correct code, or
// { ok: false, status, message, remaining } after applying side effects.
async function verifyResetCodeForUser(email, otp) {
  const [rows] = await db.query(
    `SELECT id, full_name, email, reset_code, reset_code_expiry, reset_code_attempts
     FROM users
     WHERE email = ?`,
    [trim(email).toLowerCase()]
  );

  if (rows.length === 0) {
    return { ok: false, status: 400, message: 'Invalid or expired reset code.' };
  }

  const user = rows[0];

  if (!user.reset_code || !user.reset_code_expiry) {
    return { ok: false, status: 400, message: 'No active reset code. Request a new code first.' };
  }

  if (new Date(user.reset_code_expiry) < new Date()) {
    await db.query(
      'UPDATE users SET reset_code = NULL, reset_code_expiry = NULL, reset_code_attempts = 0 WHERE id = ?',
      [user.id]
    );
    return { ok: false, status: 410, message: 'Your reset code has expired. Request a new one.' };
  }

  if (Number(user.reset_code_attempts || 0) >= MAX_RESET_ATTEMPTS) {
    await db.query(
      'UPDATE users SET reset_code = NULL, reset_code_expiry = NULL, reset_code_attempts = 0 WHERE id = ?',
      [user.id]
    );
    return { ok: false, status: 429, message: 'Too many incorrect attempts. The reset code has been invalidated. Request a new code.' };
  }

  if (!otpMatches(user.reset_code, otp)) {
    const attempts = Number(user.reset_code_attempts || 0) + 1;
    const remaining = MAX_RESET_ATTEMPTS - attempts;
    const lockout = remaining <= 0;

    await db.query(
      lockout
        ? 'UPDATE users SET reset_code = NULL, reset_code_expiry = NULL, reset_code_attempts = 0 WHERE id = ?'
        : 'UPDATE users SET reset_code_attempts = ? WHERE id = ?',
      lockout ? [user.id] : [attempts, user.id]
    );

    return {
      ok: false,
      status: 400,
      message: lockout
        ? 'Too many incorrect attempts. The reset code has been invalidated. Request a new code.'
        : `Incorrect reset code. ${remaining} attempt(s) remaining.`,
      remaining,
    };
  }

  return { ok: true, user };
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
    console.log('[registerOwner] Validation failed:', validation.errors);
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
      console.log('[registerOwner] Updating existing pending user:', userId);
      await db.query(
        `UPDATE users
         SET password = ?, full_name = ?, status = 'pending',
             verify_code = ?, verify_code_expiry = ?, verify_sent_at = NOW()
         WHERE id = ?`,
        [hashedPassword, fullName, otp, otpExpiry, userId]
      );
      action = 'UPDATE';
    } else {
      console.log('[registerOwner] Creating new user:', { normalizedEmail, fullName });
      const [userResult] = await db.query(
        `INSERT INTO users (role, email, password, full_name, status, verify_code, verify_code_expiry, verify_sent_at)
         VALUES ('Owner', ?, ?, ?, 'pending', ?, ?, NOW())`,
        [normalizedEmail, hashedPassword, fullName, otp, otpExpiry]
      );
      userId = userResult.insertId;
      console.log('[registerOwner] Inserted userId:', userId);
      action = 'CREATE';
    }

    try {
      await sendRegistrationOtpEmail(normalizedEmail, otp, OTP_TTL_MINUTES);
    } catch (emailErr) {
      console.warn('Registration OTP email failed:', emailErr.message);
      return res.status(503).json({
        success: false,
        message: 'Verification email could not be sent. Please try again later or contact support.',
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
      return res.status(503).json({
        success: false,
        message: 'Verification email could not be sent. Please try again later or contact support.',
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
// Role-aware self-service:
//  - Owner / Admin accounts → a 6-digit reset code is emailed right away.
//  - Staff / Veterinarian accounts → a password reset request is queued for
//    the Admin to approve; only after approval is the code emailed (the
//    approved request invalidates this step — see resetPassword).
// The response is identical regardless of whether the email exists or what
// role it belongs to, so the endpoint cannot be used to enumerate accounts.
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

  const GENERIC_REPLY =
    'If the email matches a Staff, Veterinarian, or Admin account, a password reset request has been sent to the System Administrator for approval. For Pet Owner accounts, a reset code has been sent to the email instead.';

  try {
    const [rows] = await db.query(
      `SELECT id, email, role, status, account_id, full_name, reset_code_sent_at
       FROM users
       WHERE email = ?`,
      [trim(email).toLowerCase()]
    );

    if (rows.length === 0) {
      return res.json({ success: true, message: GENERIC_REPLY });
    }

    const user = rows[0];

    // Staff / Veterinarian → admin-gated approval workflow.
    if (user.role === 'Staff' || user.role === 'Veterinarian') {
      const result = await createStaffResetRequest(req, user);
      if (result.error) {
        const { status, message } = result.error;
        return res.status(status).json({ success: false, message });
      }

      return res.json({
        success: true,
        message:
          'Your password reset request has been sent to the System Administrator for approval. Once approved, a 6-digit reset code will be emailed to you. The code expires in 15 minutes.',
      });
    }

    // Owner / Admin → email the reset code immediately.
    if (user.status !== 'active') {
      return res.json({ success: true, message: GENERIC_REPLY });
    }

    if (user.reset_code_sent_at) {
      const elapsedSeconds = (Date.now() - new Date(user.reset_code_sent_at).getTime()) / 1000;
      if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds} second(s) before requesting another code.`,
          retry_after: waitSeconds,
        });
      }
    }

    const code = String(crypto.randomInt(100000, 1000000)).padStart(6, '0');
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.query(
      `UPDATE users
       SET reset_code = ?, reset_code_expiry = ?, reset_code_sent_at = NOW(), reset_code_attempts = 0
       WHERE id = ?`,
      [code, expiry, user.id]
    );

    try {
      await sendResetCodeEmail(user.email, code, resetUrlFor(req, user.role, user.email));
    } catch (emailErr) {
      console.warn('Reset code email failed:', emailErr.message);
      return res.status(502).json({
        success: false,
        message: 'We could not send the reset email. Please try again.',
      });
    }

    res.json({
      success: true,
      message: `A 6-digit reset code was sent to your email. It expires in 15 minutes.`,
    });

    await logAudit(req, {
      user_id: user.id,
      staff_name: user.full_name || null,
      action: 'CREATE',
      entity_type: 'password_reset_request',
      entity_id: user.id,
      description: `${roleLabel(user.role)} "${user.full_name || user.email}" requested a password reset code (self-service OTP)`,
      new_value: { email: user.email, account_id: user.account_id || null },
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to process the request.', error: error.message });
  }
}

// POST /api/auth/reset-password
// Step 2 of the guided reset flow: verifies the emailed 6-digit code (shared
// anti-brute-force rules — max 5 wrong guesses), then hashes the new password.
async function resetPassword(req, res) {
  const { email, otp, password } = req.body;
  const validation = validateResetPassword({ email, otp, password });

  if (!validation.valid) {
    return validationError(res, validation.message, validation.errors);
  }

  try {
    const result = await verifyResetCodeForUser(email, otp);

    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    const user = result.user;
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `UPDATE users
       SET password = ?,
           reset_code = NULL,
           reset_code_expiry = NULL,
           reset_code_attempts = 0
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    res.json({
      success: true,
      message: 'Password updated successfully.',
    });

    // Let the user know their password was changed (also alerts them if it was NOT them).
    sendNotificationEmail(
      user.email,
      'Password Changed',
      'Your City Vet password was changed successfully. If you did not make this change, please contact the System Administrator immediately.'
    ).catch((emailErr) =>
      console.warn('Password changed notification email failed:', emailErr.message)
    );

    await logAudit(req, {
      user_id: user.id,
      staff_name: user.full_name || null,
      action: 'UPDATE',
      entity_type: 'user',
      entity_id: user.id,
      description: `Password reset completed for ${trim(email).toLowerCase()}`,
    });
  } catch (error) {
    console.error('Password reset failed:', error);
    res.status(500).json({ success: false, message: 'Password reset failed.', error: error.message });
  }
}

// POST /api/auth/verify-reset-code
// Step 1 of the guided reset flow: checks the emailed code WITHOUT consuming
// it, so a correct code moves the user on to the new-password step. Uses the
// same lockout/expiry rules as resetPassword.
async function verifyResetCode(req, res) {
  const { email, otp } = req.body;

  if (!trim(email) || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }

  if (!isValidOtp(otp)) {
    return res.status(400).json({ success: false, message: 'Enter the 6-digit code from your email.' });
  }

  try {
    const result = await verifyResetCodeForUser(email, otp);

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
        remaining: result.remaining ?? null,
      });
    }

    res.json({
      success: true,
      message: 'Code verified. Set your new password.',
    });
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({ success: false, message: 'Could not verify the reset code.', error: error.message });
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
  verifyResetCode,
  resetPassword,
  logout,
};
