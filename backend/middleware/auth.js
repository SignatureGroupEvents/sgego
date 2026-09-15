const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { staffCanAccessEvent } = require('../utils/staffEventAccess');

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.scope === 'portal') {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'User account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

exports.requireOperationsOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Access denied' });
  }

  if (!['operations_manager', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ 
      message: 'Access denied. Operations manager or admin role required.' 
    });
  }

  next();
};

// Staff may only access events they are assigned to (and children of those events)
exports.requireAssignedEventForStaff = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied' });
    }

    if (req.user.role !== 'staff') {
      return next();
    }

    const eventId = req.params.id || req.params.eventId;
    const allowed = await staffCanAccessEvent(req.user.id, eventId);

    if (!allowed) {
      return res.status(403).json({
        message: 'Access denied. You can only view events assigned to you.'
      });
    }

    next();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};