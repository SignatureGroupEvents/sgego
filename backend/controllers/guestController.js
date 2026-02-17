const Guest = require('../models/Guest');
const Event = require('../models/Event');
const { v4: uuidv4 } = require('uuid');

exports.getGuests = async (req, res) => {
  try {
    const eventId = req.query.eventId || req.params.eventId;
    const includeInherited = req.query.includeInherited !== undefined ? req.query.includeInherited : 'true';

    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // First, get the event to determine if it's a main event or secondary event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    let guestEventIds = [eventId];

    // If this is a secondary event and includeInherited is true, also get guests from the parent event
    if (event.parentEventId && includeInherited === 'true') {
      guestEventIds.push(event.parentEventId);
    }
    // If this is a main event and includeInherited is true, also get guests from all secondary events
    if (event.isMainEvent && includeInherited === 'true') {
      const secondaryEvents = await Event.find({ parentEventId: eventId }).select('_id').lean();
      const secondaryIds = secondaryEvents.map((e) => e._id);
      guestEventIds = [...guestEventIds, ...secondaryIds];
    }

    const guests = await Guest.find({ eventId: { $in: guestEventIds } })
      .populate('eventId', 'eventName isMainEvent')
      .populate('eventCheckins.eventId', 'eventName isMainEvent')
      .populate('eventCheckins.giftsReceived.inventoryId', 'type style product size gender color')
      .sort({ createdAt: -1 });

    // Add flags: isInherited (when viewing secondary = guest from parent), isFromSecondaryEvent (when viewing main = guest from a check-in event)
    const guestsWithInheritance = guests.map(guest => {
      const gEventId = guest.eventId && (guest.eventId._id || guest.eventId);
      const guestEventIdStr = gEventId ? gEventId.toString() : '';
      const isInherited = event.parentEventId && guestEventIdStr === event.parentEventId.toString();
      const isFromSecondaryEvent = event.isMainEvent && guestEventIdStr && guestEventIdStr !== eventId;
      return {
        ...guest.toObject(),
        isInherited,
        isFromSecondaryEvent: !!isFromSecondaryEvent,
        originalEventId: gEventId || null,
        originalEventName: (guest.eventId && guest.eventId.eventName) || null
      };
    });

    res.json({ 
      guests: guestsWithInheritance,
      eventType: event.isMainEvent ? 'main' : 'secondary',
      parentEventId: event.parentEventId
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.createGuest = async (req, res) => {
  try {
    const { 
      eventId, 
      firstName, 
      lastName, 
      email,
      jobTitle,
      company,
      attendeeType,
      tags,
      notes
    } = req.body;

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check for existing guest in the current event
    let existingGuest = null;
    if (email) {
      existingGuest = await Guest.findOne({
        eventId,
        email: email.toLowerCase().trim()
      });
    }

    // If no email match, check by name in the current event
    if (!existingGuest) {
      existingGuest = await Guest.findOne({
        eventId,
        firstName: { $regex: new RegExp(`^${firstName.trim()}$`, 'i') },
        lastName: { $regex: new RegExp(`^${lastName.trim()}$`, 'i') }
      });
    }

    // If this is a secondary event, also check the parent event for duplicates
    if (!existingGuest && event.parentEventId) {
      if (email) {
        existingGuest = await Guest.findOne({
          eventId: event.parentEventId,
          email: email.toLowerCase().trim()
        });
      }

      if (!existingGuest) {
        existingGuest = await Guest.findOne({
          eventId: event.parentEventId,
          firstName: { $regex: new RegExp(`^${firstName.trim()}$`, 'i') },
          lastName: { $regex: new RegExp(`^${lastName.trim()}$`, 'i') }
        });
      }

      if (existingGuest) {
        return res.status(400).json({ 
          message: `Guest already exists in the parent event "${existingGuest.eventId?.eventName || 'Main Event'}"` 
        });
      }
    }

    if (existingGuest) {
      return res.status(400).json({ 
        message: 'Guest with this email or name already exists for this event' 
      });
    }

    // Generate unique QR code data
    const qrCodeData = uuidv4();

    const guest = await Guest.create({
      eventId,
      firstName,
      lastName,
      email,
      jobTitle,
      company,
      attendeeType,
      tags: tags || [],
      notes,
      qrCodeData,
      hasExistingQR: false
    });

    await guest.populate([
      { path: 'eventId', select: 'eventName isMainEvent' },
      { path: 'eventCheckins.eventId', select: 'eventName isMainEvent' },
      { path: 'eventCheckins.giftsReceived.inventoryId', select: 'type style product size gender color' }
    ]);

    res.status(201).json({
      success: true,
      guest
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ 
        message: 'Guest with this email already exists for this event' 
      });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};

exports.bulkAddGuests = async (req, res) => {
  try {
    const { eventId, guests } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const results = {
      added: [],
      duplicates: [],
      errors: []
    };

    for (let i = 0; i < guests.length; i++) {
      const guestData = guests[i];
      
      try {
        // Check for existing guest by email (if provided) or by name in current event
        let existingGuest = null;
        
        if (guestData.email) {
          existingGuest = await Guest.findOne({
            eventId,
            email: guestData.email.toLowerCase().trim()
          });
        }
        
        // If no email match, check by name in current event
        if (!existingGuest) {
          existingGuest = await Guest.findOne({
            eventId,
            firstName: { $regex: new RegExp(`^${guestData.firstName.trim()}$`, 'i') },
            lastName: { $regex: new RegExp(`^${guestData.lastName.trim()}$`, 'i') }
          });
        }

        // If this is a secondary event, also check the parent event for duplicates
        if (!existingGuest && event.parentEventId) {
          if (guestData.email) {
            existingGuest = await Guest.findOne({
              eventId: event.parentEventId,
              email: guestData.email.toLowerCase().trim()
            });
          }

          if (!existingGuest) {
            existingGuest = await Guest.findOne({
              eventId: event.parentEventId,
              firstName: { $regex: new RegExp(`^${guestData.firstName.trim()}$`, 'i') },
              lastName: { $regex: new RegExp(`^${guestData.lastName.trim()}$`, 'i') }
            });
          }

          if (existingGuest) {
            results.duplicates.push({
              index: i + 1,
              name: `${guestData.firstName} ${guestData.lastName}`,
              email: guestData.email || 'No email',
              reason: `Already exists in parent event "${existingGuest.eventId?.eventName || 'Main Event'}"`
            });
            continue;
          }
        }

        if (existingGuest) {
          results.duplicates.push({
            index: i + 1,
            name: `${guestData.firstName} ${guestData.lastName}`,
            email: guestData.email || 'No email',
            reason: 'Name or email already exists in this event'
          });
          continue;
        }

        // Create new guest
        const newGuest = {
          eventId,
          firstName: guestData.firstName.trim(),
          lastName: guestData.lastName.trim(),
          qrCodeData: uuidv4(),
          hasExistingQR: false
        };

        // Add optional fields
        if (guestData.email && guestData.email.trim()) {
          newGuest.email = guestData.email.trim().toLowerCase();
        }
        if (guestData.jobTitle) newGuest.jobTitle = guestData.jobTitle.trim();
        if (guestData.company) newGuest.company = guestData.company.trim();
        if (guestData.attendeeType) newGuest.attendeeType = guestData.attendeeType.trim();
        if (guestData.notes) newGuest.notes = guestData.notes.trim();
        if (guestData.tags && Array.isArray(guestData.tags)) {
          newGuest.tags = guestData.tags;
        }

        const createdGuest = await Guest.create(newGuest);
        results.added.push({
          index: i + 1,
          name: `${createdGuest.firstName} ${createdGuest.lastName}`,
          email: createdGuest.email || 'No email',
          id: createdGuest._id
        });

      } catch (error) {
        results.errors.push({
          index: i + 1,
          name: `${guestData.firstName} ${guestData.lastName}`,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk addition complete. Added: ${results.added.length}, Duplicates: ${results.duplicates.length}, Errors: ${results.errors.length}`,
      results
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getGuestCheckinStatus = async (req, res) => {
  try {
    const { guestId } = req.params;
    
    const guest = await Guest.findById(guestId)
      .populate('eventId', 'eventName isMainEvent')
      .populate('eventCheckins.eventId', 'eventName isMainEvent')
      .populate('eventCheckins.giftsReceived.inventoryId', 'type style product size gender color');

    if (!guest) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    res.json({
      guest: {
        id: guest._id,
        name: `${guest.firstName} ${guest.lastName}`,
        email: guest.email,
        company: guest.company,
        jobTitle: guest.jobTitle,
        attendeeType: guest.attendeeType,
        tags: guest.tags
      },
      checkinStatus: guest.eventCheckins
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getGuestById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const guest = await Guest.findById(id)
      .populate('eventId', 'eventName isMainEvent')
      .populate('eventCheckins.eventId', 'eventName isMainEvent')
      .populate('eventCheckins.giftsReceived.inventoryId', 'type style product size gender color')
      .populate('eventCheckins.checkedInBy', 'username');

    if (!guest) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    res.json(guest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateGuest = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.eventId;
    delete updateData.qrCodeData;
    delete updateData.hasExistingQR;
    delete updateData.hasCheckedIn;
    delete updateData.eventCheckins;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    const guest = await Guest.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    )
    .populate('eventId', 'eventName isMainEvent')
    .populate('eventCheckins.eventId', 'eventName isMainEvent')
    .populate('eventCheckins.giftsReceived.inventoryId', 'type style product size gender color')
    .populate('eventCheckins.checkedInBy', 'username');

    if (!guest) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    res.json(guest);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ 
        message: 'Guest with this email already exists for this event' 
      });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};

// Delete Methods

exports.deleteGuest = async (req, res) => {
  try {
    const guest = await Guest.findById(req.params.id);

    if (!guest) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    // Check if guest has been checked in
    const Checkin = require('../models/Checkin');
    const checkinCount = await Checkin.countDocuments({ 
      guestId: req.params.id, 
      isValid: true 
    });

    if (checkinCount > 0) {
      return res.status(400).json({
        message: `Cannot delete ${guest.firstName} ${guest.lastName} - they have active check-ins. Please undo check-ins first.`
      });
    }

    await Guest.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Guest ${guest.firstName} ${guest.lastName} has been deleted`
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.bulkDeleteGuests = async (req, res) => {
  try {
    const { guestIds } = req.body;

    if (!guestIds || !Array.isArray(guestIds)) {
      return res.status(400).json({ message: 'Guest IDs array is required' });
    }

    const results = {
      deleted: [],
      errors: [],
      skipped: []
    };

    for (const guestId of guestIds) {
      try {
        const guest = await Guest.findById(guestId);
        
        if (!guest) {
          results.errors.push({
            guestId,
            error: 'Guest not found'
          });
          continue;
        }

        // Check if guest has check-ins
        const Checkin = require('../models/Checkin');
        const checkinCount = await Checkin.countDocuments({ 
          guestId, 
          isValid: true 
        });

        if (checkinCount > 0) {
          results.skipped.push({
            guestId,
            name: `${guest.firstName} ${guest.lastName}`,
            reason: 'Has active check-ins'
          });
          continue;
        }

        await Guest.findByIdAndDelete(guestId);
        results.deleted.push({
          guestId,
          name: `${guest.firstName} ${guest.lastName}`
        });

      } catch (error) {
        results.errors.push({
          guestId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk delete complete. Deleted: ${results.deleted.length}, Skipped: ${results.skipped.length}, Errors: ${results.errors.length}`,
      results
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};