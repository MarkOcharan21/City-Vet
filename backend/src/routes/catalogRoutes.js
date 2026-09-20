const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  listCatalog,
  listCatalogAdmin,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
} = require('../controllers/catalogController');

router.get('/', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), listCatalog);
router.get('/admin', auth, requireRole(['Admin']), listCatalogAdmin);

router.post('/', auth, requireRole(['Admin']), createCatalogItem);
router.put('/:id', auth, requireRole(['Admin']), updateCatalogItem);
router.delete('/:id', auth, requireRole(['Admin']), deleteCatalogItem);

module.exports = router;