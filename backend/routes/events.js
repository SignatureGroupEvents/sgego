const express = require('express');
const {
  getEvents,
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  deleteSecondaryEvent,
  getEventAnalytics
} = require('../controllers/eventController');
const { protect, requireOperationsOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Event routes working',
    timestamp: new Date().toISOString()
  });
});

// Protect all event routes
router.use(protect);

router.get('/', getEvents);
router.post('/', requireOperationsOrAdmin, createEvent);
router.get('/:id', getEvent);
router.get('/:id/analytics', getEventAnalytics);
router.put('/:id', updateEvent);
router.delete('/:id', requireOperationsOrAdmin, deleteEvent);
router.delete('/:id/secondary', requireOperationsOrAdmin, deleteSecondaryEvent);

module.exports = router;