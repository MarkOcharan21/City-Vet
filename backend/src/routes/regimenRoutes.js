const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { listRegimens, updateRegimen } = require('../controllers/regimenController');

router.get('/', auth, requireRole(['Admin', 'Veterinarian']), listRegimens);
router.put('/:id', auth, requireRole(['Admin', 'Veterinarian']), updateRegimen);

module.exports = router;
