const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const requireVerifiedRegistration = require('../middleware/paymentLock');
const {
  createRequest, getMyRequests, getAllRequests, issueRequest, generateRecordPdf, deleteRequest
} = require('../controllers/recordRequestController');

router.post('/', auth, requireRole(['Owner']), requireVerifiedRegistration, createRequest);
router.get('/my-requests', auth, requireRole(['Owner']), getMyRequests);
router.delete('/:id', auth, requireRole(['Owner']), deleteRequest);
router.get('/', auth, requireRole(['Staff', 'Admin']), getAllRequests);
router.put('/:id/issue', auth, requireRole(['Staff', 'Admin']), issueRequest);
router.get('/:id/pdf', auth, requireRole(['Owner', 'Staff', 'Admin']), generateRecordPdf);

module.exports = router;
