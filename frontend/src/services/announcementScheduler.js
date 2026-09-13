const db = require("../config/db");

const { createNotification } = require("./notificationService");

// ===========================================
// CHECK SCHEDULED ANNOUNCEMENTS
// ===========================================

async function processAnnouncements() {
  try {
    const [announcements] = await db.query(
      `
      SELECT *
      FROM announcements
      WHERE is_sent = 0
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= NOW()
      `
    );

    for (const announcement of announcements) {
      // =====================================
      // Get recipients
      // =====================================

      let sql = `
        SELECT id
        FROM users
      `;

      const params = [];

      if (
        announcement.audience &&
        announcement.audience !== "All"
      ) {
        sql += " WHERE role = ?";

        params.push(announcement.audience);
      }

      const [users] = await db.query(sql, params);

      // =====================================
      // Send notification to each user
      // =====================================

      for (const user of users) {
        await createNotification(
          user.id,
          announcement.title,
          announcement.message,
          "Announcement"
        );
      }

      // =====================================
      // Mark announcement as sent
      // =====================================

      await db.query(
        `
        UPDATE announcements
        SET
            is_sent = 1,
            sent_at = NOW()
        WHERE id = ?
        `,
        [announcement.id]
      );

      console.log(
        `Announcement #${announcement.id} delivered to ${users.length} users.`
      );
    }
  } catch (error) {
    console.error(
      "Announcement Scheduler Error:",
      error.message
    );
  }
}

// ===========================================
// START SCHEDULER
// ===========================================

function startAnnouncementScheduler() {
  console.log("Announcement Scheduler Started.");

  processAnnouncements();

  setInterval(processAnnouncements, 60000);
}

module.exports = {
  startAnnouncementScheduler,
};