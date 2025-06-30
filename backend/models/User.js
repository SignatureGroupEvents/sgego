const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true // ✅ allows multiple nulls
  },
  password: {
    type: String,
    required: function () {
      return !this.isInvited;
    },
    select: false
  },
  role: {
    type: String,
    enum: ['operations_manager', 'staff', 'admin'],
    default: 'staff'
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isInvited: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: false // ✅ keep this only
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});


userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);