const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const crypto = require('crypto');
const { sendResetCodeEmail } = require('../services/emailService');
const { logAudit } = require('../middleware/auditMiddleware');
const {
  trim,
  isValidEmail,
  validationError,
  validateOwnerRegistration,
  validateResetPassword,
} = require('../utils/validation');

function roleLabel(role) {
  const map = { Admin: 'Admin', Staff: 'Staff', Veterinarian: 'Veterinarian', Owner: 'Pet Owner' };
  return map[role] || role || 'User';
}

// POST /api/auth/register-owner
// Public signup — only Pet Owners can self-register.
// Staff/Admin/Vet accounts are created by an Admin (see userController).
async function registerOwner(req, res) {
  const { email, password, full_name, contact_number, address, barangay } = req.body;
  const validation = validateOwnerRegistration({ email, password, full_name, contact_number, barangay });

  if (!validation.valid) {
    return validationError(res, validation.message, validation.errors);
  }

  try {
    const normalizedEmail = trim(email).toLowerCase();
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [userResult] = await db.query(
      'INSERT INTO users (role, email, password, full_name) VALUES (?, ?, ?, ?)',
      ['Owner', normalizedEmail, hashedPassword, trim(full_name)]
    );

    try {
      await db.query(
        'INSERT INTO pet_owners (user_id, full_name, contact_number, address, barangay) VALUES (?, ?, ?, ?, ?)',
        [userResult.insertId, trim(full_name), trim(contact_number) || null, trim(address) || null, trim(barangay)]
      );
    } catch (petOwnerErr) {
      // pet_owners insert is best-effort; user account was already created
      console.warn('pet_owners insert skipped:', petOwnerErr.message);
    }

    res.status(201).json({ success: true, message: 'Account created. You may now log in.' });

    await logAudit(req, {
      user_id: userResult.insertId,
      staff_name: trim(full_name),
      action: 'CREATE',
      entity_type: 'user',
      entity_id: userResult.insertId,
      description: `Pet owner registered "${trim(full_name)}"`
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed.', error: error.message });
  }
}

// POST /api/auth/login
// Shared login for all 3 portals — the role returned tells the frontend
// which dashboard to redirect to.
async function login(req, res) {
  const { email, password } = req.body;

  if (!trim(email) || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, email, password, role, full_name, status
       FROM users
       WHERE email = ? AND status = 'active'`,
      [trim(email).toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
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

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name || null }
    });

    await logAudit(req, {
      user_id: user.id,
      staff_name: user.full_name || null,
      action: 'LOGIN',
      entity_type: 'auth',
      description: `${roleLabel(user.role)} "${user.full_name}" logged in`,
      new_value: { role: user.role, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed.', error: error.message });
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

module.exports = { registerOwner, login, forgotPassword, resetPassword, logout };
