const mongoose = require('mongoose');

const checkinSchema = new mongoose.Schema({
  guestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guest',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  checkedInBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  giftsDistributed: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
    },
    quantity: {
      type: Number,
      default: 1
    },
    notes: String
  }],
  isValid: {
    type: Boolean,
    default: true
  },
  undoReason: {
    type: String,
    default: null
  },
  undoBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  undoAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

checkinSchema.index({ eventId: 1, guestId: 1 });
checkinSchema.index({ eventId: 1, createdAt: -1 });

module.exports = mongoose.model('Checkin', checkinSchema);