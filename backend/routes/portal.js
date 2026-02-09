const express = require('express');
const rateLimit = require('express-rate-limit');
const portalController = require('../controllers/portalController');
const eventController = require('../controllers/eventController');
const guestController = require('../controllers/guestController');
const inventoryController = require('../controllers/inventoryController');
const { requirePortalAuth } = require('../middleware/portalAuth');
const { sanitizePortalEvent } = require('../utils/portalSanitizer');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/:eventId/login', loginLimiter, portalController.portalLogin);

router.get('/:eventId', requirePortalAuth, (req, res) => {
  res.json({ event: sanitizePortalEvent(req.portal.event) });
});

router.get('/:eventId/analytics', requirePortalAuth, (req, res, next) => {
  req.params.id = req.params.eventId;
  return eventController.getEventAnalytics(req, res, next);
});

router.get('/:eventId/guests', requirePortalAuth, (req, res, next) => {
  req.query = { ...req.query, eventId: req.params.eventId };
  return guestController.getGuests(req, res, next);
});

router.get('/:eventId/inventory', requirePortalAuth, (req, res, next) => {
  return inventoryController.getInventory(req, res, next);
});

module.exports = router;
