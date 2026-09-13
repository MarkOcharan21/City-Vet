const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  getPaymentTypes, getMyPayments, getAllPayments,
  verifyPayment, rejectPayment, verifyAllPaymentsUnderOR,
  scanPaymentQR, getOverdueOwners, getPaymentSummary,
  deletePayment, checkPaymentLock,
} = require('../controllers/paymentController');

router.get('/types', getPaymentTypes);
router.get('/my-payments', auth, requireRole(['Owner']), getMyPayments);
router.get('/check-lock', auth, requireRole(['Owner']), checkPaymentLock);
router.get('/overdue', auth, requireRole(['Staff', 'Admin']), getOverdueOwners);
router.get('/summary', auth, requireRole(['Staff', 'Admin']), getPaymentSummary);
router.get('/scan/:id', auth, requireRole(['Staff', 'Admin']), scanPaymentQR);

router.get('/', auth, requireRole(['Staff', 'Admin']), getAllPayments);

router.post('/or/:id/verify-all', auth, requireRole(['Staff', 'Admin']), verifyAllPaymentsUnderOR);
router.post('/:id/verify', auth, requireRole(['Staff', 'Admin']), verifyPayment);
router.post('/:id/reject', auth, requireRole(['Staff', 'Admin']), rejectPayment);

router.delete('/:id', auth, requireRole(['Owner', 'Staff', 'Admin']), deletePayment);

module.exports = router;
