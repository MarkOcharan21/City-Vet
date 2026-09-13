const bcrypt = require('bcryptjs');
const db = require('../config/db');
const {
  trim,
  validationError,
  validateStaffUserCreation,
} = require('../utils/validation');
const { logAudit } = require('../middleware/auditMiddleware');

// GET /api/users  (Admin - System Users / User Directory page)
async function getAllUsers(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.email, u.role AS role_name, u.status, u.full_name, u.created_at,
              po.contact_number, po.barangay
       FROM users u
       LEFT JOIN pet_owners po ON po.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, users: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load users.', error: error.message });
  }
}

// POST /api/users  (Admin creates a Staff/Veterinarian/Admin account)
async function createStaffUser(req, res) {
  const { full_name, email, password, role_name } = req.body;
  const validation = validateStaffUserCreation({ full_name, email, password, role_name });

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

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (role, email, password, full_name, status) VALUES (?, ?, ?, ?, ?)',
      [trim(role_name), normalizedEmail, hashedPassword, trim(full_name), 'active']
    );

    res.status(201).json({ success: true, message: `${role_name} account created.` });

    await logAudit(req, {
      action: 'CREATE',
      entity_type: 'user',
      entity_id: result.insertId,
      new_value: { full_name: trim(full_name), email: normalizedEmail, role: trim(role_name), status: 'active' },
      description: `Created ${role_name} account "${trim(full_name)}" (${normalizedEmail})`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not create account.', error: error.message });
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
  const { id } = req.params;

  try {
    const [[user]] = await db.query(
      'SELECT full_name, email, role FROM users WHERE id = ?',
      [id]
    );

    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, message: 'User deleted.' });

    await logAudit(req, {
      action: 'DELETE',
      entity_type: 'user',
      entity_id: id,
      old_value: { full_name: user?.full_name, email: user?.email, role: user?.role },
      description: `Deleted ${user?.role || 'user'} account "${user?.full_name || user?.email || id}"`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not delete user.', error: error.message });
  }
}

// GET /api/users/barangay-summary  (Admin - Barangay Dashboard)
async function getBarangaySummary(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT po.barangay, COUNT(p.id) AS total_pets
       FROM pet_owners po
       LEFT JOIN pets p ON p.pet_owner_id = po.id
       WHERE po.barangay IS NOT NULL
       GROUP BY po.barangay
       ORDER BY total_pets DESC`
    );
    res.json({ success: true, summary: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load barangay summary.', error: error.message });
  }
}

module.exports = { getAllUsers, createStaffUser, updateUserStatus, deleteUser, getBarangaySummary };
