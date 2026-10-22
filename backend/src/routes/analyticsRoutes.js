const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const requireRole = require("../middleware/roleMiddleware");

const {
    getDashboardAnalytics,
    getSummary,
    getCharts,
    getTraceability,
    getBarangayHeatmap,
    geocodeAddress
} = require("../controllers/analyticsController");

const {
    getVaccineCompliance,
    getReturnRate,
    getVaccinationTrends
} = require("../controllers/complianceController");

const { getPeriodComparison } = require("../controllers/comparisonController");

router.get(
    "/period-comparison",
    auth,
    requireRole([
        "Admin",
        "Staff",
        "Veterinarian"
    ]),
    getPeriodComparison
);

router.get(
    "/vaccine-compliance",
    auth,
    requireRole([
        "Admin",
        "Staff",
        "Veterinarian"
    ]),
    getVaccineCompliance
);

router.get(
    "/return-rate",
    auth,
    requireRole([
        "Admin",
        "Staff",
        "Veterinarian"
    ]),
    getReturnRate
);

router.get(
    "/vaccination-trends",
    auth,
    requireRole([
        "Admin",
        "Staff",
        "Veterinarian"
    ]),
    getVaccinationTrends
);

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

router.post(
    "/geocode",
    auth,
    requireRole([
        "Admin",
        "Staff",
        "Veterinarian"
    ]),
    geocodeAddress
);

module.exports = router;