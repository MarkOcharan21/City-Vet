const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  getAllUsers, createStaffUser, resendSetupEmail, updateUserStatus, deleteUser, getBarangaySummary
} = require('../controllers/userController');
const {
  getResetRequests, approveResetRequest, declineResetRequest
} = require('../controllers/passwordResetController');

router.get('/', auth, requireRole(['Admin']), getAllUsers);
router.post('/', auth, requireRole(['Admin']), createStaffUser);
router.put('/:id/status', auth, requireRole(['Admin']), updateUserStatus);
router.post('/:id/resend-setup', auth, requireRole(['Admin']), resendSetupEmail);
router.delete('/:id', auth, requireRole(['Admin']), deleteUser);
router.get('/barangay-summary', auth, requireRole(['Admin']), getBarangaySummary);

// Password reset request approval workflow (Admin)
router.get('/reset-requests', auth, requireRole(['Admin']), getResetRequests);
router.post('/reset-requests/:id/approve', auth, requireRole(['Admin']), approveResetRequest);
router.post('/reset-requests/:id/decline', auth, requireRole(['Admin']), declineResetRequest);

module.exports = router;
