const Event = require('../models/Event');

exports.getEvents = async (req, res) => {
  try {
    const { parentEventId } = req.query;
    let filter = { isActive: true };

    if (parentEventId) {
      filter.parentEventId = parentEventId;
    }

    const events = await Event.find(filter)
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    res.json({ events });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const {
      eventName,
      eventContractNumber,
      eventStart,
      eventEnd,
      parentEventId,
      includeStyles,
      allowMultipleGifts,
      availableTags,
      attendeeTypes
    } = req.body;

    const eventData = {
      eventName,
      eventContractNumber,
      eventStart,
      eventEnd,
      includeStyles: includeStyles || false,
      allowMultipleGifts: allowMultipleGifts || false,
      availableTags: availableTags || [],
      attendeeTypes: attendeeTypes || [],
      createdBy: req.user.id
    };

    // Handle nested events
    if (parentEventId) {
      const parentEvent = await Event.findById(parentEventId);
      if (!parentEvent) {
        return res.status(404).json({ message: 'Parent event not found' });
      }
      eventData.parentEventId = parentEventId;
      eventData.isMainEvent = false;
      // Secondary events inherit contract number with suffix
      eventData.eventContractNumber = `${parentEvent.eventContractNumber}-${Date.now()}`;
    }

    const event = await Event.create(eventData);
    await event.populate(['createdBy']);

    res.status(201).json({
      success: true,
      event
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern.eventContractNumber) {
      res.status(400).json({ 
        message: 'An event with this contract number already exists' 
      });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};

exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'username email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ event });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is operations manager or admin or event creator
    if (req.user.role !== 'admin' && 
        req.user.role !== 'operations_manager' && 
        event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email');

    res.json({ event: updatedEvent });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// Delete Methods

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check permissions - only operations manager, admin, or event creator can delete
    if (req.user.role !== 'admin' && 
        req.user.role !== 'operations_manager' && 
        event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if event has guests or check-ins
    const Guest = require('../models/Guest');
    const Checkin = require('../models/Checkin');
    
    const guestCount = await Guest.countDocuments({ eventId: req.params.id });
    const checkinCount = await Checkin.countDocuments({ eventId: req.params.id });

    if (guestCount > 0 || checkinCount > 0) {
      // Soft delete - mark as inactive instead of hard delete
      event.isActive = false;
      await event.save();
      
      return res.json({
        success: true,
        message: `Event "${event.eventName}" has been deactivated (has ${guestCount} guests and ${checkinCount} check-ins)`
      });
    }

    // If no guests or check-ins, we can safely delete
    // Also delete any secondary events
    await Event.deleteMany({ parentEventId: req.params.id });
    
    // Delete the main event
    await Event.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Event "${event.eventName}" and its secondary events have been deleted`
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteSecondaryEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.isMainEvent) {
      return res.status(400).json({ 
        message: 'Use the main delete endpoint for main events' 
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && 
        req.user.role !== 'operations_manager' && 
        event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if secondary event has check-ins
    const Checkin = require('../models/Checkin');
    const checkinCount = await Checkin.countDocuments({ eventId: req.params.id });

    if (checkinCount > 0) {
      return res.status(400).json({
        message: `Cannot delete "${event.eventName}" - it has ${checkinCount} check-ins. Contact admin to resolve.`
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Secondary event "${event.eventName}" has been deleted`
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};