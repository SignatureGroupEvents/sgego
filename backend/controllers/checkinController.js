const Checkin = require('../models/Checkin');
const Guest = require('../models/Guest');
const Event = require('../models/Event');
const Inventory = require('../models/Inventory');

exports.getCheckinContext = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    let availableEvents = [event];
    let checkinMode = 'single'; // single or multi

    // If this is a main event, get all secondary events for multi-checkin
    if (event.isMainEvent) {
      const secondaryEvents = await Event.find({ 
        parentEventId: eventId, 
        isActive: true 
      });
      availableEvents = [event, ...secondaryEvents];
      checkinMode = 'multi';
    }

    // Get available inventory for all events (shared inventory pool)
    const mainEventId = event.isMainEvent ? eventId : event.parentEventId;
    let inventory = await Inventory.find({ 
      eventId: mainEventId,
      isActive: true
    }).sort({ type: 1, style: 1, size: 1 });

    // Filter inventory by allocatedEvents for each event
    const inventoryByEvent = {};
    for (const ev of availableEvents) {
      inventoryByEvent[ev._id] = inventory.filter(item => (item.allocatedEvents || []).map(id => id.toString()).includes(ev._id.toString()));
    }

    res.json({
      currentEvent: event,
      availableEvents,
      checkinMode,
      inventoryByEvent,
      canCheckIntoMultiple: event.isMainEvent
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.multiEventCheckin = async (req, res) => {
  try {
    const { guestId, checkins, notes } = req.body;
    // checkins: [{ eventId, selectedGifts: [{ inventoryId, quantity }] }]

    const guest = await Guest.findById(guestId);
    if (!guest) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    const results = [];
    const inventoryUpdates = new Map(); // Track total inventory changes

    // Process each event checkin
    for (const checkin of checkins) {
      const event = await Event.findById(checkin.eventId);
      if (!event) {
        results.push({
          eventId: checkin.eventId,
          success: false,
          message: 'Event not found'
        });
        continue;
      }

      // Check if already checked into this event
      if (guest.isCheckedIntoEvent(checkin.eventId)) {
        results.push({
          eventId: checkin.eventId,
          eventName: event.eventName,
          success: false,
          message: 'Already checked into this event'
        });
        continue;
      }

      const giftsDistributed = [];

      // Process gift selections for this event
      if (checkin.selectedGifts && checkin.selectedGifts.length > 0) {
        for (const gift of checkin.selectedGifts) {
          const inventoryId = gift.inventoryId;
          const quantity = gift.quantity || 1;

          // Track cumulative inventory changes
          const currentChange = inventoryUpdates.get(inventoryId) || 0;
          inventoryUpdates.set(inventoryId, currentChange + quantity);

          giftsDistributed.push({
            inventoryId,
            quantity,
            notes: gift.notes
          });
        }
      }

      results.push({
        eventId: checkin.eventId,
        eventName: event.eventName,
        success: true,
        giftsDistributed
      });
    }

    // Validate total inventory requirements
    for (const [inventoryId, totalQuantity] of inventoryUpdates) {
      const inventoryItem = await Inventory.findById(inventoryId);
      if (!inventoryItem) {
        return res.status(404).json({ 
          message: `Inventory item not found: ${inventoryId}` 
        });
      }

      if (inventoryItem.currentInventory < totalQuantity) {
        return res.status(400).json({ 
          message: `Insufficient inventory for ${inventoryItem.style}. Available: ${inventoryItem.currentInventory}, Requested: ${totalQuantity}` 
        });
      }
    }

    // If we get here, all validations passed - execute the checkins
    const checkinRecords = [];

    for (const result of results.filter(r => r.success)) {
      // Create checkin record
      const checkinRecord = await Checkin.create({
        guestId,
        eventId: result.eventId,
        checkedInBy: req.user.id,
        giftsDistributed: result.giftsDistributed,
        notes
      });

      // Update guest record
      guest.eventCheckins.push({
        eventId: result.eventId,
        checkedIn: true,
        checkedInAt: new Date(),
        checkedInBy: req.user.id,
        giftsReceived: result.giftsDistributed.map(gift => ({
          inventoryId: gift.inventoryId,
          quantity: gift.quantity,
          distributedAt: new Date()
        }))
      });

      checkinRecords.push(checkinRecord);
    }

    // Update inventory counts
    for (const [inventoryId, totalQuantity] of inventoryUpdates) {
      const inventoryItem = await Inventory.findById(inventoryId);
      await inventoryItem.updateInventory(
        inventoryItem.currentInventory - totalQuantity,
        'checkin_distributed',
        req.user.id,
        `Distributed to ${guest.firstName} ${guest.lastName} across ${results.filter(r => r.success).length} events`
      );
    }

    // Update guest's overall checkin status
    guest.hasCheckedIn = true;
    await guest.save();

    // Populate the checkin records for response
    for (const record of checkinRecords) {
      await record.populate([
        { path: 'eventId', select: 'eventName' },
        { path: 'giftsDistributed.inventoryId' }
      ]);
    }

    // Recalculate current inventory for each inventory item
    for (const [inventoryId] of inventoryUpdates) {
      await Inventory.recalculateCurrentInventory(inventoryId);
    }

    res.json({
      success: true,
      message: `${guest.firstName} ${guest.lastName} checked into ${results.filter(r => r.success).length} events successfully!`,
      checkins: checkinRecords,
      results
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.singleEventCheckin = async (req, res) => {
  try {
    const { guestId, eventId, selectedGifts, notes } = req.body;

    const guest = await Guest.findById(guestId);
    if (!guest) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if already checked into this event
    if (guest.isCheckedIntoEvent(eventId)) {
      return res.status(400).json({ message: 'Guest already checked into this event' });
    }

    const giftsDistributed = [];

    // Process gift selections
    if (selectedGifts && selectedGifts.length > 0) {
      for (const gift of selectedGifts) {
        const inventoryItem = await Inventory.findById(gift.inventoryId);
        if (!inventoryItem) {
          return res.status(404).json({ message: `Inventory item not found: ${gift.inventoryId}` });
        }

        // No inventory restriction: allow check-in even if inventory is 0 or negative
        await inventoryItem.updateInventory(
          inventoryItem.currentInventory - gift.quantity,
          'checkin_distributed',
          req.user.id,
          `Distributed to ${guest.firstName} ${guest.lastName} at ${event.eventName}`
        );

        giftsDistributed.push({
          inventoryId: gift.inventoryId,
          quantity: gift.quantity,
          notes: gift.notes
        });
      }
    }

    // Create checkin record
    const checkin = await Checkin.create({
      guestId,
      eventId,
      checkedInBy: req.user.id,
      giftsDistributed,
      notes
    });

    // Update guest record
    guest.eventCheckins.push({
      eventId,
      checkedIn: true,
      checkedInAt: new Date(),
      checkedInBy: req.user.id,
      giftsReceived: giftsDistributed.map(gift => ({
        inventoryId: gift.inventoryId,
        quantity: gift.quantity,
        distributedAt: new Date()
      }))
    });

    // Update overall checkin status if this is main event or if this is their first checkin
    if (event.isMainEvent || guest.eventCheckins.length === 1) {
      guest.hasCheckedIn = true;
    }

    await guest.save();

    // Recalculate current inventory for each inventory item
    for (const gift of giftsDistributed) {
      await Inventory.recalculateCurrentInventory(gift.inventoryId);
    }

    await checkin.populate([
      { path: 'guestId', select: 'firstName lastName email' },
      { path: 'checkedInBy', select: 'username' },
      { path: 'eventId', select: 'eventName' },
      { path: 'giftsDistributed.inventoryId' }
    ]);

    res.json({
      success: true,
      checkin,
      message: `${guest.firstName} ${guest.lastName} checked into ${event.eventName} successfully!`
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getCheckins = async (req, res) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    const checkins = await Checkin.find({ eventId, isValid: true })
      .populate('guestId', 'firstName lastName email')
      .populate('checkedInBy', 'username')
      .populate('giftsDistributed.inventoryId', 'type style size')
      .sort({ createdAt: -1 });

    res.json({ checkins });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.undoCheckin = async (req, res) => {
  try {
    const { checkinId } = req.params;
    const { reason } = req.body;

    const checkin = await Checkin.findById(checkinId)
      .populate('guestId')
      .populate('giftsDistributed.inventoryId');

    if (!checkin) {
      return res.status(404).json({ message: 'Check-in not found' });
    }

    if (!checkin.isValid) {
      return res.status(400).json({ message: 'Check-in already undone' });
    }

    // Restore inventory
    for (const gift of checkin.giftsDistributed) {
      const inventoryItem = await Inventory.findById(gift.inventoryId._id);
      if (inventoryItem) {
        await inventoryItem.updateInventory(
          inventoryItem.currentInventory + gift.quantity,
          'checkin_distributed',
          req.user.id,
          `Restored from undone check-in: ${reason}`
        );
      }
    }

    // Update checkin record
    checkin.isValid = false;
    checkin.undoReason = reason;
    checkin.undoBy = req.user.id;
    checkin.undoAt = new Date();
    await checkin.save();

    // Update guest status
    const guest = checkin.guestId;
    guest.eventCheckins = guest.eventCheckins.filter(ec => 
      ec.eventId.toString() !== checkin.eventId.toString()
    );
    
    // Check if guest is still checked into any events
    if (guest.eventCheckins.length === 0) {
      guest.hasCheckedIn = false;
    }
    
    await guest.save();

    res.json({
      success: true,
      message: 'Check-in undone successfully'
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete Methods

exports.deleteCheckin = async (req, res) => {
  try {
    const { checkinId } = req.params;
    const { reason } = req.body;

    // Only admins should be able to permanently delete check-ins
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Only administrators can permanently delete check-ins. Use undo instead.' 
      });
    }

    const checkin = await Checkin.findById(checkinId)
      .populate('guestId')
      .populate('giftsDistributed.inventoryId');

    if (!checkin) {
      return res.status(404).json({ message: 'Check-in not found' });
    }

    // Restore inventory if check-in was valid
    if (checkin.isValid) {
      for (const gift of checkin.giftsDistributed) {
        const inventoryItem = await Inventory.findById(gift.inventoryId._id);
        if (inventoryItem) {
          await inventoryItem.updateInventory(
            inventoryItem.currentInventory + gift.quantity,
            'checkin_distributed',
            req.user.id,
            `Restored from deleted check-in: ${reason}`
          );
        }
      }
    }

    // Update guest status
    const guest = checkin.guestId;
    guest.eventCheckins = guest.eventCheckins.filter(ec => 
      ec.eventId.toString() !== checkin.eventId.toString()
    );
    
    if (guest.eventCheckins.length === 0) {
      guest.hasCheckedIn = false;
    }
    
    await guest.save();

    // Delete the check-in record
    await Checkin.findByIdAndDelete(checkinId);

    res.json({
      success: true,
      message: `Check-in permanently deleted: ${reason}`
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};