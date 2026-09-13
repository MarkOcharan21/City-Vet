const cron = require("node-cron");
const db = require("../config/db");
const { notifyAudience } = require("../controllers/announcementController");

function startAnnouncementScheduler() {
  console.log("📢 Announcement Scheduler Started");

  cron.schedule("* * * * *", async () => {
    try {
      const [announcements] = await db.query(`
        SELECT *
        FROM announcements
        WHERE is_sent = 0
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= NOW()
      `);

      if (announcements.length === 0) {
        return;
      }

      for (const announcement of announcements) {
        await notifyAudience(
          announcement.audience,
          announcement.title,
          announcement.message,
          false,
          announcement.id
        );

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

        if (global.io) {
          global.io.emit("announcement-posted");
        }

        console.log(`📢 Scheduled announcement sent: ${announcement.title}`);
      }
    } catch (err) {
      console.error("Announcement Scheduler Error:", err.message);
    }
  });
}

module.exports = {
  startAnnouncementScheduler,
};
