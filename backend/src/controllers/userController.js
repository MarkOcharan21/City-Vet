const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const {
  trim,
  validationError,
  validateStaffUserCreation,
} = require('../utils/validation');
const { nextAccountId } = require('../utils/accountIds');
const { sendAccountSetupEmail } = require('../services/emailService');
const { logAudit } = require('../middleware/auditMiddleware');

const SETUP_TOKEN_MINUTES = Number(process.env.SETUP_TOKEN_MINUTES || 10);

// The setup link emailed to new accounts should point at the frontend the
// admin is actually using (the request origin) so it works locally and in
// production without a hardcoded URL falling out of date.
function resolveFrontendUrl(req) {
  const origin = (req.headers.origin || '').replace(/\/$/, '');
  if (origin) return origin;
  return (process.env.FRONTEND_URL || 'http://localhost:5178').replace(/\/$/, '');
}

// GET /api/users  (Admin - System Users / User Directory page)
async function getAllUsers(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.email, COALESCE(u.account_id, CONCAT('ACC-', LPAD(u.id, 6, '0'))) AS account_id, u.role AS role_name, u.status, u.full_name,
              u.created_at, COALESCE(u.last_login, u.created_at) AS last_login
       FROM users u
       LEFT JOIN pet_owners po ON po.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, users: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load users.', error: error.message });
  }
}

