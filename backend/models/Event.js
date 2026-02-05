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
  pickupFieldPreferences: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      type: false,
      brand: true,
      product: false,
      size: false,
      gender: false,
      color: false
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'archived'],
    default: 'active'
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  unarchivedAt: {
    type: Date
  },
  unarchivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  clientPortal: {
    enabled: { type: Boolean, default: false },
    passwordHash: { type: String, default: null },
    allowedEmails: [{ type: String, trim: true }],
    openAt: { type: Date, default: null },
    closeAt: { type: Date, default: null },
    options: {
      allowCsvExport: { type: Boolean, default: false }
    },
    createdAt: { type: Date, default: null },
    updatedAt: { type: Date, default: null }
  }
}, {
  timestamps: true
});

eventSchema.index({ eventContractNumber: 1, eventName: 1 });
eventSchema.index({ parentEventId: 1, isMainEvent: 1 });

module.exports = mongoose.model('Event', eventSchema);