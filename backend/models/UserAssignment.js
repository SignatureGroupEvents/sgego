const mongoose = require('mongoose');

const userAssignmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Optional: specific secondary event allocation
  allocatedToSecondaryEventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure unique user-event combinations
userAssignmentSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('UserAssignment', userAssignmentSchema); 