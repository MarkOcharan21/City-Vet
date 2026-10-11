const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const {
  listPlans,
  getPlan,
  importPlan,
  deletePlan,
} = require("../controllers/blockPlanController");

// Admin-only: block plans drive where every owner's pin lands, so importing and
// removing them is a privileged action.
router.get("/",                auth, requireRole(["Admin"]), listPlans);
router.post("/import",         auth, requireRole(["Admin"]), importPlan);
router.get("/:subdivision",    auth, requireRole(["Admin"]), getPlan);
router.delete("/:subdivision", auth, requireRole(["Admin"]), deletePlan);

module.exports = router;
