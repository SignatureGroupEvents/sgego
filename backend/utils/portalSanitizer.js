/**
 * Sanitize event document for client portal responses.
 * Ensures responses NEVER include passwordHash, allowedEmails, or other sensitive fields.
 * Use on every portal response that returns event data.
 *
 * @param {Object} event - Mongoose document or plain object
 * @returns {Object} Safe "public portal event" shape (plain object)
 */
function sanitizePortalEvent(event) {
  if (!event) return null;
  const obj = event.toObject ? event.toObject() : { ...event };

  if (obj.clientPortal) {
    const { passwordHash, allowedEmails, ...safeClientPortal } = obj.clientPortal;
    obj.clientPortal = safeClientPortal;
  }

  return obj;
}

module.exports = { sanitizePortalEvent };
