const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

// All analytics routes require authentication
router.use(auth.protect);

// Simple test route
router.get('/test', (req, res) => {
  res.json({ message: 'Analytics route working' });
});

// Get comprehensive overview analytics across all events
router.get('/overview', analyticsController.getOverviewAnalytics);

module.exports = router; 