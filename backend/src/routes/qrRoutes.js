const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { getMyQrCodes, getQrByPet, scanQrToken, scanPublicQr, scanOwnerQr } = require('../controllers/qrController');

router.get('/my-codes', auth, requireRole(['Owner']), getMyQrCodes);

// Staff/Admin/Vet fetch the QR token for a specific pet (to open its booklet)
router.get('/pet/:petId', auth, requireRole(['Staff', 'Admin', 'Veterinarian']), getQrByPet); 

// Resolves a QR token to its pet owner (Staff/Admin/Vet use it to match an owner at the counter)
router.get('/owner/:token', auth, scanOwnerQr);

// Public QR (No Login Required)
router.get('/public/:token', scanPublicQr);

// Protected QR (Requires Login)
router.get('/scan/:token', auth, scanQrToken);

module.exports = router;
