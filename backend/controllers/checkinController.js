const Checkin = require('../models/Checkin');
const Guest = require('../models/Guest');
const Event = require('../models/Event');
const Inventory = require('../models/Inventory');
const ActivityLog = require('../models/ActivityLog');

// Helper function to emit analytics update
const emitAnalyticsUpdate = (eventId) => {
  if (global.io) {
    global.io.to(`event-${eventId}`).emit('analytics:update', {
      eventId,
      timestamp: new Date().toISOString(),
      type: 'checkin_update'
    });
    console.log(`📊 Emitted analytics:update for event ${eventId}`);
  }
};

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
    const updatedEventIds = new Set(); // Track which events were updated

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
      
      updatedEventIds.add(checkin.eventId);
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

    // Populate the updated guest with eventCheckins for frontend
    await guest.populate([
      { path: 'eventId', select: 'eventName isMainEvent' },
      { path: 'eventCheckins.eventId', select: 'eventName isMainEvent' },
      { path: 'eventCheckins.giftsReceived.inventoryId', select: 'type style size' }
    ]);

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

    // After guest and inventory are updated, log activity for each event check-in
    for (const record of checkinRecords) {
      await ActivityLog.create({
        eventId: record.eventId,
        type: 'checkin',
        performedBy: req.user.id,
        details: {
          guestId: guest._id,
          guestName: `${guest.firstName} ${guest.lastName}`,
          giftsDistributed: record.giftsDistributed,
          notes: notes || '',
        },
        timestamp: new Date()
      });
    }

    // Emit WebSocket updates for all updated events
    for (const eventId of updatedEventIds) {
      emitAnalyticsUpdate(eventId);
    }

    res.json({
      success: true,
      message: `${guest.firstName} ${guest.lastName} checked into ${results.filter(r => r.success).length} events successfully!`,
      checkins: checkinRecords,
      guest: guest, // Return the updated guest data
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

    // Populate the updated guest with eventCheckins for frontend
    await guest.populate([
      { path: 'eventId', select: 'eventName isMainEvent' },
      { path: 'eventCheckins.eventId', select: 'eventName isMainEvent' },
      { path: 'eventCheckins.giftsReceived.inventoryId', select: 'type style size' }
    ]);

    // After guest and inventory are updated, log activity for each event check-in
    await ActivityLog.create({
      eventId: event._id,
      type: 'checkin',
      performedBy: req.user.id,
      details: {
        guestId: guest._id,
        guestName: `${guest.firstName} ${guest.lastName}`,
        giftsDistributed: giftsDistributed,
        notes: notes || '',
      },
      timestamp: new Date()
    });

    // Emit WebSocket update for analytics
    emitAnalyticsUpdate(eventId);

    res.json({
      success: true,
      checkin,
      guest: guest, // Return the updated guest data
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

    const checkins = await Checkin.find({ eventId })
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
    const { reason, guestId, eventId } = req.body; // Add guestId and eventId

    // Try to find by checkinId first (if it's a real Checkin document)
    let checkin = await Checkin.findById(checkinId)
      .populate('guestId')
      .populate('giftsDistributed.inventoryId');

    // If not found by checkinId, try to find by guestId and eventId
    if (!checkin && guestId && eventId) {
      checkin = await Checkin.findOne({ guestId, eventId })
        .populate('guestId')
        .populate('giftsDistributed.inventoryId');
    }

    if (!checkin) {
      return res.status(404).json({ message: 'Check-in not found' });
    }

    // Rest of the function remains the same...
    // Restore inventory
    for (const gift of checkin.giftsDistributed) {
      const inventoryItem = await Inventory.findById(gift.inventoryId._id);
      if (inventoryItem) {
        await inventoryItem.updateInventory(
          inventoryItem.currentInventory + gift.quantity,
          'checkin_undo',
          req.user.id,
          `Restored from undone check-in: ${reason}`
        );
      }
    }

    // Update guest status - remove this specific check-in
    const guest = checkin.guestId;
    guest.eventCheckins = guest.eventCheckins.filter(ec => 
      !(ec.eventId.toString() === checkin.eventId.toString() && 
        ec.checkedInAt && 
        Math.abs(new Date(ec.checkedInAt) - new Date(checkin.createdAt)) < 60000) // Within 1 minute
    );
    
    // Check if guest is still checked into any events
    if (guest.eventCheckins.length === 0) {
      guest.hasCheckedIn = false;
    }
    
    await guest.save();

    // Log activity before deleting
    await ActivityLog.create({
      eventId: checkin.eventId,
      type: 'checkin_undo',
      performedBy: req.user.id,
      details: {
        guestId: guest._id,
        guestName: `${guest.firstName} ${guest.lastName}`,
        checkinId: checkin._id,
        giftsRestored: checkin.giftsDistributed,
        reason: reason || '',
      },
      timestamp: new Date()
    });

    // Delete the check-in record
    await Checkin.findByIdAndDelete(checkin._id);

    // Recalculate current inventory for affected items
    for (const gift of checkin.giftsDistributed) {
      await Inventory.recalculateCurrentInventory(gift.inventoryId._id);
    }

    // Emit WebSocket update for analytics
    emitAnalyticsUpdate(checkin.eventId);

    res.json({
      success: true,
      message: 'Check-in undone successfully'
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateCheckinGifts = async (req, res) => {
  try {
    const { checkinId } = req.params;
    const { newGifts, reason } = req.body; // newGifts: [{ inventoryId, quantity, notes }]

    const checkin = await Checkin.findById(checkinId)
      .populate('guestId')
      .populate('giftsDistributed.inventoryId');

    if (!checkin) {
      return res.status(404).json({ message: 'Check-in not found' });
    }

    // Validate new gifts
    if (!Array.isArray(newGifts)) {
      return res.status(400).json({ message: 'New gifts must be an array' });
    }

    // Calculate inventory changes
    const oldGifts = new Map();
    const newGiftsMap = new Map();
    const inventoryChanges = new Map();

    // Track old gifts
    for (const gift of checkin.giftsDistributed) {
      const key = gift.inventoryId._id.toString();
      oldGifts.set(key, gift.quantity);
      inventoryChanges.set(key, gift.quantity); // Will be subtracted
    }

    // Track new gifts
    for (const gift of newGifts) {
      const key = gift.inventoryId;
      newGiftsMap.set(key, gift.quantity);
      const currentChange = inventoryChanges.get(key) || 0;
      inventoryChanges.set(key, currentChange - gift.quantity); // Subtract new quantity
    }

    // Validate inventory availability for new gifts
    for (const [inventoryId, change] of inventoryChanges) {
      if (change < 0) { // We're adding more than we had
        const inventoryItem = await Inventory.findById(inventoryId);
        if (!inventoryItem) {
          return res.status(404).json({ message: `Inventory item not found: ${inventoryId}` });
        }
        
        const additionalNeeded = Math.abs(change);
        if (inventoryItem.currentInventory < additionalNeeded) {
          return res.status(400).json({ 
            message: `Insufficient inventory for ${inventoryItem.style}. Available: ${inventoryItem.currentInventory}, Additional needed: ${additionalNeeded}` 
          });
        }
      }
    }

    // Restore old gifts to inventory
    for (const [inventoryId, quantity] of oldGifts) {
      const inventoryItem = await Inventory.findById(inventoryId);
      if (inventoryItem) {
        await inventoryItem.updateInventory(
          inventoryItem.currentInventory + quantity,
          'checkin_gift_update',
          req.user.id,
          `Restored from gift update: ${reason}`
        );
      }
    }

    // Distribute new gifts
    for (const gift of newGifts) {
      const inventoryItem = await Inventory.findById(gift.inventoryId);
      if (inventoryItem) {
        await inventoryItem.updateInventory(
          inventoryItem.currentInventory - gift.quantity,
          'checkin_gift_update',
          req.user.id,
          `Updated gift distribution: ${reason}`
        );
      }
    }

    // Update checkin record
    checkin.giftsDistributed = newGifts.map(gift => ({
      inventoryId: gift.inventoryId,
      quantity: gift.quantity,
      notes: gift.notes || ''
    }));
    await checkin.save();

    // Update guest record
    const guest = checkin.guestId;
    const guestCheckin = guest.eventCheckins.find(ec => 
      ec.eventId.toString() === checkin.eventId.toString()
    );
    
    if (guestCheckin) {
      guestCheckin.giftsReceived = newGifts.map(gift => ({
        inventoryId: gift.inventoryId,
        quantity: gift.quantity,
        distributedAt: new Date()
      }));
      await guest.save();
    }

    // Recalculate current inventory for affected items
    for (const [inventoryId] of inventoryChanges) {
      await Inventory.recalculateCurrentInventory(inventoryId);
    }

    // Log activity
    await ActivityLog.create({
      eventId: checkin.eventId,
      type: 'checkin_gift_update',
      performedBy: req.user.id,
      details: {
        guestId: guest._id,
        guestName: `${guest.firstName} ${guest.lastName}`,
        checkinId: checkin._id,
        oldGifts: Array.from(oldGifts.entries()),
        newGifts: newGifts,
        reason: reason || '',
      },
      timestamp: new Date()
    });

    // Emit WebSocket update for analytics
    emitAnalyticsUpdate(checkin.eventId);

    // Populate the updated checkin for response
    await checkin.populate([
      { path: 'guestId', select: 'firstName lastName email' },
      { path: 'checkedInBy', select: 'username' },
      { path: 'eventId', select: 'eventName' },
      { path: 'giftsDistributed.inventoryId' }
    ]);

    res.json({
      success: true,
      message: 'Gifts updated successfully',
      checkin
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

    // Restore inventory
    for (const gift of checkin.giftsDistributed) {
      const inventoryItem = await Inventory.findById(gift.inventoryId._id);
      if (inventoryItem) {
        await inventoryItem.updateInventory(
          inventoryItem.currentInventory + gift.quantity,
          'checkin_delete',
          req.user.id,
          `Restored from deleted check-in: ${reason}`
        );
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