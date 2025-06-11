const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  style: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['M', 'W', 'N/A'],
    default: 'N/A'
  },
  qtyWarehouse: {
    type: Number,
    required: true,
    min: 0
  },
  qtyOnSite: {
    type: Number,
    required: true,
    min: 0
  },
  currentInventory: {
    type: Number,
    required: true,
    min: 0
  },
  postEventCount: {
    type: Number,
    default: null
  },
  inventoryHistory: [{
    action: {
      type: String,
      enum: ['initial', 'checkin_distributed', 'manual_adjustment', 'post_event_count']
    },
    quantity: Number,
    previousCount: Number,
    newCount: Number,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

inventorySchema.index({ eventId: 1, type: 1, style: 1, size: 1, gender: 1 }, { unique: true });

// Method to update inventory
inventorySchema.methods.updateInventory = function(newCount, action, userId, reason = '') {
  const previousCount = this.currentInventory;
  const quantity = newCount - previousCount;
  
  this.inventoryHistory.push({
    action,
    quantity,
    previousCount,
    newCount,
    performedBy: userId,
    reason
  });
  
  this.currentInventory = newCount;
  return this.save();
};

module.exports = mongoose.model('Inventory', inventorySchema);