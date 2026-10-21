const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  getMedicineList, getMyMedicineRecords, getAllMedicineRecords, getPetMedicineRecords, addPrescription
} = require('../controllers/medicineController');

router.get('/list', auth, getMedicineList);
router.get('/my-records', auth, requireRole(['Owner']), getMyMedicineRecords);
router.get('/pet/:petId', auth, requireRole(['Admin', 'Veterinarian', 'Staff']), getPetMedicineRecords);
router.get('/', auth, requireRole(['Admin', 'Veterinarian']), getAllMedicineRecords);
router.post('/prescriptions', auth, requireRole(['Admin', 'Veterinarian']), addPrescription);

module.exports = router;
