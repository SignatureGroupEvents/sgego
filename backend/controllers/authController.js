const User = require('../models/User');
const jwt = require('jsonwebtoken');
const InvitationToken = require('../models/InvitationToken');
const bcrypt = require('bcryptjs');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};



exports.acceptInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Find the invite token and populate user
    const invite = await InvitationToken.findOne({ token }).populate('userId');

    if (!invite || invite.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invite token is invalid or expired' });
    }

    const user = invite.userId;

    if (!user || !user.isInvited || user.isActive) {
      return res.status(400).json({ message: 'Invalid invite or user already registered' });
    }

    // Finalize the account
    user.password = await bcrypt.hash(password, 10);
    user.isInvited = false;
    user.isActive = true;

    await user.save();
    await invite.deleteOne();

    // Generate login token
    const loginToken = generateToken(user._id);

    res.json({
      message: 'Account created successfully',
      token: loginToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.register = async (req, res) => {
  try {
    const { email, username, password, role } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists with this email or username'
      });
    }

    const user = await User.create({
      email,
      username,
      password,
      role: role || 'staff'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
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

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
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

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete users' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const Event = require('../models/Event');
    const Checkin = require('../models/Checkin');

    const eventCount = await Event.countDocuments({ createdBy: userId });
    const checkinCount = await Checkin.countDocuments({ checkedInBy: userId });

    if (eventCount > 0 || checkinCount > 0) {
      user.isActive = false;
      await user.save();

      return res.json({
        success: true,
        message: `User ${user.username} has been deactivated (has ${eventCount} events and ${checkinCount} check-ins)`
      });
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: `User ${user.username} has been deleted`
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can deactivate users' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.username} has been deactivated`
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
