const User = require('../models/User');
const UserAssignment = require('../models/UserAssignment');
const Event = require('../models/Event');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const InvitationToken = require('../models/InvitationToken');





exports.inviteUser = async (req, res) => {
  try {
    const { email, role } = req.body;

    // Only admin or ops can invite
    if (!['admin', 'operations_manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to invite users' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new inactive user
    user = await User.create({
      email,
      role,
      invitedBy: req.user.id,
      isInvited: true,
      isActive: false
    });

    // Create token
    const token = crypto.randomBytes(32).toString('hex');

    await InvitationToken.create({
      userId: user._id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    const inviteLink = `${process.env.CLIENT_URL}/invite/${token}`;

    res.status(201).json({
      message: 'User invited successfully',
      inviteLink
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all users (admin and operations manager only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId || req.user.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if requesting user can view this profile
    if (req.user.role === 'staff' && req.user.id !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get user's assigned events
    const assignments = await UserAssignment.find({ 
      userId: user._id, 
      isActive: true 
    }).populate('eventId', 'eventName eventContractNumber');

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

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, username, currentPassword, newPassword } = req.body;

    // Determine which user to update
    const targetUserId = userId || req.user.id;
    const user = await User.findById(targetUserId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check permissions
    if (req.user.role === 'staff' && req.user.id !== targetUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update basic fields
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: targetUserId } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ username, _id: { $ne: targetUserId } });
      if (usernameExists) {
        return res.status(400).json({ message: 'Username already in use' });
      }
      user.username = username;
    }

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }
      
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

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

// Create new user (admin and operations manager only)
exports.createUser = async (req, res) => {
  try {
    const { email, username, password, role } = req.body;

    // Check permissions
    if (req.user.role === 'operations_manager' && role === 'admin') {
      return res.status(403).json({ message: 'Operations managers cannot create admin users' });
    }

    // Validate role
    if (!['operations_manager', 'staff'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists with this email or username'
      });
    }

    // Create user
    const user = await User.create({
      email,
      username,
      password,
      role
    });

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

// Update user role (admin only)
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Only admins can update roles
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can update user roles' });
    }

    // Don't allow updating your own role
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot update your own role' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate role
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

// Assign user to events
exports.assignUserToEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    const { eventIds } = req.body;

    // Check permissions
    if (req.user.role === 'staff') {
      return res.status(403).json({ message: 'Staff cannot assign users to events' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify all events exist
    const events = await Event.find({ _id: { $in: eventIds } });
    if (events.length !== eventIds.length) {
      return res.status(400).json({ message: 'One or more events not found' });
    }

    // Remove existing assignments
    await UserAssignment.updateMany(
      { userId },
      { isActive: false }
    );

    // Create new assignments
    const assignments = eventIds.map(eventId => ({
      userId,
      eventId,
      assignedBy: req.user.id
    }));

    await UserAssignment.insertMany(assignments);

    res.json({
      success: true,
      message: 'User assigned to events successfully'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get user's assigned events
exports.getUserAssignedEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = userId || req.user.id;

    // Check permissions
    if (req.user.role === 'staff' && req.user.id !== targetUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const assignments = await UserAssignment.find({ 
      userId: targetUserId, 
      isActive: true 
    }).populate('eventId', 'eventName eventContractNumber eventStart');

    res.json({
      assignedEvents: assignments.map(a => a.eventId)
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all events for assignment (admin and operations manager only)
exports.getAvailableEvents = async (req, res) => {
  try {
    const events = await Event.find({ isActive: true })
      .select('eventName eventContractNumber eventStart')
      .sort({ eventStart: -1 });

    res.json({ events });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Deactivate user (admin only)
exports.deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Only admins can deactivate users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can deactivate users' });
    }

    // Don't allow deactivating yourself
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = false;
    await user.save();

    // Also deactivate all user assignments
    await UserAssignment.updateMany(
      { userId },
      { isActive: false }
    );

    res.json({
      success: true,
      message: `User ${user.username} has been deactivated`
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Only admins can delete users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete users' });
    }

    // Don't allow deleting yourself
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has created events or performed check-ins
    const Checkin = require('../models/Checkin');
    
    const eventCount = await Event.countDocuments({ createdBy: userId });
    const checkinCount = await Checkin.countDocuments({ checkedInBy: userId });

    if (eventCount > 0 || checkinCount > 0) {
      // Soft delete - deactivate instead
      user.isActive = false;
      await user.save();
      
      return res.json({
        success: true,
        message: `User ${user.username} has been deactivated (has ${eventCount} events and ${checkinCount} check-ins)`
      });
    }

    // Safe to delete
    await User.findByIdAndDelete(userId);
    
    // Delete all user assignments
    await UserAssignment.deleteMany({ userId });

    res.json({
      success: true,
      message: `User ${user.username} has been deleted`
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}; 