const express = require('express');
const {
  getEvents,
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  deleteSecondaryEvent,
  getEventAnalytics,
  getEventInventory,
  checkContractAvailability,
  archiveEvent,
  unarchiveEvent,
  updateEventStatus,
  updatePickupFieldPreferences
} = require('../controllers/eventController');
const {
  getEventAssignedUsers,
  assignUsersToEvent,
  removeUserFromEvent,
  updateUserAssignment
} = require('../controllers/userController');
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
router.get('/check-contract/:contractNumber', checkContractAvailability);

// Event team management routes - MUST come before /:id route to avoid route conflicts
router.get('/:id/assigned-users', requireOperationsOrAdmin, getEventAssignedUsers);
router.post('/:id/assign-users', requireOperationsOrAdmin, assignUsersToEvent);
router.put('/:id/assigned-users/:assignmentId', requireOperationsOrAdmin, updateUserAssignment);
router.delete('/:id/assigned-users/:assignmentId', requireOperationsOrAdmin, removeUserFromEvent);

// Other specific routes - must come before generic /:id route
router.get('/:id/analytics', getEventAnalytics);
router.get('/:id/inventory', getEventInventory);

// Generic routes - must come last
router.get('/:id', getEvent);

// Modification routes - restrict to operations manager and admin
router.post('/', requireOperationsOrAdmin, createEvent);
router.put('/:id', requireOperationsOrAdmin, updateEvent);
router.put('/:id/status', requireOperationsOrAdmin, updateEventStatus);
router.put('/:id/pickup-field-preferences', requireOperationsOrAdmin, updatePickupFieldPreferences);
router.put('/:id/archive', requireOperationsOrAdmin, archiveEvent);
router.put('/:id/unarchive', requireOperationsOrAdmin, unarchiveEvent);
router.delete('/:id', requireOperationsOrAdmin, deleteEvent);
router.delete('/:id/secondary', requireOperationsOrAdmin, deleteSecondaryEvent);

module.exports = router;