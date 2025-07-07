const express = require('express');
const multer = require('multer');
const {
  uploadInventory,
  getInventory,
  updateInventoryCount,
  getInventoryHistory,
  deleteInventoryItem,
  deactivateInventoryItem,
  bulkDeleteInventory,
  updateInventoryAllocation,
  exportInventoryCSV,
  exportInventoryExcel,
  addInventoryItem
} = require('../controllers/inventoryController');
const { protect, requireOperationsOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `inventory-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed for inventory upload.'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Inventory routes working',
    timestamp: new Date().toISOString()
  });
});

router.use(protect); // Protect all inventory routes

// View routes - allow all authenticated users (including staff)
router.get('/:eventId', getInventory);
router.get('/:inventoryId/history', getInventoryHistory);
router.get('/:eventId/export/csv', exportInventoryCSV);
router.get('/:eventId/export/excel', exportInventoryExcel);

// Modification routes - restrict to operations manager and admin
router.post('/upload', requireOperationsOrAdmin, upload.single('file'), uploadInventory);
router.post('/:eventId', requireOperationsOrAdmin, addInventoryItem);
router.put('/:inventoryId', requireOperationsOrAdmin, updateInventoryCount);
router.put('/:inventoryId/deactivate', requireOperationsOrAdmin, deactivateInventoryItem);
router.delete('/:inventoryId', requireOperationsOrAdmin, deleteInventoryItem);
router.delete('/bulk/:eventId', requireOperationsOrAdmin, bulkDeleteInventory);
router.put('/:inventoryId/allocation', requireOperationsOrAdmin, updateInventoryAllocation);

module.exports = router;