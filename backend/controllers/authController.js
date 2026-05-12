const User = require('../models/User');
const jwt = require('jsonwebtoken');
const InvitationToken = require('../models/InvitationToken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// Internal staff JWT only (login / register / accept-invite). Client portal uses separate signing in portalController.
const INTERNAL_JWT_EXPIRES_IN = process.env.JWT_EXPIRE_INTERNAL || '30d';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: INTERNAL_JWT_EXPIRES_IN
  });
};



exports.acceptInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, firstName, lastName } = req.body;

    console.log('🎫 Accept invite attempt with token:', token ? '[MASKED]' : '[MISSING]');
    console.log('📝 Password provided:', password ? '[MASKED]' : '[MISSING]');
    console.log('📝 First name provided:', firstName ? '[PROVIDED]' : '[NOT PROVIDED]');
    console.log('📝 Last name provided:', lastName ? '[PROVIDED]' : '[NOT PROVIDED]');

    if (!password) {
      console.log('❌ Accept invite failed: Password is required');
      return res.status(400).json({ message: 'Password is required' });
    }

    // Find the invite token and populate user
    const invite = await InvitationToken.findOne({ token }).populate('userId');
    
    console.log('🔍 Invite token found:', invite ? 'YES' : 'NO');
    if (invite) {
      console.log('📅 Invite expires at:', invite.expiresAt);
      console.log('⏰ Current time:', new Date().toISOString());
      console.log('⏰ Token expired:', invite.expiresAt < Date.now() ? 'YES' : 'NO');
    }

    if (!invite || invite.expiresAt < Date.now()) {
      console.log('❌ Accept invite failed: Invalid or expired token');
      return res.status(400).json({ message: 'Invite token is invalid or expired' });
    }

    const user = invite.userId;
    
    console.log('👤 User from invite found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('📋 User details:', {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        isInvited: user.isInvited,
        isActive: user.isActive,
        hasPassword: !!user.password
      });
    }

    if (!user) {
      console.log('❌ Accept invite failed: User not found');
      return res.status(400).json({ message: 'Invalid invite - user not found' });
    }

    if (user.isActive) {
      console.log('❌ Accept invite failed: User already active');
      return res.status(400).json({ message: 'User account is already active' });
    }

    if (!user.isInvited) {
      console.log('❌ Accept invite failed: User not in invited state');
      return res.status(400).json({ message: 'Invalid invite state' });
    }

    console.log('✅ User state is valid for invite acceptance');

    // Update user information
    console.log('🔐 Assigning raw password (will be hashed by pre-save hook)...');
    user.password = password;
    
    // Update firstName and lastName if provided
    if (firstName) {
      console.log('📝 Setting first name');
      user.firstName = firstName.trim();
    }
    if (lastName) {
      console.log('📝 Setting last name');
      user.lastName = lastName.trim();
    }
    
    // Set username to email (email is unique, so this avoids conflicts)
    // This allows multiple users to have the same first/last name
    if (!user.username) {
      console.log('📝 Setting username to email:', user.email);
      user.username = user.email;
    }
    
    user.isInvited = false;
    user.isActive = true;

    console.log('💾 Saving user account...');
    await user.save();
    console.log('🗑️ Deleting invite token...');
    await invite.deleteOne();

    console.log('🎫 Generating login token...');
    // Validate JWT_SECRET before generating token
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET environment variable is not set');
      throw new Error('Server configuration error: JWT_SECRET is not set');
    }
    // Generate login token
    const loginToken = generateToken(user._id);

    console.log('✅ Account created successfully for user:', user.email);
    res.json({
      message: 'Account created successfully',
      token: loginToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('💥 Accept invite error:', error);
    console.error('💥 Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to accept invite. Please try again.';
    if (error.code === 11000) {
      // MongoDB duplicate key error
      if (error.keyPattern?.username) {
        errorMessage = 'Username already exists. Please contact your administrator.';
      } else if (error.keyPattern?.email) {
        errorMessage = 'Email already exists. Please contact your administrator.';
      } else {
        errorMessage = 'A user with this information already exists.';
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ message: errorMessage });
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
    
    console.log('🔐 Login attempt for email:', email);
    console.log('📝 Password provided:', password ? '[MASKED]' : '[MISSING]');

    const user = await User.findOne({ email }).select('+password');
    
    console.log('👤 User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('📋 User details:', {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        isInvited: user.isInvited,
        hasPassword: !!user.password,
        passwordLength: user.password ? user.password.length : 0
      });
    }

    if (!user) {
      console.log('❌ Login failed: User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('🔍 Attempting password comparison...');
    const passwordMatch = await user.comparePassword(password);
    console.log('🔐 Password comparison result:', passwordMatch ? 'MATCH' : 'NO MATCH');

    if (!passwordMatch) {
      console.log('❌ Login failed: Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('✅ Password verified successfully');

    if (!user.isActive) {
      console.log('❌ Login failed: Account is deactivated');
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    console.log('✅ Account is active, proceeding with login');

    user.lastLogin = new Date();
    await user.save();
    console.log('📅 Last login timestamp updated');

    const token = generateToken(user._id);
    console.log('🎫 JWT token generated successfully');

    console.log('✅ Login successful for user:', user.email);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        profileColor: user.profileColor,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('💥 Login error:', error.message);
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
        lastLogin: user.lastLogin,
        profileColor: user.profileColor,
        firstName: user.firstName,
        lastName: user.lastName
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

exports.validateInvite = async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔍 Validating invite token:', token ? '[MASKED]' : '[MISSING]');
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(400).json({ 
        status: 'expired',
        message: 'No token provided' 
      });
    }

    // Find the invite token and populate user
    const invite = await InvitationToken.findOne({ token }).populate('userId');
    
    console.log('🔍 Invite token found:', invite ? 'YES' : 'NO');
    
    if (!invite) {
      console.log('❌ Token not found');
      return res.json({
        status: 'expired',
        message: 'Invalid or expired token'
      });
    }

    console.log('📅 Invite expires at:', invite.expiresAt);
    console.log('⏰ Current time:', new Date().toISOString());
    console.log('⏰ Token expired:', invite.expiresAt < Date.now() ? 'YES' : 'NO');

    // Check if token has expired
    if (invite.expiresAt < Date.now()) {
      console.log('❌ Token has expired');
      return res.json({
        status: 'expired',
        message: 'Token has expired'
      });
    }

    const user = invite.userId;
    
    console.log('👤 User from invite found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('📋 User details:', {
        id: user._id,
        email: user.email,
        role: user.role,
        isInvited: user.isInvited,
        isActive: user.isActive,
        hasPassword: !!user.password
      });
    }

    if (!user) {
      console.log('❌ User not found for token');
      return res.json({
        status: 'expired',
        message: 'Invalid token - user not found'
      });
    }

    // Determine status based on user state
    let status;
    let message;

    if (user.isActive) {
      status = 'active';
      message = 'User account is already active';
      console.log('✅ User is already active');
    } else if (user.isInvited && !user.password) {
      status = 'new';
      message = 'User needs to set password';
      console.log('🆕 User is new and needs to set password');
    } else if (user.isInvited && user.password) {
      status = 'pending';
      message = 'User has set password but account not activated';
      console.log('⏳ User has set password but account not activated');
    } else {
      status = 'expired';
      message = 'Invalid user state';
      console.log('❌ Invalid user state');
    }

    console.log('✅ Token validation complete, status:', status);
    
    res.json({
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      status,
      message
    });

  } catch (error) {
    console.error('💥 Validate invite error:', error.message);
    res.status(500).json({ 
      status: 'expired',
      message: 'Server error during validation' 
    });
  }
};

exports.validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔍 Validating reset token:', token ? '[MASKED]' : '[MISSING]');
    
    if (!token) {
      console.log('❌ No reset token provided');
      return res.status(400).json({ 
        status: 'expired',
        message: 'No reset token provided' 
      });
    }

    // Find user with this reset token
    const user = await User.findOne({ 
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }
    });
    
    console.log('🔍 Reset token found:', user ? 'YES' : 'NO');
    
    if (!user) {
      console.log('❌ Reset token not found or expired');
      return res.json({
        status: 'expired',
        message: 'Invalid or expired reset token'
      });
    }

    console.log('📅 Reset token expires at:', user.resetTokenExpires);
    console.log('⏰ Current time:', new Date().toISOString());
    console.log('⏰ Token expired:', user.resetTokenExpires < Date.now() ? 'YES' : 'NO');

    console.log('✅ Reset token validation successful for user:', user.email);
    
    res.json({
      email: user.email,
      status: 'valid',
      message: 'Reset token is valid'
    });

  } catch (error) {
    console.error('💥 Validate reset token error:', error.message);
    res.status(500).json({ 
      status: 'expired',
      message: 'Server error during validation' 
    });
  }
};

