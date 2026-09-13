const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { getOwnerPaymentHistory } = require('../controllers/paymentHistoryController');

router.get('/my-history', auth, requireRole(['Owner']), getOwnerPaymentHistory);

module.exports = router;