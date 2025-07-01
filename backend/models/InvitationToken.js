const mongoose = require('mongoose');

const invitationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['invitation', 'password-reset', 'email-verification'],
    default: 'invitation',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Create TTL index on expiresAt field to automatically delete expired tokens
invitationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create compound index for better query performance
invitationTokenSchema.index({ userId: 1, type: 1 });
invitationTokenSchema.index({ token: 1 }, { unique: true });

module.exports = mongoose.model('InvitationToken', invitationTokenSchema);
