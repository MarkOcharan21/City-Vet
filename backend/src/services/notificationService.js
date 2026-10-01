const db = require("../config/db");
const { sendNotificationEmail } = require("./emailService");

// Schema/table holding the connection's own objects. PostgreSQL defaults to
// "public"; MySQL ignores this and always resolves the current database.
const currentSchema = () => (db.dialect === 'postgres' ? 'public' : process.env.DB_NAME);

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
    // information_schema works on both engines, so the MySQL-only
    // SHOW COLUMNS ... LIKE introspection is not needed here.
    const [rows] = await db.query(
      `SELECT 1 AS found
         FROM information_schema.columns
        WHERE table_schema = ? AND table_name = 'notifications' AND column_name = 'link'
        LIMIT 1`,
      [currentSchema()]
    );
    hasLinkColumn = rows.length > 0;
  } catch (err) {
    // A failed probe must not break notifications, but it should be visible:
    // silently dropping the link column would look like data loss.
    console.warn('Could not detect notifications.link column:', err.message);
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
       WHERE user_id = ? AND title = ? AND DATE(created_at) = CURRENT_DATE
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
