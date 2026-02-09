const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

// Test route to create a sample activity log
exports.createTestLog = async (req, res) => {
  try {
    console.log('Creating test activity log...');
    
    const testLog = await ActivityLog.create({
      eventId: req.body.eventId || null,
      type: 'test',
      performedBy: req.user?.id || '507f1f77bcf86cd799439011', // Use a test user ID if no user
      details: {
        message: 'This is a test activity log',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    });
    
    console.log('Test log created:', testLog._id);
    res.json({ success: true, log: testLog });
  } catch (error) {
    console.error('Error creating test log:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/activity?eventId=&type=&user=&limit=
exports.getGlobalFeed = async (req, res) => {
  try {
    const { eventId, type, user, limit = 100 } = req.query;
    console.log('getGlobalFeed called with:', { eventId, type, user, limit });
    
    const filter = {};
    if (eventId) filter.eventId = eventId;
    if (type) filter.type = type;
    if (user) filter.performedBy = user;
    
    console.log('Filter:', filter);
    
    const logs = await ActivityLog.find(filter)
      .populate('performedBy', 'username email firstName lastName profileColor')
      .sort({ timestamp: -1 })
      .limit(Number(limit));
    
    console.log(`Found ${logs.length} activity logs`);
    
    res.json({ logs });
  } catch (error) {
    console.error('Error in getGlobalFeed:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/events/:eventId/activity?type=&user=&limit=
exports.getEventFeed = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { type, user, limit = 100 } = req.query;
    console.log('getEventFeed called with:', { eventId, type, user, limit });
    
    const filter = { eventId };
    if (type) filter.type = type;
    if (user) filter.performedBy = user;
    
    console.log('Filter:', filter);
    
    const logs = await ActivityLog.find(filter)
      .populate('performedBy', 'username email firstName lastName profileColor')
      .sort({ timestamp: -1 })
      .limit(Number(limit));
    
    console.log(`Found ${logs.length} activity logs for event ${eventId}`);
    
    res.json({ logs });
  } catch (error) {
    console.error('Error in getEventFeed:', error);
    res.status(500).json({ message: error.message });
  }
}; 