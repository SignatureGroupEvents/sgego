const mongoose = require('mongoose');

const userMyEventSchema = new mongoose.Schema({
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
  position: {
    type: Number,
    default: 0
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure a user can only add an event to their board once
userMyEventSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('UserMyEvent', userMyEventSchema); 