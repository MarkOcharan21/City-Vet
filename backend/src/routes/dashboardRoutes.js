const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const requireRole = require("../middleware/roleMiddleware");

const {

    getDashboardSummary

} = require("../controllers/dashboardController");

router.get(

    "/summary",

    auth,

    requireRole(["Admin","Staff","Veterinarian"]),

    getDashboardSummary

);

module.exports = router;