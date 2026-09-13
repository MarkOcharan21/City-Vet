const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  getAllAuditLogs,
  getAuditLogById,
  getAuditStats,
  staffCheckIn,
  getStaffUserActivities,
  getComprehensiveAuditLogs,
  getComprehensiveAuditStats,
} = require('../controllers/auditController');

// Staff check-in (Staff, Veterinarian)
router.post('/check-in', auth, requireRole(['Staff', 'Veterinarian']), staffCheckIn);

// Get all audit logs with filtering and pagination (Admin only) - for legacy Staff Login Logs page
router.get('/', auth, requireRole(['Admin']), getAllAuditLogs);

// Get comprehensive activity and audit logs (Admin only) - for new Activity & Audit Trail page
router.get('/comprehensive', auth, requireRole(['Admin']), getComprehensiveAuditLogs);

// Get comprehensive audit statistics (Admin only)
router.get('/stats/comprehensive', auth, requireRole(['Admin']), getComprehensiveAuditStats);

// Get audit statistics (Admin only) — must be before /:id
router.get('/stats/summary', auth, requireRole(['Admin']), getAuditStats);

// Get all activities for a staff member (Admin only) — must be before /:id
router.get('/staff/:user_id/activities', auth, requireRole(['Admin']), getStaffUserActivities);

// Get audit log by ID (Admin only)
router.get('/:id', auth, requireRole(['Admin']), getAuditLogById);

module.exports = router;
