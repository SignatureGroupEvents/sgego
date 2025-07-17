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
      ref: 'Inventory',
      required: true,
      validate: {
        validator: function(v) {
          return mongoose.Types.ObjectId.isValid(v);
        },
        message: 'Invalid inventory ID format'
      }
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: function(v) {
          return Number.isInteger(v) && v > 0;
        },
        message: 'Quantity must be a positive integer'
      }
    },
    notes: String
  }],
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Validate giftsDistributed array
checkinSchema.pre('save', function(next) {
  if (this.giftsDistributed && Array.isArray(this.giftsDistributed)) {
    for (let i = 0; i < this.giftsDistributed.length; i++) {
      const gift = this.giftsDistributed[i];
      
      // Validate inventoryId
      if (!gift.inventoryId || !mongoose.Types.ObjectId.isValid(gift.inventoryId)) {
        return next(new Error(`Invalid inventoryId at index ${i}`));
      }
      
      // Validate quantity
      if (!gift.quantity || !Number.isInteger(gift.quantity) || gift.quantity <= 0) {
        return next(new Error(`Invalid quantity at index ${i}. Must be a positive integer.`));
      }
    }
  }
  next();
});

checkinSchema.index({ eventId: 1, guestId: 1 });
checkinSchema.index({ eventId: 1, createdAt: -1 });

module.exports = mongoose.model('Checkin', checkinSchema);