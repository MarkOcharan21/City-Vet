const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  getMyVaccinationHistory, getPetVaccinationHistory, getAllVaccinations, getVaccineList, recordVaccination
} = require('../controllers/vaccinationController');

router.get('/vaccines', auth, getVaccineList);
router.get('/pet/:petId', auth, requireRole(['Staff', 'Admin', 'Veterinarian']), getPetVaccinationHistory);
router.get('/my-history', auth, requireRole(['Owner']), getMyVaccinationHistory);
router.get('/', auth, requireRole(['Staff', 'Admin', 'Veterinarian']), getAllVaccinations);
router.post('/', auth, requireRole(['Staff', 'Veterinarian']), recordVaccination);

module.exports = router;