exports.sendPasswordResetLink = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔐 Admin sending password reset link for user ID:', userId);
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isActive) {
      console.log('❌ User account is deactivated');
      return res.status(400).json({ message: 'Cannot send reset link to deactivated user' });
    }

    console.log('✅ User found and active:', user.email);

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save reset token to user
    user.resetToken = resetToken;
    user.resetTokenExpires = resetTokenExpires;
    await user.save();

    console.log('✅ Reset token generated and saved');

    // Create reset link
    if (!process.env.CLIENT_URL) {
      console.error('❌ CLIENT_URL environment variable is not set');
      return res.status(500).json({ 
        message: 'Server configuration error: CLIENT_URL is not set. Please contact your administrator.' 
      });
    }
    
    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    console.log('🔗 Reset link generated:', resetLink.replace(resetToken, '***'));

    // Send email with reset link
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request - SGEGO',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Password Reset Request</h2>
          <p>Hello ${user.username || user.email},</p>
          <p>An administrator has requested a password reset for your SGEGO account.</p>
          <p>Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p><strong>This link will expire in 24 hours.</strong></p>
          <p>If you did not request this reset, please contact your administrator immediately.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            SGEGO Team
          </p>
        </div>
      `
    });

    console.log('✅ Password reset email sent successfully to:', user.email);
    
    res.json({
      success: true,
      message: 'Password reset link sent successfully',
      resetLink // Only include in development
    });
    
  } catch (error) {
    console.error('💥 Send password reset link error:', error);
    console.error('💥 Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to send password reset link.';
    if (error.message.includes('Invalid login')) {
      errorMessage = 'Email service authentication failed. Please check email credentials.';
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      errorMessage = 'Unable to connect to email server. Please check EMAIL_HOST configuration.';
    } else if (error.message.includes('CLIENT_URL')) {
      errorMessage = 'CLIENT_URL environment variable is not set.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ message: errorMessage });
  }
};

// Public endpoint for users to request password reset by email
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('🔐 User requesting password reset for email:', email);
    
    if (!email) {
      console.log('❌ Password reset request failed: Email is required');
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find the user by email
    const user = await User.findOne({ email });
    
    console.log('🔍 User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('📋 User details:', {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        isInvited: user.isInvited
      });
    }

    // Always return success to prevent email enumeration attacks
    // Don't reveal whether the email exists or not
    if (!user) {
      console.log('⚠️ Email not found, but returning success for security');
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    }

    if (!user.isActive) {
      console.log('⚠️ User account is deactivated, but returning success for security');
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    }

    if (user.isInvited) {
      console.log('⚠️ User is still invited, but returning success for security');
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    }

    console.log('✅ User found and eligible for password reset:', user.email);

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save reset token to user
    user.resetToken = resetToken;
    user.resetTokenExpires = resetTokenExpires;
    await user.save();

    console.log('✅ Reset token generated and saved');

    // Create reset link
    const resetLink = `${process.env.CLIENT_URL}/auth?view=reset-password&token=${resetToken}`;

    // Send email with reset link
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request - SGEGO',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Password Reset Request</h2>
          <p>Hello ${user.username || user.email},</p>
          <p>You have requested a password reset for your SGEGO account.</p>
          <p>Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p><strong>This link will expire in 24 hours.</strong></p>
          <p>If you did not request this reset, please ignore this email or contact your administrator.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            SGEGO Team
          </p>
        </div>
      `
    });

    console.log('✅ Password reset email sent successfully to:', user.email);
    
    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.'
    });
    
  } catch (error) {
    console.error('💥 Request password reset error:', error.message);
    // Always return success to prevent email enumeration attacks
    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.'
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    console.log('🔐 Password reset attempt with token:', token ? '[MASKED]' : '[MISSING]');
    console.log('📝 New password provided:', password ? '[MASKED]' : '[MISSING]');

    if (!password || password.length < 6) {
      console.log('❌ Password reset failed: Invalid password');
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find user with valid reset token
    const user = await User.findOne({ 
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }
    });
    
    console.log('🔍 User found with reset token:', user ? 'YES' : 'NO');
    
    if (!user) {
      console.log('❌ Password reset failed: Invalid or expired token');
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    console.log('✅ User found for password reset:', user.email);

    // Update password and clear reset token
    console.log('🔐 Setting new password...');
    user.password = password; // Will be hashed by pre-save hook
    user.resetToken = null;
    user.resetTokenExpires = null;
    
    console.log('💾 Saving user account...');
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
