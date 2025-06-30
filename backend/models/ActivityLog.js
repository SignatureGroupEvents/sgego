const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  },
  type: {
    type: String,
    required: true,
    enum: ['checkin', 'inventory_update', 'allocation_update', 'note', 'event_create', 'event_update', 'test', 'other']
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

activityLogSchema.index({ eventId: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema); 