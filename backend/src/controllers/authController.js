const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const crypto = require('crypto');
const { sendResetCodeEmail, sendRegistrationOtpEmail, sendNotificationEmail, isEmailConfigured } = require('../services/emailService');
const { logAudit } = require('../middleware/auditMiddleware');
const { createStaffResetRequest } = require('./passwordResetController');
const { syncOwnerLocation } = require('../utils/ownerLocation');
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

  // If the mailer is unreachable (e.g. Render blocks Gmail SMTP), fall back
  // to showing the code on screen so registration still works. Real inbox
  // delivery resumes automatically once Brevo/SMTP is working.
  let emailDeliverable = isEmailConfigured();
  if (!emailDeliverable) {
    console.warn('[registerOwner] Email not configured — using on-screen OTP fallback');
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

    if (emailDeliverable) {
      try {
        await sendRegistrationOtpEmail(normalizedEmail, otp, OTP_TTL_MINUTES);
      } catch (emailErr) {
        console.warn('Registration OTP email failed:', emailErr.message);
        console.warn('[registerOwner] Using on-screen OTP fallback');
        emailDeliverable = false;
      }
    }

    if (!emailDeliverable) {
      res.status(201).json({
        success: true,
        email: normalizedEmail,
        delivered: false,
        verification_code: otp,
        message: 'Email delivery is unavailable right now. Use the code shown on screen to verify your account.',
      });
    } else {
      res.status(201).json({
        success: true,
        email: normalizedEmail,
        delivered: true,
        message: `A 6-digit verification code was sent to ${normalizedEmail}. Enter it to activate your account. The code expires in ${OTP_TTL_MINUTES} minutes.`,
      });
    }

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
  const { email, otp, password, full_name, contact_number, address, barangay, subdivision, block, lot, gps_lat, gps_lng, gps_accuracy } = req.body;

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
    let ownerId = null;
    if (ownerRows.length > 0) {
      ownerId = ownerRows[0].id;
      await db.query(
        `UPDATE pet_owners
         SET full_name = ?, contact_number = ?, address = ?, barangay = ?,
             subdivision = ?, block = ?, lot = ?
         WHERE user_id = ?`,
        [fullName, trim(contact_number) || null, trim(address) || null, trim(barangay),
         trim(subdivision) || null, trim(block) || null, trim(lot) || null, user.id]
      );
    } else {
      const [insertRes] = await db.query(
        `INSERT INTO pet_owners (user_id, full_name, contact_number, address, barangay, subdivision, block, lot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [user.id, fullName, trim(contact_number) || null, trim(address) || null, trim(barangay),
         trim(subdivision) || null, trim(block) || null, trim(lot) || null]
      );
      ownerId = insertRes.insertId;
    }

    await syncOwnerLocation(
      ownerId,
      { address, barangay, subdivision, block, lot },
      gps_lat && gps_lng ? { latitude: gps_lat, longitude: gps_lng, accuracy_meters: gps_accuracy } : null,
    );

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

  // Same on-screen fallback as registerOwner: if the mailer is unreachable,
  // return the fresh code in the response so the user can still verify.
  let emailDeliverable = isEmailConfigured();
  if (!emailDeliverable) {
    console.warn('[resendRegistrationOtp] Email not configured — using on-screen OTP fallback');
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

    if (emailDeliverable) {
      try {
        await sendRegistrationOtpEmail(normalizedEmail, otp, OTP_TTL_MINUTES);
      } catch (emailErr) {
        console.warn('Resend OTP email failed:', emailErr.message);
        console.warn('[resendRegistrationOtp] Using on-screen OTP fallback');
        emailDeliverable = false;
      }
    }

    if (!emailDeliverable) {
      res.json({
        success: true,
        delivered: false,
        verification_code: otp,
        message: 'Email delivery is unavailable right now. Use the code shown on screen.',
      });
    } else {
      res.json({
        success: true,
        delivered: true,
        message: `A new verification code was sent to ${normalizedEmail}. It expires in ${OTP_TTL_MINUTES} minutes.`,
      });
    }

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

    // Admins get a two-step login: password first, then their personal
    // access code (PIN). No session token is issued until the code is
    // verified, so the code gate cannot be bypassed. Admins without a code
    // yet are sent to the welcome screen to create one.
    if (user.role === 'Admin') {
      const [codeRows] = await db.query('SELECT access_code_hash FROM users WHERE id = ?', [user.id]);
      const preToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, stage: 'preauth' },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({
        success: true,
        step: 'code',
        pre_token: preToken,
        has_access_code: Boolean(codeRows[0]?.access_code_hash),
        user: {
          id: user.id,
          email: user.email,
          account_id: user.account_id || null,
          role: user.role,
          full_name: user.full_name || null,
        },
      });
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

// ---- Admin access code (login PIN) helpers --------------------------------

// In-memory wrong-code counter: preToken id (jti-less, use user id) -> attempts.
// Resets on success or after 10 minutes. Blocks brute-forcing the 6-digit code.
const codeVerifyAttempts = new Map();
const CODE_MAX_ATTEMPTS = 5;
const CODE_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

function recordCodeAttempt(userId) {
  const now = Date.now();
  const entry = codeVerifyAttempts.get(userId);
  if (!entry || now - entry.firstAt > CODE_ATTEMPT_WINDOW_MS) {
    codeVerifyAttempts.set(userId, { count: 1, firstAt: now });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

function clearCodeAttempts(userId) {
  codeVerifyAttempts.delete(userId);
}

// The access code is a personal 6-digit PIN the admin creates on first login.
function validateAccessCode(code) {
  if (!/^\d{6}$/.test(String(code || '').trim())) {
    return 'Access code must be exactly 6 digits.';
  }
  return null;
}

function issueAdminToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function adminPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    account_id: user.account_id || null,
    role: user.role,
    full_name: user.full_name || null,
  };
}

// Verifies a short-lived preauth token issued by the password step of login.
// Rejects anything that is not an Admin preauth token (no bypass possible).
function verifyPreToken(preToken) {
  let payload;
  try {
    payload = jwt.verify(preToken, process.env.JWT_SECRET);
  } catch {
    return { ok: false, status: 401, message: 'Session expired. Please log in again.' };
  }
  if (!payload || payload.stage !== 'preauth' || payload.role !== 'Admin' || !payload.id) {
    return { ok: false, status: 401, message: 'Invalid session. Please log in again.' };
  }
  return { ok: true, adminId: payload.id };
}

async function loadActiveAdmin(adminId) {
  const [rows] = await db.query(
    'SELECT id, email, account_id, password, role, full_name, status, access_code_hash FROM users WHERE id = ?',
    [adminId]
  );
  const user = rows[0];
  if (!user || user.role !== 'Admin') return null;
  if (user.status !== 'active') return { inactive: true, user };
  return { user };
}

// POST /api/auth/verify-access-code  (public — needs only a valid preToken)
// Step 2 of admin login. Issues the real session token only when the code
// matches; otherwise the admin stays locked out of the portal.
async function verifyAccessCode(req, res) {
  const { pre_token, code } = req.body || {};

  const pre = verifyPreToken(pre_token);
  if (!pre.ok) {
    return res.status(pre.status).json({ success: false, message: pre.message });
  }

  try {
    const loaded = await loadActiveAdmin(pre.adminId);
    if (!loaded || loaded.inactive) {
      return res.status(401).json({ success: false, message: 'Session is no longer valid. Please log in again.' });
    }
    const user = loaded.user;

    if (!user.access_code_hash) {
      return res.status(409).json({
        success: false,
        set_code_required: true,
        message: 'No access code has been set yet. You will be asked to create one.',
      });
    }

    const codeError = validateAccessCode(code);
    if (codeError) {
      return res.status(400).json({ success: false, message: codeError });
    }

    const ok = await bcrypt.compare(String(code).trim(), user.access_code_hash);
    if (!ok) {
      const attempts = recordCodeAttempt(user.id);
      if (attempts >= CODE_MAX_ATTEMPTS) {
        clearCodeAttempts(user.id);
        return res.status(429).json({ success: false, message: 'Too many wrong attempts. Please log in again.' });
      }
      return res.status(401).json({ success: false, message: 'Access code is incorrect.' });
    }

    clearCodeAttempts(user.id);
    const token = issueAdminToken(user);
    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    res.json({ success: true, token, user: adminPublicUser(user) });

    await logAudit(req, {
      user_id: user.id,
      staff_name: user.full_name || null,
      action: 'LOGIN',
      entity_type: 'auth',
      description: `Admin "${user.full_name}" logged in (access code verified)`,
      new_value: { role: user.role, email: user.email, account_id: user.account_id || null }
    });
  } catch (error) {
    console.error('Verify access code error:', error);
    res.status(500).json({ success: false, message: 'Could not verify access code.', error: error.message });
  }
}

// POST /api/auth/admin-welcome  (public — needs only a valid preToken)
// First-login setup: creates the admin's personal access code AND generates
// their offline recovery key in one step, then issues the real session token.
// Refuses when a code already exists (use the login code step instead).
async function adminWelcomeSetup(req, res) {
  const { pre_token, code, code_confirm } = req.body || {};

  const pre = verifyPreToken(pre_token);
  if (!pre.ok) {
    return res.status(pre.status).json({ success: false, message: pre.message });
  }

  const codeError = validateAccessCode(code);
  if (codeError) {
    return res.status(400).json({ success: false, message: codeError });
  }
  if (String(code).trim() !== String(code_confirm).trim()) {
    return res.status(400).json({ success: false, message: 'Access codes do not match.' });
  }

  try {
    const loaded = await loadActiveAdmin(pre.adminId);
    if (!loaded || loaded.inactive) {
      return res.status(401).json({ success: false, message: 'Session is no longer valid. Please log in again.' });
    }
    const user = loaded.user;

    if (user.access_code_hash) {
      return res.status(409).json({ success: false, message: 'An access code is already set. Log in with your code instead.' });
    }

    const hash = await bcrypt.hash(String(code).trim(), 10);
    await db.query('UPDATE users SET access_code_hash = ? WHERE id = ?', [hash, user.id]);

    // Issue the offline recovery key right away so the admin leaves the
    // welcome screen fully equipped. Plaintext is returned ONCE.
    const plain = generateRecoveryKeyPlain();
    const keyHash = await bcrypt.hash(plain.replace(/-/g, ''), 10);
    await db.query(
      'UPDATE admin_recovery_keys SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
      [user.id]
    );
    await db.query(
      'INSERT INTO admin_recovery_keys (user_id, key_hash) VALUES (?, ?)',
      [user.id, keyHash]
    );

    const token = issueAdminToken(user);
    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    clearCodeAttempts(user.id);

    res.status(201).json({
      success: true,
      token,
      user: adminPublicUser(user),
      recovery_key: plain,
      message: 'Welcome! Your access code is set. Save your recovery key before entering the portal.',
    });

    await logAudit(req, {
      user_id: user.id,
      staff_name: user.full_name || null,
      action: 'CREATE',
      entity_type: 'admin_access_code',
      entity_id: user.id,
      description: `Admin "${user.full_name || user.email}" completed first-login setup (access code + recovery key)`
    });

    await logAudit(req, {
      user_id: user.id,
      staff_name: user.full_name || null,
      action: 'LOGIN',
      entity_type: 'auth',
      description: `Admin "${user.full_name}" logged in (first-login setup completed)`,
      new_value: { role: user.role, email: user.email, account_id: user.account_id || null }
    });
  } catch (error) {
    console.error('Admin welcome setup error:', error);
    res.status(500).json({ success: false, message: 'Could not complete setup.', error: error.message });
  }
}

// POST /api/auth/access-code  (Admin only)
// Changes the admin's personal access code from inside the portal.
// Requires the current password so a briefly-unattended session cannot swap it.
async function changeAccessCode(req, res) {
  const { current_password, code, code_confirm } = req.body || {};

  if (!trim(current_password)) {
    return validationError(res, 'Enter your current password.', { current_password: 'Enter your current password.' });
  }

  const codeError = validateAccessCode(code);
  if (codeError) {
    return validationError(res, codeError, { code: codeError });
  }
  if (String(code).trim() !== String(code_confirm).trim()) {
    return validationError(res, 'Access codes do not match.', { code_confirm: 'Access codes do not match.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, email, password, role, full_name, status FROM users WHERE id = ?',
      [req.user.id]
    );
    const user = rows[0];

    if (!user || user.role !== 'Admin' || user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'This action is for active Admin accounts only.' });
    }

    const passwordOk = user.password && await bcrypt.compare(current_password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const hash = await bcrypt.hash(String(code).trim(), 10);
    await db.query('UPDATE users SET access_code_hash = ? WHERE id = ?', [hash, user.id]);

    res.json({ success: true, message: 'Access code updated. Use it on your next login.' });

    await logAudit(req, {
      user_id: user.id,
      staff_name: user.full_name || null,
      action: 'UPDATE',
      entity_type: 'admin_access_code',
      entity_id: user.id,
      description: `Admin "${user.full_name || user.email}" changed their access code`
    });
  } catch (error) {
    console.error('Change access code error:', error);
    res.status(500).json({ success: false, message: 'Could not change access code.', error: error.message });
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

    // Clearing the access code too: an admin who reset their password sets a
    // fresh access code on the welcome screen at their next login.
    await db.query(
      `UPDATE users
       SET password = ?,
           reset_code = NULL,
           reset_code_expiry = NULL,
           reset_code_attempts = 0,
           access_code_hash = NULL
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

// POST /api/auth/change-password
// Logged-in users (any role) change their own password. Requires the
// current password — this is the everyday path so resets are rarely needed.
async function changePassword(req, res) {
  const { current_password, new_password, confirm_password } = req.body || {};

  if (!trim(current_password)) {
    return validationError(res, 'Enter your current password.', { current_password: 'Enter your current password.' });
  }

  const validation = validateAccountSetup({ password: new_password, confirmPassword: confirm_password });
  if (!validation.valid) {
    return validationError(res, validation.message, validation.errors);
  }

  try {
    const [rows] = await db.query(
      'SELECT id, email, password, role, full_name, status FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Session is no longer valid. Please log in again.' });
    }

    const user = rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account is inactive. Contact the administrator.' });
    }

    if (!user.password) {
      return res.status(400).json({ success: false, message: 'No password is set on this account yet. Use the setup or reset flow instead.' });
    }

    const currentOk = await bcrypt.compare(current_password, user.password);
    if (!currentOk) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const sameAsCurrent = await bcrypt.compare(new_password, user.password);
    if (sameAsCurrent) {
      return validationError(res, 'New password must be different from the current password.', { new_password: 'New password must be different from the current password.' });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);

    res.json({ success: true, message: 'Password changed successfully.' });

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
      entity_type: 'auth',
      entity_id: user.id,
      description: `${roleLabel(user.role)} "${user.full_name || user.email}" changed their password`
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Could not change password.', error: error.message });
  }
}

