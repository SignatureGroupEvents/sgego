const express = require('express');
const {
  getCheckinContext,
  multiEventCheckin,
  singleEventCheckin,
  getCheckins,
  undoCheckin,
  deleteCheckin
} = require('../controllers/checkinController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Checkin routes working',
    timestamp: new Date().toISOString()
  });
});

router.use(protect); // Protect all checkin routes

// Enhanced check-in routes
router.get('/context/:eventId', getCheckinContext);
router.post('/multi', multiEventCheckin);
router.post('/single', singleEventCheckin);

// Existing routes
router.get('/', getCheckins);
router.put('/:checkinId/undo', requireRole('operations_manager', 'admin'), undoCheckin);
router.delete('/:checkinId', requireRole('admin'), deleteCheckin);

module.exports = router;