const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const { createNotification } = require("../services/notificationService");
const { uploadLocalFile, isAbsoluteUrl } = require("../utils/cloudUpload");
const { logAudit } = require("../middleware/auditMiddleware");

// ======================================
// HELPERS
// ======================================

async function getUsersByAudience(audience) {
  let sql = `SELECT id FROM users WHERE 1=1`;
  const params = [];

  if (audience && audience !== "All") {
    sql += " AND role = ?";
    params.push(audience);
  }

  const [users] = await db.query(sql, params);
  return users;
}

async function notifyAudience(audience, title, message, force = false, announcementId = null) {
  const users = await getUsersByAudience(audience);
  const link = announcementId ? `announcement:${announcementId}` : null;

  for (const user of users) {
    await createNotification(user.id, title, message, "Announcement", force, link);
  }

  return users.length;
}

// Delete old image file from disk if it exists
function deleteImageFile(imagePath) {
  if (!imagePath) return;
  // imagePath stored as "/uploads/announcements/filename.jpg"
  // __dirname is backend/src/controllers
  // The actual file is at: backend/uploads/announcements/filename.jpg
  const abs = path.join(__dirname, "../../uploads", imagePath.replace("/uploads", ""));
  if (fs.existsSync(abs)) {
    fs.unlinkSync(abs);
  }
}

// ======================================
// GET ANNOUNCEMENTS
// ======================================

