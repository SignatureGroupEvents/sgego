const express = require('express');
const {
  getEvents,
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  deleteSecondaryEvent,
  getEventAnalytics,
  getEventInventory
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

// View routes - allow all authenticated users (including staff)
router.get('/', getEvents);
router.get('/:id', getEvent);
router.get('/:id/analytics', getEventAnalytics);
router.get('/:id/inventory', getEventInventory);

// Modification routes - restrict to operations manager and admin
router.post('/', requireOperationsOrAdmin, createEvent);
router.put('/:id', requireOperationsOrAdmin, updateEvent);
router.delete('/:id', requireOperationsOrAdmin, deleteEvent);
router.delete('/:id/secondary', requireOperationsOrAdmin, deleteSecondaryEvent);

module.exports = router;