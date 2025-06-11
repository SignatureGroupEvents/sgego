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
    }]
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
  return checkin ? checkin.checkedIn : false;
};

module.exports = mongoose.model('Guest', guestSchema);