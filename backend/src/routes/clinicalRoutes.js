const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  getMyClinicalRecords, getAllClinicalRecords, addClinicalRecord
} = require('../controllers/clinicalController');

router.get('/my-records', auth, requireRole(['Owner']), getMyClinicalRecords);
router.get('/', auth, requireRole(['Staff', 'Admin', 'Veterinarian']), getAllClinicalRecords);
router.post('/', auth, requireRole(['Staff', 'Admin', 'Veterinarian']), addClinicalRecord);

module.exports = router;
