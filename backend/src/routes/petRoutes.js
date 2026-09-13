const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  registerPet,
  getMyPets,
  getPetById,
  updatePet,
  updatePetHealth,
  updatePetOwnerInfo,
  getAllPets,
  searchPets,
  getPetsByOwner,
  getSpeciesAndBreeds,
  reportLost,
  markFound,
  verifyPet,
  deletePet
} = require("../controllers/petController");

const uploadPetPhoto = require("../middleware/uploadPetPhoto");

router.get('/species-breeds', getSpeciesAndBreeds);
router.post("/", auth, requireRole(["Owner"]), uploadPetPhoto.single("photo"), registerPet);
router.get('/my-pets', auth, requireRole(['Owner']), getMyPets);
router.get('/', auth, requireRole(['Staff', 'Admin', 'Veterinarian']), getAllPets);
router.get('/search', auth, requireRole(['Staff', 'Admin', 'Veterinarian']), searchPets);
router.get('/by-owner/:ownerId', auth, requireRole(['Staff', 'Admin', 'Veterinarian']), getPetsByOwner);
router.get('/:id', auth, requireRole(['Owner', 'Staff', 'Admin', 'Veterinarian']), getPetById);
router.put('/:id', auth, requireRole(["Owner", "Staff", "Admin", "Veterinarian"]), uploadPetPhoto.single("photo"), updatePet);

router.put(
  "/:id/health",
  auth,
  requireRole(["Owner", "Staff", "Admin", "Veterinarian"]),
  updatePetHealth
);

router.put(
  "/:id/owner-info",
  auth,
  requireRole(["Staff", "Admin", "Veterinarian"]),
  updatePetOwnerInfo
);

router.put(

    "/:id/report-lost",

    auth,

    requireRole(["Owner", "Staff", "Admin", "Veterinarian"]),

    reportLost

);

router.put(

    "/:id/found",

    auth,

    requireRole(["Owner", "Staff", "Admin", "Veterinarian"]),

    markFound

);

router.put(
    "/:id/verify",
    auth,
    requireRole(["Staff", "Admin"]),
    verifyPet
);

router.delete(
    "/:id",
    auth,
    requireRole(["Owner", "Staff", "Admin"]),
    deletePet
);

module.exports = router;
