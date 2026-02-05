const { sanitizePortalEvent } = require('../portalSanitizer');

describe('portalSanitizer', () => {
  describe('sanitizePortalEvent', () => {
    it('removes passwordHash and allowedEmails from clientPortal', () => {
      const event = {
        _id: 'event-1',
        eventName: 'Test Event',
        clientPortal: {
          enabled: true,
          passwordHash: '$2a$10$secret',
          allowedEmails: ['client@example.com'],
          openAt: null,
          closeAt: null,
          options: { allowCsvExport: false }
        }
      };
      const out = sanitizePortalEvent(event);
      expect(out.clientPortal).not.toHaveProperty('passwordHash');
      expect(out.clientPortal).not.toHaveProperty('allowedEmails');
      expect(out.clientPortal.enabled).toBe(true);
      expect(out.clientPortal.options).toEqual({ allowCsvExport: false });
      expect(out.eventName).toBe('Test Event');
    });

    it('works with Mongoose-like document (toObject)', () => {
      const event = {
        eventName: 'Mongoose Event',
        toObject() {
          return {
            eventName: this.eventName,
            clientPortal: {
              enabled: true,
              passwordHash: 'hash',
              allowedEmails: ['a@b.com']
            }
          };
        }
      };
      const out = sanitizePortalEvent(event);
      expect(out.clientPortal).not.toHaveProperty('passwordHash');
      expect(out.clientPortal).not.toHaveProperty('allowedEmails');
      expect(out.clientPortal.enabled).toBe(true);
    });

    it('returns null for null or undefined input', () => {
      expect(sanitizePortalEvent(null)).toBeNull();
      expect(sanitizePortalEvent(undefined)).toBeNull();
    });

    it('handles event without clientPortal', () => {
      const event = { _id: 'e1', eventName: 'No Portal' };
      const out = sanitizePortalEvent(event);
      expect(out).toEqual({ _id: 'e1', eventName: 'No Portal' });
    });

    it('handles empty clientPortal', () => {
      const event = { eventName: 'X', clientPortal: {} };
      const out = sanitizePortalEvent(event);
      expect(out.clientPortal).toEqual({});
    });
  });
});