async function getAnnouncements(req, res) {
  try {
    let sql = `
      SELECT
        a.*,
        COALESCE(u.full_name, po.full_name, u.email) AS created_by_name
      FROM announcements a
      LEFT JOIN users u
        ON a.created_by = u.id
      LEFT JOIN pet_owners po
        ON po.user_id = u.id
    `;

    if (req.user.role === "Owner") {
      // Pet owners only see posts targeted at All or Owner
      sql += " WHERE a.audience IN ('All','Owner')";
    } else if (req.user.role === "Staff") {
      // Staff only see posts targeted at All or Staff
      sql += " WHERE a.audience IN ('All','Staff')";
    } else if (req.user.role === "Veterinarian") {
      // Vets only see posts targeted at All, Staff, or Veterinarian
      sql += " WHERE a.audience IN ('All','Staff','Veterinarian')";
    }
    // Admin sees everything — no WHERE clause

    sql += " ORDER BY a.created_at DESC";

    const [rows] = await db.query(sql);

    res.json({ success: true, announcements: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ======================================
// CREATE ANNOUNCEMENT
// ======================================

async function createAnnouncement(req, res) {
  try {
    const { title, message, audience, scheduled_at } = req.body;

    if (!title || !message) {
      // Clean up uploaded file if validation fails
      if (req.file) deleteImageFile(`/uploads/announcements/${req.file.filename}`);
      return res.status(400).json({
        success: false,
        message: "Title and message are required.",
      });
    }

    let imagePath = req.file ? `/uploads/announcements/${req.file.filename}` : null;
    if (req.file) {
      try {
        const abs = path.join(__dirname, "../../uploads/announcements", req.file.filename);
        const uploaded = await uploadLocalFile(abs, "pet-vet/announcements");
        if (isAbsoluteUrl(uploaded)) imagePath = uploaded;
      } catch (_) {}
    }

    const isScheduled =
      scheduled_at && new Date(scheduled_at) > new Date();

    const [result] = await db.query(
      `INSERT INTO announcements
        (title, message, image, audience, scheduled_at, is_sent, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        message,
        imagePath,
        audience || "All",
        scheduled_at || null,
        isScheduled ? 0 : 1,
        req.user.id,
      ]
    );

    if (!isScheduled) {
      const notifiedCount = await notifyAudience(
        audience || "All",
        title,
        message,
        false,
        result.insertId
      );

      await db.query(
        "UPDATE announcements SET sent_at = NOW() WHERE id = ?",
        [result.insertId]
      );

      if (global.io) global.io.emit("announcement-posted");

      await logAudit(req, {
        action: 'CREATE',
        entity_type: 'announcement',
        entity_id: result.insertId,
        new_value: { title, audience: audience || 'All', is_sent: 1 },
        description: `Announcement "${title}" published (audience: ${audience || 'All'}, ${notifiedCount} notified)`
      });

      return res.status(201).json({
        success: true,
        message: `Announcement published. ${notifiedCount} user(s) notified.`,
        notifiedCount,
      });
    }

    if (global.io) global.io.emit("announcement-posted");

    res.status(201).json({
      success: true,
      message: "Announcement scheduled successfully.",
    });

    await logAudit(req, {
      action: 'CREATE',
      entity_type: 'announcement',
      entity_id: result.insertId,
      new_value: { title, audience: audience || 'All', is_sent: isScheduled ? 0 : 1 },
      description: `Announcement "${title}" created (audience: ${audience || 'All'})`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ======================================
// UPDATE ANNOUNCEMENT
// ======================================

async function updateAnnouncement(req, res) {
  try {
    const { title, message, audience, scheduled_at } = req.body;

    // Fetch the current record (old audience + image path)
    const [[existing]] = await db.query(
      "SELECT image, is_sent, audience AS old_audience, title AS old_title FROM announcements WHERE id = ?",
      [req.params.id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: "Announcement not found." });
    }

    let imagePath = existing.image;
    const oldAudience = existing.old_audience;
    const oldTitle    = existing.old_title;

    if (req.file) {
      if (imagePath) deleteImageFile(imagePath);
      imagePath = `/uploads/announcements/${req.file.filename}`;
      try {
        const abs = path.join(__dirname, "../../uploads/announcements", req.file.filename);
        const uploaded = await uploadLocalFile(abs, "pet-vet/announcements");
        if (isAbsoluteUrl(uploaded)) imagePath = uploaded;
      } catch (_) {}
    }

    if (req.body.remove_image === "true") {
      if (imagePath) deleteImageFile(imagePath);
      imagePath = null;
    }

    const newAudience  = audience || "All";
    const isScheduled  = scheduled_at && new Date(scheduled_at) > new Date();

    // ── 1. Purge old notifications for users no longer in the new audience ──
    // Remove the previous notification for every recipient before publishing
    // the updated version, including recipients who remain in the audience.
    if (oldAudience) {
      const oldUsers = await getUsersByAudience(oldAudience);
      const removedUsers = oldUsers;

      if (removedUsers.length > 0) {
        const removedIds = removedUsers.map((u) => u.id);
        // Prefer the announcement-specific link. The title check keeps this
        // compatible with notification rows created before links were added.
        await db.query(
          `DELETE FROM notifications
           WHERE user_id IN (?)
             AND (link = ? OR (link IS NULL AND title = ?))`,
          [removedIds, `announcement:${req.params.id}`, oldTitle]
        );

        // Emit a real-time event so their notification bell updates instantly
        if (global.io) {
          removedIds.forEach((uid) => {
            global.io.to(`user-${uid}`).emit("notification-removed");
          });
        }
      }
    }

    // ── 2. Persist the updated announcement ────────────────────────────────
    await db.query(
      `UPDATE announcements
       SET title = ?, message = ?, image = ?, audience = ?,
           scheduled_at = ?, is_sent = ?,
           sent_at = IF(?, NULL, IFNULL(sent_at, NOW()))
       WHERE id = ?`,
      [
        title,
        message,
        imagePath,
        newAudience,
        scheduled_at || null,
        isScheduled ? 0 : 1,
        isScheduled,
        req.params.id,
      ]
    );

    // ── 3. Re-notify the new audience (force bypasses same-day dedup) ───────
    let notifiedCount = 0;
    if (!isScheduled) {
      notifiedCount = await notifyAudience(newAudience, title, message, true, req.params.id);
    }

    // ── 4. Broadcast so all portals refresh their announcement lists ────────
    if (global.io) global.io.emit("announcement-posted");

    res.json({
      success: true,
      message: isScheduled
        ? "Announcement updated and rescheduled."
        : `Announcement updated. ${notifiedCount} user(s) notified.`,
      notifiedCount,
    });

    await logAudit(req, {
      action: 'UPDATE',
      entity_type: 'announcement',
      entity_id: req.params.id,
      old_value: { title: oldTitle, audience: oldAudience },
      new_value: { title, audience: newAudience },
      description: `Announcement "${oldTitle}" updated`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ======================================
// DELETE ANNOUNCEMENT
// ======================================

async function deleteAnnouncement(req, res) {
  try {
    // Remove image file from disk before deleting the row
    const [[existing]] = await db.query(
      "SELECT image, title FROM announcements WHERE id = ?",
      [req.params.id]
    );
    if (existing?.image) deleteImageFile(existing.image);

    await db.query("DELETE FROM announcements WHERE id = ?", [req.params.id]);

    if (global.io) global.io.emit("announcement-posted");

    res.json({ success: true, message: "Announcement deleted successfully." });

    await logAudit(req, {
      action: 'DELETE',
      entity_type: 'announcement',
      entity_id: req.params.id,
      old_value: { title: existing?.title },
      description: `Deleted announcement "${existing?.title || req.params.id}"`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getUsersByAudience,
  notifyAudience,
};
