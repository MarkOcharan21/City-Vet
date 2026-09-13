const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const uploadReceipt = require('../middleware/uploadPaymentReceipt');
const {
  createOfficialReceipt,
  getMyOfficialReceipts,
  updateOfficialReceipt,
  deleteOfficialReceipt,
} = require('../controllers/officialReceiptController');

router.post('/', auth, requireRole(['Owner']), uploadReceipt.single('or_photo'), createOfficialReceipt);
router.get('/my', auth, requireRole(['Owner']), getMyOfficialReceipts);
router.put('/:id', auth, requireRole(['Owner']), uploadReceipt.single('or_photo'), updateOfficialReceipt);
router.delete('/:id', auth, requireRole(['Owner']), deleteOfficialReceipt);

module.exports = router;
