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

// Check-in routes - allow all authenticated users (including staff)
router.get('/context/:eventId', getCheckinContext);
router.post('/multi', multiEventCheckin);
router.post('/single', singleEventCheckin);
router.get('/', getCheckins);

// Management routes - restrict to operations manager and admin
router.put('/:checkinId/undo', requireRole('operations_manager', 'admin'), undoCheckin);
router.delete('/:checkinId', requireRole('admin'), deleteCheckin);

module.exports = router;