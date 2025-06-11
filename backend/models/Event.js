const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: true,
    trim: true
  },
  eventContractNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  eventStart: {
    type: Date,
    required: true
  },
  eventEnd: {
    type: Date
  },
  parentEventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  },
  isMainEvent: {
    type: Boolean,
    default: true
  },
  includeStyles: {
    type: Boolean,
    default: false
  },
  allowMultipleGifts: {
    type: Boolean,
    default: false
  },
  availableTags: [{
    name: String,
    color: { type: String, default: '#1976d2' },
    description: String
  }],
  attendeeTypes: [{
    name: String,
    description: String,
    isDefault: { type: Boolean, default: false }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

eventSchema.index({ eventContractNumber: 1, eventName: 1 });
eventSchema.index({ parentEventId: 1, isMainEvent: 1 });

module.exports = mongoose.model('Event', eventSchema);