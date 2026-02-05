const Event = require('../models/Event');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const PORTAL_TOKEN_EXPIRY = '10h'; // 8–12 hours

/**
 * POST /api/portal/:eventId/login
 * Body: { email, password }
 * Validates: portal enabled, time in openAt/closeAt, email in allowedEmails, password match.
 * Returns JWT with scope: "portal", eventId, email. 403 PORTAL_CLOSED if closed/disabled.
 */
exports.portalLogin = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const cp = event.clientPortal;
    if (!cp) {
      return res.status(403).json({ code: 'PORTAL_CLOSED', message: 'This event portal has closed. Contact your operations manager to reopen this event.' });
    }
    if (!cp.enabled) {
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

    const allowedEmails = Array.isArray(cp.allowedEmails) ? cp.allowedEmails : [];
    const emailNormalized = (email || '').trim().toLowerCase();
    const isAllowed = allowedEmails.some(e => (e || '').trim().toLowerCase() === emailNormalized);
    if (!isAllowed) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Portal login] 401: Email not in allowed list:', emailNormalized, 'Allowed:', allowedEmails);
      }
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!cp.passwordHash) {
      return res.status(403).json({ code: 'PORTAL_CLOSED', message: 'This event portal has closed. Contact your operations manager to reopen this event.' });
    }
    const passwordMatch = await bcrypt.compare(password, cp.passwordHash);
    if (!passwordMatch) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Portal login] 401: Password mismatch for email:', emailNormalized);
      }
      return res.status(401).json({ message: 'Invalid email or password' });
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
