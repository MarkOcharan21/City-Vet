const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  getMedicineList, getMyMedicineRecords, getAllMedicineRecords, addPrescription
} = require('../controllers/medicineController');

router.get('/list', auth, getMedicineList);
router.get('/my-records', auth, requireRole(['Owner']), getMyMedicineRecords);
router.get('/', auth, requireRole(['Staff', 'Admin', 'Veterinarian']), getAllMedicineRecords);
router.post('/prescriptions', auth, requireRole(['Staff', 'Admin', 'Veterinarian']), addPrescription);

module.exports = router;
