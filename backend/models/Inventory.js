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
    required: false
  },
  qtyOnSite: {
    type: Number,
    required: false
  },
  currentInventory: {
    type: Number,
    required: false
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
  },
  allocatedEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: false
  }]
}, {
  timestamps: true
});

inventorySchema.index({ eventId: 1, type: 1, style: 1, size: 1, gender: 1 }, { unique: true });

// Method to update inventory
inventorySchema.methods.updateInventory = function(newCount, action, userId, reason = '') {
  // Defensive: always cast to number and default to 0 if invalid
  const prev = Number(this.currentInventory);
  const previousCount = isNaN(prev) ? 0 : prev;
  const next = Number(newCount);
  const safeNewCount = isNaN(next) ? 0 : next;
  const quantity = safeNewCount - previousCount;

  this.inventoryHistory.push({
    action,
    quantity,
    previousCount,
    newCount: safeNewCount,
    performedBy: userId,
    reason
  });

  this.currentInventory = safeNewCount;
  return this.save();
};

// Add a static method to recalculate currentInventory as qtyOnSite minus all distributed check-ins
inventorySchema.statics.recalculateCurrentInventory = async function(inventoryId) {
  const Checkin = require('./Checkin');
  const inventoryItem = await this.findById(inventoryId);
  if (!inventoryItem) return;
  // Sum all distributed quantities for this inventory item
  const checkins = await Checkin.aggregate([
    { $match: { 'giftsDistributed.inventoryId': inventoryItem._id, isValid: true } },
    { $unwind: '$giftsDistributed' },
    { $match: { 'giftsDistributed.inventoryId': inventoryItem._id } },
    { $group: { _id: null, total: { $sum: '$giftsDistributed.quantity' } } }
  ]);
  const totalDistributed = checkins[0]?.total || 0;
  inventoryItem.currentInventory = Math.max(0, (inventoryItem.qtyOnSite || 0) - totalDistributed);
  await inventoryItem.save();
  return inventoryItem.currentInventory;
};

module.exports = mongoose.model('Inventory', inventorySchema);