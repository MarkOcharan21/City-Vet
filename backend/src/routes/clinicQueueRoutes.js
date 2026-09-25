const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  listEntries,
  createEntry,
  updateStatus,
  createBatch,
  listBatches,
  getBatch,
  addBatchItems,
  removeBatchItem,
} = require('../controllers/clinicQueueController');

router.post('/batches', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), createBatch);
router.get('/batches', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), listBatches);
router.get('/batches/:batchId', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), getBatch);
router.post('/batches/:batchId/items', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), addBatchItems);
router.delete('/batches/:batchId/items/:queueId', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), removeBatchItem);

router.get('/', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), listEntries);
router.post('/', auth, requireRole(['Staff', 'Admin']), createEntry);
router.patch('/:id/status', auth, requireRole(['Staff', 'Veterinarian', 'Admin']), updateStatus);

module.exports = router;
