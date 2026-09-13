const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  saveDraft,
  getMyDrafts,
  getDraftById,
  updateDraft,
  submitDraft,
  deleteDraft,
} = require("../controllers/draftController");
const uploadPetPhoto = require("../middleware/uploadPetPhoto");

router.post("/", auth, requireRole(["Owner"]), saveDraft);
router.get("/", auth, requireRole(["Owner"]), getMyDrafts);
router.get("/:id", auth, requireRole(["Owner"]), getDraftById);
router.put("/:id", auth, requireRole(["Owner"]), updateDraft);
router.post("/:id/submit", auth, requireRole(["Owner"]), uploadPetPhoto.single("photo"), submitDraft);
router.post("/:id/delete", auth, requireRole(["Owner"]), deleteDraft);
router.delete("/:id", auth, requireRole(["Owner"]), deleteDraft);

module.exports = router;
