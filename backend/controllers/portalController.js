const Event = require('../models/Event');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const PORTAL_TOKEN_EXPIRY = '6h';
const PORTAL_CLOSED_MESSAGE = 'This event portal has closed. Need to reopen? Contact your operations manager to reopen this event.';

/**
 * POST /api/portal/:eventId/login
 * Body: { email, password }
 * Validates: portal enabled, time in openAt/closeAt, email in allowedEmails, password match.
 * Returns JWT with scope: "portal", eventId, email. 403 PORTAL_CLOSED if closed/disabled.
 * Login responses are generic (no distinction between "email not allowed" vs "wrong password").
 */
const isValidObjectId = (id) => typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);

function genericLoginFailure() {
  return { message: 'Invalid email or password' };
}

exports.portalLogin = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { email, password } = req.body;

    if (!eventId || !isValidObjectId(eventId)) {
      return res.status(400).json({ message: 'Invalid event link. Use the exact URL from your event\'s Client Portal settings.' });
    }
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const cp = event.clientPortal;
    if (!cp) {
      return res.status(403).json({ code: 'PORTAL_CLOSED', message: PORTAL_CLOSED_MESSAGE });
    }
    if (!cp.enabled) {
      return res.status(403).json({ code: 'PORTAL_CLOSED', message: PORTAL_CLOSED_MESSAGE });
    }

    const now = new Date();
    const openAt = cp.openAt ? new Date(cp.openAt) : null;
    const closeAt = cp.closeAt ? new Date(cp.closeAt) : null;
    if (openAt && now < openAt) {
      return res.status(403).json({ code: 'PORTAL_CLOSED', message: PORTAL_CLOSED_MESSAGE });
    }
    if (closeAt && now > closeAt) {
      return res.status(403).json({ code: 'PORTAL_CLOSED', message: PORTAL_CLOSED_MESSAGE });
    }

    const allowedEmails = Array.isArray(cp.allowedEmails) ? cp.allowedEmails : [];
    const emailNormalized = (email || '').trim().toLowerCase();
    const isAllowed = allowedEmails.some(e => (e || '').trim().toLowerCase() === emailNormalized);
    if (!isAllowed) {
      return res.status(401).json(genericLoginFailure());
    }

    if (!cp.passwordHash) {
      return res.status(403).json({ code: 'PORTAL_CLOSED', message: PORTAL_CLOSED_MESSAGE });
    }
    const passwordMatch = await bcrypt.compare(password, cp.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json(genericLoginFailure());
    }

    const token = jwt.sign(
      { scope: 'portal', eventId, email: emailNormalized },
      process.env.JWT_SECRET,
      { expiresIn: PORTAL_TOKEN_EXPIRY }
    );

    return res.json({
      token,
      expiresIn: PORTAL_TOKEN_EXPIRY,
      eventId,
      email: emailNormalized
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Login failed' });
  }
};
