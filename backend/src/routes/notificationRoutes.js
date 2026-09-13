const express = require("express");

const router = express.Router();

const auth=require("../middleware/authMiddleware");

const {
  getNotifications,
  markAsRead,
  getUnreadCount,
  deleteNotification,
  clearNotifications,
} = require("../controllers/notificationController");

router.get("/", auth, getNotifications);

router.get("/count", auth, getUnreadCount);

router.put("/:id/read", auth, markAsRead);

router.delete("/:id", auth, deleteNotification);

router.delete("/", auth, clearNotifications);

module.exports=router;