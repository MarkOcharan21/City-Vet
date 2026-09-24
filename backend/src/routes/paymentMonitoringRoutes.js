const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const uploadReceipt = require('../middleware/uploadPaymentReceipt');
const {
  createRecord,
  checkOrNumber,
  getReceiptByToken,
  listRecords,
  getSummary,
  searchOwners,
  getMedicines,
  getLastOrNumber,
  deleteRecord,
  ocrReceipt,
  registerScanBoard,
  submitScanBoard,
  pollScanBoard,
} = require('../controllers/paymentMonitoringController');

router.get('/summary', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), getSummary);
router.get('/owners', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), searchOwners);
router.get('/receipt/:token', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), getReceiptByToken);
router.get('/check-or/:number', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), checkOrNumber);
router.get('/medicines', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), getMedicines);
router.get('/last-or-number', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), getLastOrNumber);

// Phone QR scan board: the counter modal registers a session, the phone
// delivers the scanned pet/receipt QR text, and the modal poll picks it up.
router.post('/scan-board', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), registerScanBoard);
router.post('/scan-board/value', submitScanBoard);
router.get('/scan-board/:key', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), pollScanBoard);

router.post('/ocr', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), uploadReceipt.single('or_photo'), ocrReceipt);

router.get('/', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), listRecords);

router.post('/', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), uploadReceipt.single('or_photo'), createRecord);

router.delete('/:id', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), deleteRecord);

module.exports = router;