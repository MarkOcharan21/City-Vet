const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const requireVerifiedRegistration = require('../middleware/paymentLock');
const {
  createRequest, getMyRequests, getAllRequests, issueRequest, generateRecordPdf, getPreviewData, deleteRequest
} = require('../controllers/recordRequestController');

router.post('/', auth, requireRole(['Owner']), requireVerifiedRegistration, createRequest);
router.get('/my-requests', auth, requireRole(['Owner']), getMyRequests);
router.delete('/:id', auth, requireRole(['Owner']), deleteRequest);
router.get('/', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), getAllRequests);
router.put('/:id/issue', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), issueRequest);
router.get('/:id/preview-data', auth, requireRole(['Owner', 'Staff', 'Veterinarian', 'Admin']), getPreviewData);
router.get('/:id/pdf', auth, requireRole(['Owner', 'Staff', 'Veterinarian', 'Admin']), generateRecordPdf);

module.exports = router;
