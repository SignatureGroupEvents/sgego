const express = require('express');
const router = express.Router();

const {
  inviteUser,
  resendInvite,
  getAllUsers,
  getUserProfile,
  updateUserProfile,
  createUser,
  updateUserRole,
  assignUserToEvents,
  getUserAssignedEvents,
  getAvailableEvents,
  deactivateUser,
  deleteUser,
  resetUserPassword,
  sendPasswordResetLink,
  getMyEvents,
  getMyCreatedEvents,
  getMyAssignedEvents,
  addToMyEvents,
  removeFromMyEvents,
  updateMyEventsPositions,
  requestAccountRemoval,
  cancelAccountRemovalRequest,
  getPendingRemovalRequests
} = require('../controllers/userController');

const { protect, requireRole, requireOperationsOrAdmin } = require('../middleware/auth');

// Invite routes
router.post('/invite', protect, inviteUser);
router.post('/resend-invite/:userId', protect, resendInvite);

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'User routes working',
    timestamp: new Date().toISOString()
  });
});

// Protect all remaining user routes
router.use(protect);

// Profile routes - allow all authenticated users to view profiles
router.get('/profile', getUserProfile);
router.get('/profile/:userId', getUserProfile);
router.put('/profile', updateUserProfile);
router.put('/profile/:userId', updateUserProfile);

// User management - allow staff to view, but restrict modifications
router.get('/', getAllUsers); // Allow all authenticated users to view users
router.post('/', requireOperationsOrAdmin, createUser);
router.put('/:userId/role', requireRole('admin'), updateUserRole);
router.put('/:userId/assign-events', requireOperationsOrAdmin, assignUserToEvents);
router.get('/:userId/assigned-events', getUserAssignedEvents); // Allow all authenticated users to view assigned events
router.get('/available-events', getAvailableEvents); // Allow all authenticated users to view available events

// Deactivate / delete users - admin only
router.put('/:userId/deactivate', requireRole('admin'), deactivateUser);
router.delete('/:userId', requireRole('admin'), deleteUser);

// Admin actions - admin only
router.put('/:userId/reset-password', requireRole('admin'), resetUserPassword);
router.post('/:userId/resend-invite', requireRole('admin'), resendInvite);
router.post('/:userId/send-reset-link', requireRole('admin'), sendPasswordResetLink);
router.get('/pending-removal-requests', requireRole('admin'), getPendingRemovalRequests);

// Account removal requests - users can request, admin approves via deleteUser endpoint
router.post('/request-account-removal', requestAccountRemoval);
router.post('/cancel-account-removal-request', cancelAccountRemovalRequest);

// My Events routes
router.get('/my-events', getMyEvents);
router.get('/my-created-events', getMyCreatedEvents);
router.get('/my-assigned-events', getMyAssignedEvents);
router.post('/my-events', addToMyEvents);
router.delete('/my-events/:eventId', removeFromMyEvents);
router.put('/my-events/positions', updateMyEventsPositions);

module.exports = router;

