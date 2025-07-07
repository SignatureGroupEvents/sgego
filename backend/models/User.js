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
    default: true // ✅ Changed from false to true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});


userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  console.log('🔐 Pre-save hook: Hashing password...');
  console.log('📏 Raw password length:', this.password ? this.password.length : 0);
  
  this.password = await bcrypt.hash(this.password, 12);
  
  console.log('✅ Pre-save hook: Password hashed successfully');
  console.log('📏 Hashed password length:', this.password ? this.password.length : 0);
  
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  console.log('🔍 Password comparison initiated');
  console.log('📝 Candidate password provided:', candidatePassword ? '[MASKED]' : '[MISSING]');
  console.log('💾 Stored password exists:', !!this.password);
  console.log('📏 Stored password length:', this.password ? this.password.length : 0);
  
  const result = await bcrypt.compare(candidatePassword, this.password);
  console.log('🔐 Password comparison result:', result ? 'MATCH' : 'NO MATCH');
  
  return result;
};

module.exports = mongoose.model('User', userSchema);