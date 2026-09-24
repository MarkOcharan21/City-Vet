const db = require("../config/db");
const { sendNotificationEmail } = require("./emailService");

let linkColumnChecked = false;
let hasLinkColumn = false;

function buildNotificationRecord(payload) {
  return {
    id: payload.id,
    title: payload.title,
    message: payload.message,
    type: payload.type || "System",
    link: payload.link || null,
    is_read: 0,
    created_at: payload.created_at || new Date().toISOString(),
  };
}

async function ensureLinkColumnSupport() {
  if (linkColumnChecked) return hasLinkColumn;

  try {
    const [columns] = await db.query("SHOW COLUMNS FROM notifications LIKE 'link'");
    hasLinkColumn = columns.length > 0;
  } catch {
    hasLinkColumn = false;
  }

  linkColumnChecked = true;
  return hasLinkColumn;
}

async function insertNotificationRow(userId, title, message, type, link) {
  if (await ensureLinkColumnSupport()) {
    return db.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, link]
    );
  }

  return db.query(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES (?, ?, ?, ?)`,
    [userId, title, message, type]
  );
}

async function emitNotification(userId, payload) {
  const io = global.io;

  if (io) {
    io.to(`user-${userId}`).emit("new-notification", payload);
  }
}

function queueNotificationEmail(userId, title, message) {
  (async () => {
    try {
      const [[userRow]] = await db.query(
        "SELECT email FROM users WHERE id = ?",
        [userId]
      );

      if (!userRow?.email) return;

      await sendNotificationEmail(userRow.email, title, message);
    } catch (error) {
      console.warn(`Notification email failed for user ${userId}:`, error.message);
    }
  })();
}

async function createNotification(
  userId,
  title,
  message,
  type = "System",
  force = false,
  link = null
) {
  if (!force) {
    const [existing] = await db.query(
      `SELECT id FROM notifications
       WHERE user_id = ? AND title = ? AND DATE(created_at) = CURDATE()
       LIMIT 1`,
      [userId, title]
    );

    if (existing.length > 0) return null;
  }

  const [result] = await insertNotificationRow(userId, title, message, type, link);

  const payload = buildNotificationRecord({
    id: result.insertId,
    title,
    message,
    type,
    link,
  });

  await emitNotification(userId, payload);
  queueNotificationEmail(userId, title, message);

  return payload;
}

async function notifyUsersByRoles(
  roles,
  title,
  message,
  type = "System",
  link = null,
  force = false
) {
  if (!Array.isArray(roles) || roles.length === 0) return 0;

  const placeholders = roles.map(() => "?").join(", ");
  const [users] = await db.query(
    `SELECT id FROM users WHERE status = 'active' AND role IN (${placeholders})`,
    roles
  );

  for (const user of users) {
    await createNotification(user.id, title, message, type, force, link);
  }

  return users.length;
}

module.exports = {
  createNotification,
  notifyUsersByRoles,
};
