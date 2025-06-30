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
  deleteUser
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

// Profile routes
router.get('/profile', getUserProfile);
router.get('/profile/:userId', getUserProfile);
router.put('/profile', updateUserProfile);
router.put('/profile/:userId', updateUserProfile);

// User management
router.get('/', requireOperationsOrAdmin, getAllUsers);
router.post('/', requireOperationsOrAdmin, createUser);
router.put('/:userId/role', requireRole('admin'), updateUserRole);
router.put('/:userId/assign-events', requireOperationsOrAdmin, assignUserToEvents);
router.get('/:userId/assigned-events', getUserAssignedEvents);
router.get('/available-events', requireOperationsOrAdmin, getAvailableEvents);

// Deactivate / delete users
router.put('/:userId/deactivate', requireRole('admin'), deactivateUser);
router.delete('/:userId', requireRole('admin'), deleteUser);

module.exports = router;

