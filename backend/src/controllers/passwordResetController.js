const crypto = require('crypto');
const db = require('../config/db');
const { sendResetCodeEmail, sendNotificationEmail } = require('../services/emailService');
const { notifyUsersByRoles } = require('../services/notificationService');
const { logAudit } = require('../middleware/auditMiddleware');

const RESET_CODE_TTL_MINUTES = 15;
const REQUEST_RESUBMIT_COOLDOWN_SECONDS = 60;
const ALLOWED_RESET_ROLES = ['Staff', 'Veterinarian', 'Admin'];

function generateResetCode() {
  return String(crypto.randomInt(100000, 1000000)).padStart(6, '0');
}

// Direct link to the guided reset form for the requester's portal, so the
// approval email can take the staff straight to the OTP step.
function resetUrlFor(req, role) {
  const origin = (req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5178').replace(/\/$/, '');
  const path = role === 'Admin' ? '/admin/reset-password' : '/staff/reset-password';
  return `${origin}${path}`;
}

// Used by POST /api/auth/forgot-password when the account belongs to a
// Staff/Veterinarian/Admin. Instead of emailing a code right away, it queues
// a request for the Admin to approve. Returns { id } on success or
// { error: { status, message } }.
async function createStaffResetRequest(req, user) {
  const [existing] = await db.query(
    `SELECT id, status, created_at
     FROM password_reset_requests
     WHERE user_id = ? AND status IN ('pending', 'approved')
     ORDER BY id DESC
     LIMIT 1`,
    [user.id]
  );

  if (existing.length > 0) {
    const last = existing[0];
    if (last.status === 'approved') {
      return {
        error: {
          status: 409,
          message:
            'You already have an approved reset request. Check your email for the reset code, or ask the administrator to resend it.',
        },
      };
    }

    const elapsedSeconds = (Date.now() - new Date(last.created_at).getTime()) / 1000;
    if (elapsedSeconds < REQUEST_RESUBMIT_COOLDOWN_SECONDS) {
      const wait = Math.ceil(REQUEST_RESUBMIT_COOLDOWN_SECONDS - elapsedSeconds);
      return {
        error: {
          status: 429,
          message: `A request was already submitted. Please wait ${wait} second(s) before requesting another.`,
        },
      };
    }

    // Supersede the stale pending request so the admin only sees the latest one.
    await db.query(
      `UPDATE password_reset_requests
       SET status = 'denied', denied_at = NOW(), decline_reason = 'Superseded by a newer request'
       WHERE id = ?`,
      [last.id]
    );
  }

  const [result] = await db.query(
    `INSERT INTO password_reset_requests (user_id, email, status)
     VALUES (?, ?, 'pending')`,
    [user.id, user.email]
  );
  const requestId = result.insertId;

  await notifyUsersByRoles(
    ['Admin'],
    'Password Reset Request',
    `${user.full_name || user.email} (${user.account_id || user.email}) requested a password reset.`,
    'System',
    'activity-audit-trail',
    true
  );

  await logAudit(req, {
    user_id: user.id,
    staff_name: user.full_name || null,
    action: 'CREATE',
    entity_type: 'password_reset_request',
    entity_id: requestId,
    new_value: { status: 'pending', email: user.email, account_id: user.account_id || null },
    description: `${user.role} "${user.full_name || user.email}" (${user.account_id || user.email}) requested a password reset — awaiting admin approval`,
  });

  return { id: requestId };
}

// GET /api/users/reset-requests?status=pending  (Admin)
async function getResetRequests(req, res) {
  try {
    const { status } = req.query;
    const filter = ['pending', 'approved', 'denied'].includes(status) ? status : null;

    const [rows] = await db.query(
      `SELECT r.id, r.user_id, r.status, COALESCE(u.email, r.email) AS email,
              r.created_at, r.approved_at, r.denied_at, r.decline_reason,
               u.full_name, u.account_id, u.role

       FROM password_reset_requests r
       LEFT JOIN users u ON u.id = r.user_id
       ${filter ? 'WHERE r.status = ?' : ''}
       ORDER BY r.created_at DESC
       LIMIT 100`,
      filter ? [filter] : []
    );

    res.json({ success: true, requests: rows });
  } catch (error) {
    console.error('Get reset requests error:', error);
    res.status(500).json({ success: false, message: 'Could not load reset requests.', error: error.message });
  }
}

// POST /api/users/reset-requests/:id/approve  (Admin)
// Marks the request approved and auto-emails a 6-digit code to the requester.
// Re-approving an already-approved request resends a fresh code.
async function approveResetRequest(req, res) {
  const id = Number(req.params.id);

  try {
    const [[request]] = await db.query(
      'SELECT * FROM password_reset_requests WHERE id = ?',
      [id]
    );
    if (!request) {
      return res.status(404).json({ success: false, message: 'Reset request not found.' });
    }

    if (!['pending', 'approved'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: 'This request has already been declined and can no longer be approved.',
      });
    }

    const [[user]] = await db.query(
      'SELECT id, email, account_id, full_name, role, status FROM users WHERE id = ?',
      [request.user_id]
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'Requested user no longer exists.' });
    }
    if (user.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Cannot approve a reset for an inactive account.' });
    }
    if (!ALLOWED_RESET_ROLES.includes(user.role)) {
      return res.status(400).json({ success: false, message: 'Password reset requests only apply to Staff, Veterinarian, and Admin accounts.' });
    }

    const code = generateResetCode();
    const expiry = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);
    const wasPending = request.status === 'pending';

    await db.query(
      `UPDATE password_reset_requests
       SET status = 'approved', approved_by = ?, approved_at = NOW(),
           denied_by = NULL, denied_at = NULL, decline_reason = NULL
       WHERE id = ?`,
      [req.user.id, id]
    );

    await db.query(
      'UPDATE users SET reset_code = ?, reset_code_expiry = ?, reset_code_attempts = 0 WHERE id = ?',
      [code, expiry, user.id]
    );

    let emailSent = true;
    try {
      await sendResetCodeEmail(user.email, code, resetUrlFor(req, user.role));
    } catch (emailErr) {
      emailSent = false;
      console.warn('Reset code email failed:', emailErr.message);
    }

    res.json({
      success: true,
      message: emailSent
        ? `Approved. A 6-digit reset code was sent to ${user.email}. It expires in ${RESET_CODE_TTL_MINUTES} minutes.`
        : `Approved, but the reset code could not be emailed to ${user.email}. Approve again to resend.`,
      email: user.email,
      email_sent: emailSent,
    });

    await logAudit(req, {
      user_id: req.user.id,
      staff_name: req.user.full_name || null,
      action: 'APPROVE',
      entity_type: 'password_reset_request',
      entity_id: id,
      old_value: { status: request.status },
      new_value: {
        status: 'approved',
        requester: { id: user.id, name: user.full_name, email: user.email, account_id: user.account_id || null },
      },
      description: `Approved password reset for ${user.role} "${user.full_name || user.email}" (${user.account_id || user.email}) — reset code emailed${emailSent ? '' : ' (email FAILED, can resend)'}`,
    });
  } catch (error) {
    console.error('Approve reset request error:', error);
    res.status(500).json({ success: false, message: 'Could not approve the request.', error: error.message });
  }
}

