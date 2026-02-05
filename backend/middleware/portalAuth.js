const jwt = require('jsonwebtoken');
const Event = require('../models/Event');

/**
 * requirePortalAuth: verify JWT, require scope === "portal", eventId match,
 * reload event and re-check enabled + open window each request.
 */
exports.requirePortalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.scope !== 'portal') {
      return res.status(401).json({ message: 'Invalid token scope' });
    }

    const eventId = req.params.eventId || decoded.eventId;
    if (!eventId || decoded.eventId !== eventId) {
      return res.status(403).json({ message: 'Event access denied' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const cp = event.clientPortal;
    if (!cp || !cp.enabled) {
      return res.status(403).json({ code: 'PORTAL_CLOSED', message: 'This event portal has closed. Contact your operations manager to reopen this event.' });
    }

    const now = new Date();
    const openAt = cp.openAt ? new Date(cp.openAt) : null;
    const closeAt = cp.closeAt ? new Date(cp.closeAt) : null;
    if (openAt && now < openAt) {
      return res.status(403).json({ code: 'PORTAL_CLOSED', message: 'This event portal has closed. Contact your operations manager to reopen this event.' });
    }
    if (closeAt && now > closeAt) {
      return res.status(403).json({ code: 'PORTAL_CLOSED', message: 'This event portal has closed. Contact your operations manager to reopen this event.' });
    }

    req.portal = { eventId, email: decoded.email, event };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    res.status(500).json({ message: err.message || 'Authentication failed' });
  }
};
