const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  listConsultationPayments,
  getConsultationPaymentSummary,
  updateConsultationPaymentStatus,
  searchOwners,
} = require('../controllers/paymentMonitoringController');

router.get('/summary', auth, requireRole(['Staff', 'Admin']), getConsultationPaymentSummary);
router.get('/owners', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), searchOwners);
router.get('/', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), listConsultationPayments);
router.patch('/:id/status', auth, requireRole(['Staff', 'Admin']), updateConsultationPaymentStatus);

module.exports = router;