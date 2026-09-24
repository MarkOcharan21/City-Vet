const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const requireRole = require("../middleware/roleMiddleware");

const { getReport } = require("../controllers/staffReportController");

router.get(
  "/:category",
  auth,
  requireRole(["Admin", "Staff", "Veterinarian"]),
  getReport
);

module.exports = router;