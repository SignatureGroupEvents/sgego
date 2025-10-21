const User = require('../models/User');
const UserAssignment = require('../models/UserAssignment');
const Event = require('../models/Event');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const InvitationToken = require('../models/InvitationToken');
const sendEmail = require('../utils/sendEmail');
const UserMyEvent = require('../models/UserMyEvent');

const resendInvite = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if non-admin is trying to resend for a user who is no longer eligible
    if ((!user.isInvited || user.isActive) && req.user.role !== 'admin') {
      return res.status(400).json({ message: 'User is not eligible for resending invite.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await InvitationToken.findOneAndDelete({ userId });
    await InvitationToken.create({
      userId,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    const inviteLink = `${process.env.CLIENT_URL}/invite/${token}`;

    await sendEmail({
      to: user.email,
      subject: "You've Been Re-invited to Join SGEGO 🏱",
      html: `<p>Hello,</p><p>You've been re-invited to join <strong>SGEGO</strong> as a <strong>${user.role}</strong>.</p><p>Click the link below to complete your registration:</p><p><a href="${inviteLink}">${inviteLink}</a></p><p>This invitation will expire in 7 days.</p>`
    });

    res.json({ message: 'Invite resent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const inviteUser = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!['admin', 'operations_manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to invite users' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    user = await User.create({
      email,
      role,
      invitedBy: req.user.id,
      isInvited: true,
      isActive: false
    });

    const token = crypto.randomBytes(32).toString('hex');
    await InvitationToken.create({
      userId: user._id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    const inviteLink = `${process.env.CLIENT_URL}/invite/${token}`;

    await sendEmail({
      to: email,
      subject: "You've Been Invited to Join SGEGO 🏱",
      html: `<p>Hello,</p><p>You've been invited to join <strong>SGEGO</strong> as a <strong>${role}</strong>.</p><p>Click the link below to complete your registration:</p><p><a href="${inviteLink}">${inviteLink}</a></p><p>This invitation will expire in 7 days.</p>`
    });

    res.status(201).json({ message: 'User invited successfully', inviteLink });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
  
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId || req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Staff can view any user profile, but cannot modify others
    // The updateUserProfile function will handle modification restrictions

    const assignments = await UserAssignment.find({ userId: user._id, isActive: true })
      .populate('eventId', 'eventName eventContractNumber');

    res.json({
      user: {
        ...user.toObject(),
        assignedEvents: assignments.map(a => a.eventId)
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    console.log('PUT /users/profile body:', req.body);
    const { userId } = req.params;
    const { email, username, currentPassword, newPassword } = req.body;
    const targetUserId = userId || req.user.id;
    const user = await User.findById(targetUserId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (req.user.role === 'staff' && req.user.id !== targetUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: targetUserId } });
      if (emailExists) return res.status(400).json({ message: 'Email already in use' });
      user.email = email;
    }
    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ username, _id: { $ne: targetUserId } });
      if (usernameExists) return res.status(400).json({ message: 'Username already in use' });
      user.username = username;
    }
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: 'Current password is required' });
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) return res.status(400).json({ message: 'Current password is incorrect' });
      user.password = newPassword;
    }
    await user.save();
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { email, username, password, role } = req.body;
    if (req.user.role === 'operations_manager' && role === 'admin') {
      return res.status(403).json({ message: 'Operations managers cannot create admin users' });
    }
    if (!['operations_manager', 'staff'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }
    const user = await User.create({ email, username, password, role });
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only administrators can update user roles' });
    if (userId === req.user.id) return res.status(400).json({ message: 'Cannot update your own role' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!['operations_manager', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    user.role = role;
    await user.save();
    res.json({
      success: true,
      message: 'User role updated successfully',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const assignUserToEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    const { eventIds } = req.body;
    if (req.user.role === 'staff') return res.status(403).json({ message: 'Staff cannot assign users to events' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const events = await Event.find({ _id: { $in: eventIds } });
    if (events.length !== eventIds.length) return res.status(400).json({ message: 'One or more events not found' });
    await UserAssignment.updateMany({ userId }, { isActive: false });
    const assignments = eventIds.map(eventId => ({ userId, eventId, assignedBy: req.user.id }));
    await UserAssignment.insertMany(assignments);
    res.json({ success: true, message: 'User assigned to events successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getUserAssignedEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = userId || req.user.id;
    
    // Staff can view any user's assigned events, but cannot modify assignments
    // The assignUserToEvents function will handle modification restrictions
    
    const assignments = await UserAssignment.find({ userId: targetUserId, isActive: true })
      .populate('eventId', 'eventName eventContractNumber eventStart');
    res.json({ assignedEvents: assignments.map(a => a.eventId) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAvailableEvents = async (req, res) => {
  try {
    const events = await Event.find({ isActive: true })
      .select('eventName eventContractNumber eventStart')
      .sort({ eventStart: -1 });
    res.json({ events });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only administrators can deactivate users' });
    if (userId === req.user.id) return res.status(400).json({ message: 'Cannot deactivate your own account' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Prevent deactivation of operations_manager users
    if (user.role === 'operations_manager') {
      return res.status(403).json({ message: 'Cannot deactivate operations manager users' });
    }
    
    user.isActive = false;
    await user.save();
    await UserAssignment.updateMany({ userId }, { isActive: false });
    res.json({ success: true, message: `User ${user.username} has been deactivated` });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only administrators can delete users' });
    if (userId === req.user.id) return res.status(400).json({ message: 'Cannot delete your own account' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // TODO: Re-enable this restriction after testing
    // Prevent deletion of operations_manager users
    // if (user.role === 'operations_manager') {
    //   return res.status(403).json({ message: 'Cannot delete operations manager users' });
    // }
    
    const Checkin = require('../models/Checkin');
    const eventCount = await Event.countDocuments({ createdBy: userId });
    const checkinCount = await Checkin.countDocuments({ checkedInBy: userId });
    if (eventCount > 0 || checkinCount > 0) {
      user.isActive = false;
      await user.save();
      return res.json({ success: true, message: `User ${user.username} has been deactivated (has ${eventCount} events and ${checkinCount} check-ins)` });
    }
    await User.findByIdAndDelete(userId);
    await UserAssignment.deleteMany({ userId });
    res.json({ success: true, message: `User ${user.username} has been deleted` });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    // Only admins can reset passwords
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can reset user passwords' });
    }
    
    // Cannot reset your own password through this endpoint
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot reset your own password through this endpoint' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    console.log('🔐 Admin password reset for user:', user.email);
    console.log('📝 New password length:', newPassword.length);
    
    // Assign raw password - pre-save hook will hash it
    user.password = newPassword;
    await user.save();
    
    console.log('✅ Password reset successful for user:', user.email);
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('💥 Password reset error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

const sendPasswordResetLink = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Only admins can send reset links
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can send password reset links' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('🔐 Admin sending password reset link for user:', user.email);
    
    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store the reset token (you might want to create a separate model for this)
    // For now, we'll store it in the user document
    user.resetToken = resetToken;
    user.resetTokenExpires = expiresAt;
    await user.save();
    
    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    
    // Send email with reset link
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request - SGEGO',
      html: `
        <p>Hello,</p>
        <p>An administrator has requested a password reset for your SGEGO account.</p>
        <p>Click the link below to set a new password:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not request this reset, please contact your administrator.</p>
        <p>Best regards,<br>SGEGO Team</p>
      `
    });
    
    console.log('✅ Password reset link sent successfully to:', user.email);
    
    res.json({
      success: true,
      message: 'Password reset link sent successfully',
      resetLink // Only include in development
    });
    
  } catch (error) {
    console.error('💥 Send password reset link error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Get user's My Events board (events they added to their board)
const getMyEvents = async (req, res) => {
  try {
    const myEvents = await UserMyEvent.find({ userId: req.user.id })
      .populate({
        path: 'eventId',
        select: 'eventName eventContractNumber eventStart eventEnd isMainEvent parentEventId status includeStyles allowMultipleGifts createdBy',
        populate: {
          path: 'createdBy',
          select: 'username email'
        }
      })
      .sort({ position: 1, addedAt: -1 });
    
    res.json({ myEvents: myEvents.map(f => f.eventId) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get events created by the current user
const getMyCreatedEvents = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search = '' } = req.query;
    
    const filter = { 
      createdBy: req.user.id,
      isActive: true 
    };
    
    // Add search filter
    if (search) {
      filter.$or = [
        { eventName: { $regex: search, $options: 'i' } },
        { eventContractNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const events = await Event.find(filter)
      .populate('createdBy', 'username email')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Event.countDocuments(filter);
    
    res.json({
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Add event to My Events board
const addToMyEvents = async (req, res) => {
  try {
    const { eventId } = req.body;
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Get current max position
    const maxPosition = await UserMyEvent.findOne({ userId: req.user.id })
      .sort({ position: -1 })
      .select('position');
    
    const newPosition = (maxPosition?.position || -1) + 1;
    
    const myEvent = await UserMyEvent.create({
      userId: req.user.id,
      eventId,
      position: newPosition
    });
    
    await myEvent.populate('eventId', 'eventName eventContractNumber eventStart eventEnd isMainEvent parentEventId');
    
    res.status(201).json({ myEvent: myEvent.eventId });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Event is already on your board' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};

// Remove event from My Events board
const removeFromMyEvents = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const result = await UserMyEvent.findOneAndDelete({
      userId: req.user.id,
      eventId
    });
    
    if (!result) {
      return res.status(404).json({ message: 'Event not found on your board' });
    }
    
    res.json({ message: 'Event removed from your board' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update My Events positions (for drag and drop reordering)
const updateMyEventsPositions = async (req, res) => {
  try {
    const { positions } = req.body; // Array of { eventId, position }
    
    const updatePromises = positions.map(({ eventId, position }) =>
      UserMyEvent.findOneAndUpdate(
        { userId: req.user.id, eventId },
        { position },
        { new: true }
      )
    );
    
    await Promise.all(updatePromises);
    
    res.json({ message: 'Event order updated successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  resendInvite,
  inviteUser,
  getAllUsers,
  getUserProfile,
  updateUserProfile,
  createUser,
  updateUserRole,
  assignUserToEvents,
  getUserAssignedEvents,
  getAvailableEvents,
  deactivateUser,
  deleteUser,
  resetUserPassword,
  sendPasswordResetLink,
  getMyEvents,
  getMyCreatedEvents,
  addToMyEvents,
  removeFromMyEvents,
  updateMyEventsPositions
};
