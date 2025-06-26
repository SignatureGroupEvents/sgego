const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');
const activityController = require('../controllers/activityController');

// All analytics routes require authentication
router.use(auth.protect);

// Simple test route
router.get('/test', (req, res) => {
  res.json({ message: 'Analytics route working' });
});

// Get comprehensive overview analytics across all events
router.get('/overview', analyticsController.getOverviewAnalytics);

// Test route for activity logs
router.post('/activity/test', activityController.createTestLog);

// Global activity feed
router.get('/activity', activityController.getGlobalFeed);

// Event-specific activity feed
router.get('/events/:eventId/activity', activityController.getEventFeed);

module.exports = router; 