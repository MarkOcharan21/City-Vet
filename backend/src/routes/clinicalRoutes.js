const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  getMyClinicalRecords, getAllClinicalRecords, addClinicalRecord,
  receiveMobileScanResult, getMobileScanResult, clearMobileScanResult
} = require('../controllers/clinicalController');

router.get('/my-records', auth, requireRole(['Owner']), getMyClinicalRecords);
// Staff are included so Payment Monitoring can trace a generated payment back to
// the consultation that produced it. Reading a record does not allow changing it:
// only Admin/Veterinarian can create consultations.
router.get('/', auth, requireRole(['Admin', 'Veterinarian', 'Staff']), getAllClinicalRecords);
router.post('/', auth, requireRole(['Admin', 'Veterinarian']), addClinicalRecord);

// Mobile scan cross-device endpoints. The POST stays unauthenticated because the
// scanner runs on a phone that has not logged in; the handler re-resolves the pet
// from the database instead of trusting the payload.
router.post('/mobile-scan-result', receiveMobileScanResult);
router.get('/mobile-scan-result/:session', auth, requireRole(['Admin', 'Veterinarian', 'Staff']), getMobileScanResult);
router.delete('/mobile-scan-result/:session', auth, requireRole(['Admin', 'Veterinarian', 'Staff']), clearMobileScanResult);

module.exports = router;