// POST /api/users  (Admin creates a Staff/Veterinarian account — no temporary password)
async function createStaffUser(req, res) {
  const { full_name, email, role_name } = req.body;
  const validation = validateStaffUserCreation({ full_name, email, role_name });

  if (!validation.valid) {
    return validationError(res, validation.message, validation.errors);
  }

  try {
    const normalizedEmail = trim(email).toLowerCase();
    const [existing] = await db.query(
      'SELECT id, role, full_name FROM users WHERE email = ?',
      [normalizedEmail]
    );
    if (existing.length > 0) {
      const existingUser = existing[0];
      return res.status(409).json({
        success: false,
        message: `This email is already registered as a ${existingUser.role} account${existingUser.full_name ? ` for ${existingUser.full_name}` : ''}. Use a different email.`,
      });
    }

    const accountId = await nextAccountId(trim(role_name));
    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupExpiry = new Date(Date.now() + SETUP_TOKEN_MINUTES * 60 * 1000);

    const [result] = await db.query(
      `INSERT INTO users (role, email, password, full_name, status, account_id, setup_token, setup_token_expiry)
       VALUES (?, ?, NULL, ?, 'pending', ?, ?, ?)`,
      [trim(role_name), normalizedEmail, trim(full_name), accountId, setupToken, setupExpiry]
    );

    const setupUrl = `${resolveFrontendUrl(req)}/account-setup?token=${setupToken}`;
    await sendAccountSetupEmail({
      to: normalizedEmail,
      role: trim(role_name),
      accountId,
      setupUrl,
      expiresInMinutes: SETUP_TOKEN_MINUTES,
    }).catch((err) => console.warn('Setup email skipped:', err.message));

    res.status(201).json({
      success: true,
      message: `${role_name} account created. A setup link was sent to ${normalizedEmail}.`,
      account_id: accountId,
      setup_url: setupUrl,
    });

    await logAudit(req, {
      action: 'CREATE',
      entity_type: 'user',
      entity_id: result.insertId,
      new_value: {
        full_name: trim(full_name),
        email: normalizedEmail,
        role: trim(role_name),
        account_id: accountId,
        status: 'pending',
      },
      description: `Created ${role_name} account "${trim(full_name)}" (${accountId}) — pending setup`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not create account.', error: error.message });
  }
}

// POST /api/users/:id/resend-setup  (Admin resends the one-time setup email)
async function resendSetupEmail(req, res) {
  const { id } = req.params;
  try {
    const [[user]] = await db.query(
      'SELECT id, email, account_id, role, full_name, status FROM users WHERE id = ?',
      [id]
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (!['Staff', 'Veterinarian'].includes(user.role)) {
      return res.status(400).json({ success: false, message: 'Setup emails only apply to Staff and Veterinarian accounts.' });
    }

    const accountId = user.account_id || (await nextAccountId(user.role));
    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupExpiry = new Date(Date.now() + SETUP_TOKEN_MINUTES * 60 * 1000);

    await db.query(
      `UPDATE users
       SET setup_token = ?, setup_token_expiry = ?,
           account_id = COALESCE(account_id, ?), status = 'pending'
       WHERE id = ?`,
      [setupToken, setupExpiry, accountId, id]
    );

    const setupUrl = `${resolveFrontendUrl(req)}/account-setup?token=${setupToken}`;
    await sendAccountSetupEmail({
      to: user.email,
      role: user.role,
      accountId,
      setupUrl,
      expiresInMinutes: SETUP_TOKEN_MINUTES,
    }).catch((err) => console.warn('Setup email skipped:', err.message));

    res.json({
      success: true,
      message: `Setup link resent to ${user.email}.`,
      account_id: accountId,
      setup_url: setupUrl,
    });

    await logAudit(req, {
      action: 'UPDATE',
      entity_type: 'user',
      entity_id: id,
      new_value: { account_id: accountId, status: 'pending', setup_resent: true },
      description: `Resent setup link for "${user.full_name || user.email}" (${accountId})`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not resend setup email.', error: error.message });
  }
}

// PUT /api/users/:id/status  (Admin activates/deactivates a user)
async function updateUserStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be active or inactive.' });
  }

  try {
    const [[user]] = await db.query(
      'SELECT full_name, email, status FROM users WHERE id = ?',
      [id]
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await db.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: 'User status updated.' });

    await logAudit(req, {
      action: 'UPDATE',
      entity_type: 'user',
      entity_id: id,
      old_value: { status: user.status, full_name: user.full_name, email: user.email },
      new_value: { status, full_name: user.full_name, email: user.email },
      description: `Set "${user.full_name || user.email}" account to ${status}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not update user status.', error: error.message });
  }
}

// DELETE /api/users/:id  (Admin removes a user)
async function deleteUser(req, res) {
  const id = Number(req.params.id);

  try {
    const [[user]] = await db.query(
      'SELECT id, full_name, email, role FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Never let an admin delete their own account (would lock them out of the system).
    if (Number(req.user.id) === id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Keep pet/medical records intact — only remove the login account and
      // its notifications. pet_owners has no FK to users, so the owner's pets
      // and history survive as clinic records.
      await connection.query('DELETE FROM notifications WHERE user_id = ?', [id]);

      const [result] = await connection.query('DELETE FROM users WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      await connection.commit();

      res.json({
        success: true,
        message: `${user.full_name || user.email}'s account has been deleted.`,
      });

      await logAudit(req, {
        action: 'DELETE',
        entity_type: 'user',
        entity_id: id,
        old_value: { full_name: user.full_name, email: user.email, role: user.role },
        description: `Deleted ${user.role} account "${user.full_name || user.email || id}"`
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED' || error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        success: false,
        message: 'This account cannot be deleted because related records were created under it (e.g. payment records). Deactivate the account instead.',
      });
    }
    res.status(500).json({ success: false, message: 'Could not delete user.', error: error.message });
  }
}

// GET /api/users/barangay-summary  (Admin - Barangay Dashboard)
  async function getBarangaySummary(req, res) {
  try {
    const [[totalRegisteredPets]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM pets
    `);
    const [rows] = await db.query(
      `SELECT po.barangay, COUNT(p.id) AS total_pets,
              SUM(CASE WHEN LOWER(COALESCE(s.species_name, '')) = 'dog' THEN 1 ELSE 0 END) AS dogs,
              SUM(CASE WHEN LOWER(COALESCE(s.species_name, '')) = 'cat' THEN 1 ELSE 0 END) AS cats,
              SUM(CASE WHEN LOWER(COALESCE(s.species_name, '')) = 'dog' AND p.sex = 'Male' THEN 1 ELSE 0 END) AS dog_male,
              SUM(CASE WHEN LOWER(COALESCE(s.species_name, '')) = 'dog' AND p.sex = 'Female' THEN 1 ELSE 0 END) AS dog_female,
              SUM(CASE WHEN LOWER(COALESCE(s.species_name, '')) = 'cat' AND p.sex = 'Male' THEN 1 ELSE 0 END) AS cat_male,
              SUM(CASE WHEN LOWER(COALESCE(s.species_name, '')) = 'cat' AND p.sex = 'Female' THEN 1 ELSE 0 END) AS cat_female
       FROM pet_owners po
       LEFT JOIN pets p ON p.pet_owner_id = po.id
       LEFT JOIN species s ON p.species_id = s.id
       WHERE po.barangay IS NOT NULL AND po.barangay != ''
       GROUP BY po.barangay
       ORDER BY total_pets DESC`
    );
    res.json({ success: true, summary: rows, total_registered_pets: totalRegisteredPets.total });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load barangay summary.', error: error.message });
  }
}

module.exports = {
  getAllUsers,
  createStaffUser,
  resendSetupEmail,
  updateUserStatus,
  deleteUser,
  getBarangaySummary,
};