// POST /api/users/reset-requests/:id/decline  (Admin)
async function declineResetRequest(req, res) {
  const id = Number(req.params.id);
  const reason = String(req.body?.reason || '').trim().slice(0, 255) || null;

  try {
    const [[request]] = await db.query(
      'SELECT * FROM password_reset_requests WHERE id = ?',
      [id]
    );
    if (!request) {
      return res.status(404).json({ success: false, message: 'Reset request not found.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be declined.',
      });
    }

    const [[user]] = await db.query(
      'SELECT id, email, account_id, full_name, role FROM users WHERE id = ?',
      [request.user_id]
    );

    await db.query(
      `UPDATE password_reset_requests
       SET status = 'denied', denied_by = ?, denied_at = NOW(), decline_reason = ?
       WHERE id = ?`,
      [req.user.id, reason, id]
    );

    let notified = true;
    if (user) {
      try {
        await sendNotificationEmail(
          user.email,
          'Password Reset Request Declined',
          `Your password reset request was declined${reason ? ` for the following reason: ${reason}` : ''}. If you believe this is a mistake, please contact the System Administrator in person.`
        );
      } catch (emailErr) {
        notified = false;
        console.warn('Decline notification email failed:', emailErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Request declined.',
      email: user?.email || null,
      email_sent: notified,
    });

    await logAudit(req, {
      user_id: req.user.id,
      staff_name: req.user.full_name || null,
      action: 'DECLINE',
      entity_type: 'password_reset_request',
      entity_id: id,
      old_value: { status: 'pending' },
      new_value: {
        status: 'denied',
        reason: reason || null,
        requester: user
          ? { id: user.id, name: user.full_name, email: user.email, account_id: user.account_id || null }
          : null,
      },
      description: `Declined password reset request from ${user?.full_name || user?.email || 'unknown user'}${reason ? ` — reason: ${reason}` : ''}`,
    });
  } catch (error) {
    console.error('Decline reset request error:', error);
    res.status(500).json({ success: false, message: 'Could not decline the request.', error: error.message });
  }
}

// POST /api/auth/reset-request-status  (public)
// Polled by the staff Forgot Password page while they wait for admin approval.
// Returns ready:true only when the latest request is approved AND the reset
// code is still valid, so the page can auto-redirect the staff to the OTP
// step. Fails safe to ready:false — never reveals the code or account details.
async function getResetRequestStatus(req, res) {
  const email = String(req.body?.email || req.query?.email || '').trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.json({ success: true, ready: false });
  }

  try {
    const [rows] = await db.query(
      `SELECT r.id, r.status, r.approved_at, r.denied_at, r.decline_reason,
              u.reset_code, u.reset_code_expiry
       FROM password_reset_requests r
       JOIN users u ON u.id = r.user_id
       WHERE LOWER(u.email) = ?
       ORDER BY r.id DESC
       LIMIT 1`,
      [email]
    );

    const latest = rows[0];
    const ready =
      latest &&
      latest.status === 'approved' &&
      latest.reset_code &&
      latest.reset_code_expiry &&
      new Date(latest.reset_code_expiry) >= new Date();

    const declined = latest && latest.status === 'denied';

    res.json({
      success: true,
      ready: Boolean(ready),
      status: latest?.status || null,
      declined: Boolean(declined),
      decline_reason: declined ? latest.decline_reason || null : null,
    });
  } catch (error) {
    console.error('Reset request status error:', error);
    res.json({ success: true, ready: false });
  }
}

module.exports = {
  createStaffResetRequest,
  getResetRequests,
  approveResetRequest,
  declineResetRequest,
  getResetRequestStatus,
};