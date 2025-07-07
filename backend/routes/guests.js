const express = require('express');
const {
  getGuests,
  createGuest,
  bulkAddGuests,
  getGuestCheckinStatus,
  deleteGuest,
  bulkDeleteGuests
} = require('../controllers/guestController');
const { protect, requireOperationsOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Guest routes working',
    timestamp: new Date().toISOString()
  });
});

router.use(protect); // Protect all guest routes

// View routes - allow all authenticated users (including staff)
router.get('/', getGuests);
router.get('/:id/checkin-status', getGuestCheckinStatus);

// Individual guest creation - allow all authenticated users (including staff)
router.post('/', createGuest);

// Bulk operations - restrict to operations manager and admin
router.post('/bulk-add', requireOperationsOrAdmin, bulkAddGuests);
router.post('/bulk-delete', requireOperationsOrAdmin, bulkDeleteGuests);
router.delete('/:id', requireOperationsOrAdmin, deleteGuest);

module.exports = router;