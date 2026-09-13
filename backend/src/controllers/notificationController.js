const db = require("../config/db");

// ========================================
// GET USER NOTIFICATIONS
// ========================================

async function getNotifications(req, res) {
  try {
    const [rows] = await db.query(
      `

            SELECT *

            FROM notifications

            WHERE user_id=?

            ORDER BY created_at DESC

            `,

      [req.user.id],
    );

    res.json({
      success: true,

      notifications: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
}

// ========================================
// MARK AS READ
// ========================================

async function markAsRead(req, res) {
  try {
    await db.query(
      `

            UPDATE notifications
            SET is_read=1
            WHERE id=?
            AND user_id=?

            `,

      [req.params.id, req.user.id],
    );

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
}

// ========================================
// GET UNREAD COUNT
// ========================================

async function getUnreadCount(req, res) {
  try {
    const [[count]] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM notifications
      WHERE user_id = ?
      AND is_read = 0
      `,
      [req.user.id]
    );

    res.json({
      success: true,
      unread: count.total,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// ========================================
// DELETE SINGLE NOTIFICATION
// ========================================

async function deleteNotification(req, res) {
  try {
    await db.query(
      `
      DELETE FROM notifications
      WHERE id = ?
      AND user_id = ?
      `,
      [req.params.id, req.user.id]
    );

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// ========================================
// CLEAR ALL NOTIFICATIONS
// ========================================

async function clearNotifications(req, res) {
  try {
    await db.query(
      `
      DELETE FROM notifications
      WHERE user_id = ?
      `,
      [req.user.id]
    );

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  getUnreadCount,
  deleteNotification,
  clearNotifications,
};
