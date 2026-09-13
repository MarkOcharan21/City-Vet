const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadAnnouncement");

const {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} = require("../controllers/announcementController");

function handleImageUpload(req, res, next) {
  upload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Unable to upload image.",
      });
    }
    next();
  });
}

router.get("/",           auth,                              getAnnouncements);
router.post("/",          auth, requireRole(["Admin"]), handleImageUpload, createAnnouncement);
router.put("/:id",        auth, requireRole(["Admin"]), handleImageUpload, updateAnnouncement);
router.delete("/:id",     auth, requireRole(["Admin"]),                    deleteAnnouncement);

module.exports = router;
