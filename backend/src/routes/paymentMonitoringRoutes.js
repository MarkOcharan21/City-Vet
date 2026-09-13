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
  deleteRecord,
  ocrReceipt,
} = require('../controllers/paymentMonitoringController');

router.get('/summary', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), getSummary);
router.get('/owners', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), searchOwners);
router.get('/receipt/:token', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), getReceiptByToken);
router.get('/check-or/:number', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), checkOrNumber);
router.get('/medicines', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), getMedicines);

router.post('/ocr', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), uploadReceipt.single('or_photo'), ocrReceipt);

router.get('/', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), listRecords);

router.post('/', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), uploadReceipt.single('or_photo'), createRecord);

router.delete('/:id', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), deleteRecord);

module.exports = router;