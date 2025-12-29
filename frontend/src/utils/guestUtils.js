/**
 * Utility functions for guest check-in status
 * Uses eventCheckins array as the source of truth
 */

/**
 * Check if a guest has checked in (to any event)
 * @param {Object} guest - Guest object
 * @returns {boolean} - True if guest has any check-in record
 */
export const hasGuestCheckedIn = (guest) => {
  if (!guest || !guest.eventCheckins) return false;
  return guest.eventCheckins.length > 0 && 
         guest.eventCheckins.some(ec => ec.checkedIn === true);
};

/**
 * Check if a guest has checked into a specific event
 * @param {Object} guest - Guest object
 * @param {string} eventId - Event ID to check
 * @returns {boolean} - True if guest has checked into the specified event
 */
export const hasGuestCheckedIntoEvent = (guest, eventId) => {
  if (!guest || !guest.eventCheckins || !eventId) return false;
  
  return guest.eventCheckins.some(ec => {
    const checkinEventId = ec.eventId?._id || ec.eventId;
    return checkinEventId?.toString() === eventId.toString() && ec.checkedIn === true;
  });
};

/**
 * Get check-in count for a guest across all events
 * @param {Object} guest - Guest object
 * @returns {number} - Number of events the guest has checked into
 */
export const getGuestCheckInCount = (guest) => {
  if (!guest || !guest.eventCheckins) return 0;
  return guest.eventCheckins.filter(ec => ec.checkedIn === true).length;
};
