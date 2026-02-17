const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        if (!email) return true;
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  jobTitle: {
    type: String,
    required: false,
    trim: true
  },
  company: {
    type: String,
    required: false,
    trim: true
  },
  attendeeType: {
    type: String,
    required: false,
    trim: true
  },
  tags: [{
    name: String,
    color: String
  }],
  notes: {
    type: String,
    required: false,
    trim: true
  },
  qrCodeData: {
    type: String
  },
  hasExistingQR: {
    type: Boolean,
    default: false
  },
  hasCheckedIn: {
    type: Boolean,
    default: false
  },
  eventCheckins: [{
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    checkedIn: {
      type: Boolean,
      default: false
    },
    checkedInAt: Date,
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    giftsReceived: [{
      inventoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory'
      },
      quantity: {
        type: Number,
        default: 1
      },
      distributedAt: {
        type: Date,
        default: Date.now
      }
    }],
    // Snapshot of event pickup field preferences at check-in; display only these fields so no false positives if Ops enables more fields later
    pickupFieldPreferencesAtCheckin: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined
    }
  }],
  additionalInfo: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
guestSchema.index(
  { eventId: 1, email: 1 }, 
  { 
    unique: true, 
    sparse: true,
    partialFilterExpression: { email: { $exists: true, $ne: '' } }
  }
);
guestSchema.index({ qrCodeData: 1 }, { unique: true, sparse: true });
guestSchema.index({ eventId: 1, firstName: 1, lastName: 1 });

// Virtual for full name
guestSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to check if guest is checked into a specific event
guestSchema.methods.isCheckedIntoEvent = function(eventId) {
  const checkin = this.eventCheckins.find(ec => 
    ec.eventId.toString() === eventId.toString()
  );
  // A guest is considered checked in only if they have received gifts
  return checkin ? (checkin.checkedIn && checkin.giftsReceived && checkin.giftsReceived.length > 0) : false;
};

// Virtual getter: hasCheckedIn derived from eventCheckins (source of truth)
// This ensures hasCheckedIn is always in sync with eventCheckins
guestSchema.virtual('computedHasCheckedIn').get(function() {
  return this.eventCheckins && this.eventCheckins.length > 0 && 
         this.eventCheckins.some(ec => ec.checkedIn === true);
});

// Pre-save hook: Keep hasCheckedIn in sync with eventCheckins for backward compatibility
guestSchema.pre('save', function(next) {
  // Derive hasCheckedIn from eventCheckins array
  this.hasCheckedIn = this.eventCheckins && this.eventCheckins.length > 0 && 
                      this.eventCheckins.some(ec => ec.checkedIn === true);
  next();
});

module.exports = mongoose.model('Guest', guestSchema);