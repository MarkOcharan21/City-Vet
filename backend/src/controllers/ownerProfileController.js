const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { CABUYAO_BARANGAYS } = require('../constants/cabuyaoBarangays');

// ─── helpers ─────────────────────────────────────────────────

function trim(v) {
  return typeof v === 'string' ? v.trim() : v;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trim(email || ''));
}

// ─── GET /api/owner/profile ───────────────────────────────────
// Returns the logged-in owner's user + pet_owners data.
async function getOwnerProfile(req, res) {
  try {
    const [[row]] = await db.query(
      `SELECT
         u.id,
         u.email,
         u.full_name,
         po.contact_number,
         po.address,
         po.barangay,
         po.emergency_contact_name,
         po.emergency_contact_number
       FROM users u
       LEFT JOIN pet_owners po ON po.user_id = u.id
       WHERE u.id = ?`,
      [req.user.id],
    );

    if (!row) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    res.json({ success: true, profile: row });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load profile.', error: error.message });
  }
}

// ─── PUT /api/owner/profile ───────────────────────────────────
// Updates name, email, contact_number, address, barangay.
async function updateOwnerProfile(req, res) {
  const {
    full_name,
    email,
    contact_number,
    address,
    barangay,
    emergency_contact_name,
    emergency_contact_number,
  } = req.body;

  // Validate
  const errors = [];
  const trimmedName = trim(full_name);
  const trimmedEmail = trim(email);

  if (!trimmedName) errors.push('Full name is required.');
  if (!trimmedEmail) errors.push('Email is required.');
  else if (!isValidEmail(trimmedEmail)) errors.push('Enter a valid email address.');
  if (barangay && !CABUYAO_BARANGAYS.includes(barangay)) errors.push('Select a valid barangay.');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  try {
    const normalizedEmail = trimmedEmail.toLowerCase();

    // Check email uniqueness (exclude self)
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [normalizedEmail, req.user.id],
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'This email is already used by another account.' });
    }

    // Update users table
    await db.query(
      'UPDATE users SET email = ?, full_name = ? WHERE id = ?',
      [normalizedEmail, trimmedName, req.user.id],
    );

    // Upsert pet_owners row (some accounts may not have one yet)
    const [poRows] = await db.query(
      'SELECT id FROM pet_owners WHERE user_id = ?',
      [req.user.id],
    );

    if (poRows.length > 0) {
      await db.query(
        `UPDATE pet_owners
         SET full_name = ?, contact_number = ?, address = ?, barangay = ?,
             emergency_contact_name = ?, emergency_contact_number = ?
         WHERE user_id = ?`,
        [
          trimmedName,
          trim(contact_number) || null,
          trim(address) || null,
          barangay || null,
          trim(emergency_contact_name) || null,
          trim(emergency_contact_number) || null,
          req.user.id,
        ],
      );
    } else {
      await db.query(
        `INSERT INTO pet_owners (user_id, full_name, contact_number, address, barangay, emergency_contact_name, emergency_contact_number)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          trimmedName,
          trim(contact_number) || null,
          trim(address) || null,
          barangay || null,
          trim(emergency_contact_name) || null,
          trim(emergency_contact_number) || null,
        ],
      );
    }

    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not update profile.', error: error.message });
  }
}

// ─── PUT /api/owner/password ──────────────────────────────────
// Verifies current password then updates to the new one.
async function updateOwnerPassword(req, res) {
  const { current_password, new_password, confirm_password } = req.body;

  const errors = [];
  if (!current_password) errors.push('Current password is required.');
  if (!new_password) errors.push('New password is required.');
  else if (new_password.length < 8) errors.push('New password must be at least 8 characters.');
  if (new_password !== confirm_password) errors.push('New passwords do not match.');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  try {
    const [[user]] = await db.query(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const matches = await bcrypt.compare(current_password, user.password);
    if (!matches) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not change password.', error: error.message });
  }
}

module.exports = { getOwnerProfile, updateOwnerProfile, updateOwnerPassword };
