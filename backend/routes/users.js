const express = require('express');
const {
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

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'User routes working',
    timestamp: new Date().toISOString()
  });
});

router.use(protect); // Protect all user routes

// Profile routes (accessible to all authenticated users)
router.get('/profile', getUserProfile);
router.get('/profile/:userId', getUserProfile);
router.put('/profile', updateUserProfile);
router.put('/profile/:userId', updateUserProfile);

// User management routes (admin and operations manager only)
router.get('/', requireOperationsOrAdmin, getAllUsers);
router.post('/', requireOperationsOrAdmin, createUser);
router.put('/:userId/role', requireRole('admin'), updateUserRole);
router.put('/:userId/assign-events', requireOperationsOrAdmin, assignUserToEvents);
router.get('/:userId/assigned-events', getUserAssignedEvents);
router.get('/available-events', requireOperationsOrAdmin, getAvailableEvents);

// User deactivation/deletion (admin only)
router.put('/:userId/deactivate', requireRole('admin'), deactivateUser);
router.delete('/:userId', requireRole('admin'), deleteUser);

module.exports = router; 