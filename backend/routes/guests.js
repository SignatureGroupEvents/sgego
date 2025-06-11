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

router.get('/', getGuests);
router.post('/', requireOperationsOrAdmin, createGuest);
router.post('/bulk-add', requireOperationsOrAdmin, bulkAddGuests);
router.post('/bulk-delete', requireOperationsOrAdmin, bulkDeleteGuests);
router.get('/:id/checkin-status', getGuestCheckinStatus);
router.delete('/:id', requireOperationsOrAdmin, deleteGuest);

module.exports = router;