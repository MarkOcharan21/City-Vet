const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  getOwnerProfile,
  updateOwnerProfile,
  updateOwnerPassword,
} = require('../controllers/ownerProfileController');

// All routes require a valid JWT and Owner role
router.get('/profile',  auth, requireRole(['Owner']), getOwnerProfile);
router.put('/profile',  auth, requireRole(['Owner']), updateOwnerProfile);
router.put('/password', auth, requireRole(['Owner']), updateOwnerPassword);

module.exports = router;
