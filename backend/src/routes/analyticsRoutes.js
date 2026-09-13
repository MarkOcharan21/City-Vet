const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const requireRole = require("../middleware/roleMiddleware");

const {
    getDashboardAnalytics,
    getSummary,
    getCharts,
    getTraceability,
    getBarangayHeatmap
} = require("../controllers/analyticsController");

router.get(
    "/dashboard",
    auth,
    requireRole([
        "Admin",
        "Staff",
        "Veterinarian"
    ]),
    getDashboardAnalytics
);

router.get(
    "/summary",
    auth,
    requireRole([
        "Admin",
        "Staff",
        "Veterinarian"
    ]),
    getSummary
);

router.get(
    "/charts",
    auth,
    requireRole([
        "Admin",
        "Staff",
        "Veterinarian"
    ]),
    getCharts
);

router.get(
    "/barangay-heatmap",
    auth,
    requireRole([
        "Admin",
        "Staff",
        "Veterinarian"
    ]),
    getBarangayHeatmap
);

router.get(
    "/traceability/:petId",
    auth,
    requireRole([
        "Admin",
        "Staff",
        "Veterinarian"
    ]),
    getTraceability
);

module.exports = router;