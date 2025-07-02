const express = require('express');
const rateLimit = require('express-rate-limit');
const { 
  register, 
  login, 
  getProfile,
  deleteUser,
  deactivateUser, 
  acceptInvite,
  validateInvite,
  validateResetToken,
  resetPassword,
  sendPasswordResetLink,
  requestPasswordReset
} = require('../controllers/authController');
const { protect, requireRole } = require('../middleware/auth');
const router = express.Router();

// Rate limiter: 20 requests per 10 minutes per IP
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  message: {
    message: 'Too many requests from this IP, please try again after 10 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth routes working',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
router.post('/register', register);
router.post('/login', authLimiter, login);
router.get('/profile', protect, getProfile);
router.post('/accept-invite/:token', acceptInvite);
router.get('/validate-invite/:token', validateInvite);
router.get('/validate-reset/:token', validateResetToken);
router.post('/reset-password/:token', authLimiter, resetPassword);
router.post('/request-reset-link', authLimiter, requestPasswordReset);

// User management routes (admin only)
router.delete('/users/:userId', protect, requireRole('admin'), deleteUser);
router.put('/users/:userId/deactivate', protect, requireRole('admin'), deactivateUser);
router.post('/send-reset-link/:userId', protect, requireRole('admin'), sendPasswordResetLink);

// Resend invite (rate limited)
router.post('/users/:userId/resend-invite', authLimiter, async (req, res, next) => {
  // This assumes you have a resend invite controller function
  // If not, replace with the correct import and function
  try {
    const { inviteUser } = require('../controllers/userController');
    await inviteUser(req, res, next);
  } catch (err) {
    next(err);
  }
});

module.exports = router;