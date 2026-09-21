const UserAssignment = require('../models/UserAssignment');
const Event = require('../models/Event');

/**
 * Event IDs a staff user may view: assigned events, optional allocated
 * secondary events, and active children of assigned main events.
 */
const getStaffAccessibleEventIds = async (userId) => {
  const assignments = await UserAssignment.find({
    userId,
    isActive: true
  })
    .select('eventId allocatedToSecondaryEventId')
    .lean();

  const ids = new Set();
  const assignedEventIds = [];

  for (const assignment of assignments) {
    if (assignment.eventId) {
      ids.add(assignment.eventId.toString());
      assignedEventIds.push(assignment.eventId);
    }
    if (assignment.allocatedToSecondaryEventId) {
      ids.add(assignment.allocatedToSecondaryEventId.toString());
    }
  }

  if (assignedEventIds.length > 0) {
    const children = await Event.find({
      parentEventId: { $in: assignedEventIds },
      isActive: true
    })
      .select('_id')
      .lean();

    for (const child of children) {
      ids.add(child._id.toString());
    }
  }

  return ids;
};

const staffCanAccessEvent = async (userId, eventId) => {
  if (!eventId) return false;
  const accessibleIds = await getStaffAccessibleEventIds(userId);
  return accessibleIds.has(eventId.toString());
};

module.exports = {
  getStaffAccessibleEventIds,
  staffCanAccessEvent
};