// Offline admin recovery keys (work even when email is down).
// Alphabet skips look-alikes (0/O, 1/I/L); 16 chars ~= 80 bits of entropy.
const RECOVERY_KEY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateRecoveryKeyPlain() {
  const bytes = crypto.randomBytes(16);
  let out = '';
  // NOTE: modulo the alphabet length (31), never a hardcoded 32 — index 31
  // would otherwise resolve to `undefined` and poison the key.
  for (let i = 0; i < 16; i++) out += RECOVERY_KEY_ALPHABET[bytes[i] % RECOVERY_KEY_ALPHABET.length];
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}`;
}

function normalizeRecoveryKey(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// POST /api/auth/recovery-key  (Admin only)
// Issues a single-use offline recovery key. The plaintext is returned ONCE —
// only its bcrypt hash is stored. Generating a new key invalidates any
// previous unused key.
async function generateRecoveryKey(req, res) {
  try {
    const plain = generateRecoveryKeyPlain();
    const hash = await bcrypt.hash(plain.replace(/-/g, ''), 10);

    await db.query(
      'UPDATE admin_recovery_keys SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
      [req.user.id]
    );
    await db.query(
      'INSERT INTO admin_recovery_keys (user_id, key_hash) VALUES (?, ?)',
      [req.user.id, hash]
    );

    const [rows] = await db.query(
      'SELECT created_at FROM admin_recovery_keys WHERE user_id = ? AND used_at IS NULL ORDER BY id DESC LIMIT 1',
      [req.user.id]
    );

    res.status(201).json({
      success: true,
      recovery_key: plain,
      created_at: rows[0]?.created_at || null,
      message: 'Recovery key generated. Save it somewhere safe — it is shown only once and stops working after one use.',
    });

    await logAudit(req, {
      user_id: req.user.id,
      staff_name: null,
      action: 'CREATE',
      entity_type: 'admin_recovery_key',
      entity_id: req.user.id,
      description: 'Admin generated a new offline recovery key (previous unused keys invalidated)'
    });
  } catch (error) {
    console.error('Generate recovery key error:', error);
    res.status(500).json({ success: false, message: 'Could not generate recovery key.', error: error.message });
  }
}

// GET /api/auth/recovery-key/status  (Admin only)
// Tells the UI whether an unused key exists (never returns the key itself).
async function recoveryKeyStatus(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT created_at FROM admin_recovery_keys WHERE user_id = ? AND used_at IS NULL ORDER BY id DESC LIMIT 1',
      [req.user.id]
    );
    res.json({
      success: true,
      has_active_key: rows.length > 0,
      created_at: rows[0]?.created_at || null,
    });
  } catch (error) {
    console.error('Recovery key status error:', error);
    res.status(500).json({ success: false, message: 'Could not check recovery key status.', error: error.message });
  }
}

// POST /api/auth/recover-with-key  (public — no login needed)
// Email-outage-proof admin recovery: email + single-use recovery key sets a
// new password directly, no inbox needed. Restricted to Admin accounts.
// Responses are generic so the endpoint cannot be used to enumerate accounts.
async function recoverWithKey(req, res) {
  const { email, recovery_key, new_password, confirm_password } = req.body || {};

  const validation = validateAccountSetup({ password: new_password, confirmPassword: confirm_password });
  if (!validation.valid) {
    return validationError(res, validation.message, validation.errors);
  }

  if (!isValidEmail(email) || !trim(recovery_key)) {
    return res.status(400).json({ success: false, message: 'Invalid email or recovery key.' });
  }

  const normalizedEmail = trim(email).toLowerCase();

  try {
    const [rows] = await db.query(
      'SELECT id, email, role, full_name, status FROM users WHERE email = ?',
      [normalizedEmail]
    );
    const user = rows[0];

    if (!user || user.role !== 'Admin' || user.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Invalid email or recovery key.' });
    }

    const [keys] = await db.query(
      'SELECT id, key_hash FROM admin_recovery_keys WHERE user_id = ? AND used_at IS NULL ORDER BY id DESC LIMIT 1',
      [user.id]
    );

    const candidate = normalizeRecoveryKey(recovery_key);
    let matched = null;
    if (keys.length > 0 && candidate.length === 16) {
      const ok = await bcrypt.compare(candidate, keys[0].key_hash);
      if (ok) matched = keys[0];
    }

    if (!matched) {
      console.warn(`[recoverWithKey] failed attempt for ${normalizedEmail}`);
      return res.status(400).json({ success: false, message: 'Invalid email or recovery key.' });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    // Clearing the access code too: an admin who recovered this way sets a
    // fresh access code on the welcome screen at their next login.
    await db.query('UPDATE users SET password = ?, access_code_hash = NULL WHERE id = ?', [hashed, user.id]);
    await db.query('UPDATE admin_recovery_keys SET used_at = NOW() WHERE id = ?', [matched.id]);

    res.json({
      success: true,
      message: 'Password reset successfully. You will set a new access code on your next login.',
    });

    await logAudit(req, {
      user_id: user.id,
      staff_name: user.full_name || null,
      action: 'UPDATE',
      entity_type: 'auth',
      entity_id: user.id,
      description: `${roleLabel(user.role)} "${user.full_name || user.email}" reset their password with an offline recovery key`
    });
  } catch (error) {
    console.error('Recover with key error:', error);
    res.status(500).json({ success: false, message: 'Could not reset password.', error: error.message });
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
  changePassword,
  generateRecoveryKey,
  recoveryKeyStatus,
  recoverWithKey,
  verifyAccessCode,
  adminWelcomeSetup,
  changeAccessCode,
};
