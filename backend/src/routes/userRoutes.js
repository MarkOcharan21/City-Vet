const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  getAllUsers, createStaffUser, updateUserStatus, deleteUser, getBarangaySummary
} = require('../controllers/userController');

router.get('/', auth, requireRole(['Admin']), getAllUsers);
router.post('/', auth, requireRole(['Admin']), createStaffUser);
router.put('/:id/status', auth, requireRole(['Admin']), updateUserStatus);
router.delete('/:id', auth, requireRole(['Admin']), deleteUser);
router.get('/barangay-summary', auth, requireRole(['Admin']), getBarangaySummary);

module.exports = router;
