const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  getMyVaccinationHistory, getPetVaccinationHistory, getAllVaccinations, getVaccineList, recordVaccination
} = require('../controllers/vaccinationController');

router.get('/vaccines', auth, getVaccineList);
router.get('/pet/:petId', auth, requireRole(['Admin', 'Veterinarian']), getPetVaccinationHistory);
router.get('/my-history', auth, requireRole(['Owner']), getMyVaccinationHistory);
router.get('/', auth, requireRole(['Admin', 'Veterinarian']), getAllVaccinations);
router.post('/', auth, requireRole(['Admin', 'Veterinarian']), recordVaccination);

module.exports = router;
