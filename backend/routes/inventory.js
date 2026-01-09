const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure uploads directory exists before saving
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    // Use absolute path
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Get file extension
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);

    // Aggressive sanitization
    const sanitizedName = nameWithoutExt
      .trim()
      .replace(/\s+/g, '_')              // Replace ALL spaces
      .replace(/[()[\]{}]/g, '')         // Remove brackets
      .replace(/[^a-zA-Z0-9._-]/g, '_')  // Replace special chars
      .replace(/_{2,}/g, '_')            // Collapse underscores
      .replace(/^_+|_+$/g, '');          // Trim underscores

    const timestamp = Date.now();
    const finalName = `inventory-${timestamp}-${sanitizedName}${ext}`;

    console.log('📁 Original:', file.originalname);
    console.log('📁 Sanitized:', finalName);

    cb(null, finalName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept CSV files and also allow files that might be converted from Excel
    const isCSV = file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/csv' ||
      file.mimetype === 'text/plain' ||
      file.originalname.toLowerCase().endsWith('.csv');

    if (isCSV) {
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
router.post('/upload', requireOperationsOrAdmin, upload.single('file'), (req, res, next) => {
  // Log multer file info for debugging
  if (req.file) {
    console.log('📤 Multer file received:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      destination: req.file.destination,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      uploadsDir: uploadsDir,
      pathIsAbsolute: require('path').isAbsolute(req.file.path)
    });
    
    // Verify file was actually saved
    const fs = require('fs');
    const path = require('path');
    const actualPath = path.isAbsolute(req.file.path) 
      ? req.file.path 
      : path.join(uploadsDir, req.file.filename);
    
    if (!fs.existsSync(actualPath)) {
      console.error('❌ File was not saved by multer!', {
        expectedPath: actualPath,
        multerPath: req.file.path,
        filename: req.file.filename
      });
    } else {
      console.log('✅ File confirmed saved at:', actualPath);
    }
  } else {
    console.error('❌ No file in request');
  }
  next();
}, uploadInventory);
// Add inventory item - allow all authenticated users (staff, ops, admin)
router.post('/:eventId', addInventoryItem);
// Update inventory count - allow all authenticated users (staff, ops, admin)
router.put('/:inventoryId', updateInventoryCount);
router.put('/:inventoryId/deactivate', requireOperationsOrAdmin, deactivateInventoryItem);
router.delete('/:inventoryId', requireOperationsOrAdmin, deleteInventoryItem);
router.delete('/bulk/:eventId', requireOperationsOrAdmin, bulkDeleteInventory);
router.put('/:inventoryId/allocation', requireOperationsOrAdmin, updateInventoryAllocation);

module.exports = router;