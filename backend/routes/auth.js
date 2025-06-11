const express = require('express');
const { 
  register, 
  login, 
  getProfile,
  deleteUser,
  deactivateUser 
} = require('../controllers/authController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth routes working',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);

// User management routes (admin only)
router.delete('/users/:userId', protect, requireRole('admin'), deleteUser);
router.put('/users/:userId/deactivate', protect, requireRole('admin'), deactivateUser);

module.exports = router;