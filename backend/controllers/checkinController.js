const mongoose = require('mongoose');
const Checkin = require('../models/Checkin');
const Guest = require('../models/Guest');
const Event = require('../models/Event');
const Inventory = require('../models/Inventory');
const ActivityLog = require('../models/ActivityLog');

// Skip invalid/empty inventory IDs to avoid "Cast to ObjectId failed" (e.g. when multiple items share category/brand and UI sends '')
const isValidInventoryId = (id) => id && mongoose.Types.ObjectId.isValid(id);

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

/** Event ids where pickup must be complete (matches GuestTable: secondaries only if any, else main). */
async function getPickupStationEventIdStrings(mainEventId) {
  if (!mainEventId) return [];
  const secondaries = await Event.find({ parentEventId: mainEventId, isActive: true }).select('_id').lean();
  if (secondaries.length > 0) {
    return secondaries.map((s) => s._id.toString());
  }
  return [mainEventId.toString()];
}

function guestHasCheckedInForStation(guest, stationIdStr) {
  const ecs = guest.eventCheckins || [];
  for (const ec of ecs) {
    const cid = ec.eventId?._id?.toString() || ec.eventId?.toString();
    if (cid === stationIdStr && ec.checkedIn === true) return true;
  }
  return false;
}

/** True if guest has checkedIn for every pickup station under the main program (GuestTable "Fully Picked Up"). */
async function guestFullyPickedUpOnMainProgram(guest, mainEventId) {
  if (!guest || !mainEventId) return false;
  const stations = await getPickupStationEventIdStrings(mainEventId);
  if (stations.length === 0) return false;
  return stations.every((sid) => guestHasCheckedInForStation(guest, sid));
}

function resolveMainProgramIdFromEventDoc(eventDoc) {
  if (!eventDoc) return null;
  if (eventDoc.isMainEvent) return eventDoc._id;
  return eventDoc.parentEventId || eventDoc._id;
}

function buildInventoryDisplayName(inv) {
  if (!inv) return 'Gift';
  const parts = [inv.type, inv.style, inv.product].filter((p) => p && String(p).trim());
  if (inv.color) parts.push(inv.color);
  if (inv.size) parts.push(inv.size);
  if (inv.gender && inv.gender !== 'N/A') parts.push(inv.gender);
  const s = parts.join(' ').replace(/\s+/g, ' ').trim();
  return s || 'Gift';
}

/** Batch-load inventory rows and build [{ displayName, quantity }] for activity logs. */
async function buildGiftsReceivedSummaryFromDistributed(giftsDistributed) {
  console.log('[checkin-activity-log] buildGiftsReceivedSummaryFromDistributed INPUT', {
    length: giftsDistributed?.length ?? 0,
    raw: giftsDistributed
  });
  if (!giftsDistributed || !giftsDistributed.length) {
    console.log('[checkin-activity-log] early exit: empty or missing giftsDistributed');
    return [];
  }
  const idStrings = [
    ...new Set(
      giftsDistributed
        .map((g) => {
          const id = g.inventoryId?._id ?? g.inventoryId;
          return isValidInventoryId(id) ? id.toString() : null;
        })
        .filter(Boolean)
    )
  ];
  console.log('[checkin-activity-log] collected inventory idStrings for Inventory.find', idStrings);
  if (idStrings.length === 0) {
    console.log('[checkin-activity-log] early exit: no valid inventory ids after extraction');
    return [];
  }

  const objectIds = idStrings.map((s) => new mongoose.Types.ObjectId(s));
  const items = await Inventory.find({ _id: { $in: objectIds } })
    .select('type style product size gender color')
    .lean();
  console.log('[checkin-activity-log] Inventory.find result', {
    queryCount: objectIds.length,
    matchedCount: items.length,
    items: items.map((i) => ({
      _id: i._id?.toString(),
      type: i.type,
      style: i.style,
      product: i.product
    }))
  });

  const byId = new Map(items.map((i) => [i._id.toString(), i]));

  const summary = [];
  for (const g of giftsDistributed) {
    const id = g.inventoryId?._id ?? g.inventoryId;
    if (!isValidInventoryId(id)) continue;
    const inv = byId.get(id.toString());
    summary.push({
      displayName: buildInventoryDisplayName(inv),
      quantity: g.quantity && Number(g.quantity) > 0 ? Number(g.quantity) : 1
    });
  }
  console.log('[checkin-activity-log] final giftsReceivedSummary (before ActivityLog.create)', summary);
  return summary;
}

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

    let mainIdForPickup = null;
    let wasFullyPickedUpOnMain = false;
    if (Array.isArray(checkins) && checkins.length > 0) {
      const firstEntry = checkins.find((c) => c && c.eventId);
      if (firstEntry) {
        const anchorEv = await Event.findById(firstEntry.eventId);
        if (anchorEv) {
          mainIdForPickup = resolveMainProgramIdFromEventDoc(anchorEv);
          wasFullyPickedUpOnMain = await guestFullyPickedUpOnMainProgram(guest, mainIdForPickup);
        }
      }
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

      // Process gift selections for this event (skip invalid/empty inventoryId to avoid Cast to ObjectId errors)
      if (checkin.selectedGifts && checkin.selectedGifts.length > 0) {
        for (const gift of checkin.selectedGifts) {
          const inventoryId = gift.inventoryId;
          if (!isValidInventoryId(inventoryId)) continue;
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
        giftsDistributed,
        pickupFieldPreferencesAtCheckin: checkin.pickupFieldPreferences ?? event.pickupFieldPreferences
      });

      updatedEventIds.add(checkin.eventId);
    }

    // Validate total inventory requirements
    for (const [inventoryId, totalQuantity] of inventoryUpdates) {
      if (!isValidInventoryId(inventoryId)) continue;
      const inventoryItem = await Inventory.findById(inventoryId);
      if (!inventoryItem) {
        return res.status(404).json({
          message: `Inventory item not found: ${inventoryId}`
        });
      }
    }

    // If we get here, all validations passed - execute the checkins
    const checkinRecords = [];

    for (const result of results.filter(r => r.success)) {
      // Check if guest already has a check-in record for this event with no gifts
      const existingCheckin = guest.eventCheckins.find(ec => 
        ec.eventId.toString() === result.eventId.toString() && 
        ec.checkedIn && 
        (!ec.giftsReceived || ec.giftsReceived.length === 0)
      );

      const pickupPrefs = result.pickupFieldPreferencesAtCheckin || undefined;
      let checkinRecord;
      if (existingCheckin) {
        // Update existing check-in record with gifts
        existingCheckin.giftsReceived = result.giftsDistributed.map(gift => ({
          inventoryId: gift.inventoryId,
          quantity: gift.quantity,
          distributedAt: new Date()
        }));
        existingCheckin.checkedInAt = new Date();
        existingCheckin.checkedInBy = req.user.id;
        if (pickupPrefs != null) existingCheckin.pickupFieldPreferencesAtCheckin = pickupPrefs;

        // Create or update the Checkin document
        const existingCheckinDoc = await Checkin.findOne({ guestId, eventId: result.eventId });
        if (existingCheckinDoc) {
          existingCheckinDoc.giftsDistributed = result.giftsDistributed;
          existingCheckinDoc.notes = notes;
          if (pickupPrefs != null) existingCheckinDoc.pickupFieldPreferencesAtCheckin = pickupPrefs;
          checkinRecord = await existingCheckinDoc.save();
        } else {
          checkinRecord = await Checkin.create({
            guestId,
            eventId: result.eventId,
            checkedInBy: req.user.id,
            giftsDistributed: result.giftsDistributed,
            notes,
            pickupFieldPreferencesAtCheckin: pickupPrefs
          });
        }
      } else {
        // Create new checkin record
        checkinRecord = await Checkin.create({
          guestId,
          eventId: result.eventId,
          checkedInBy: req.user.id,
          giftsDistributed: result.giftsDistributed,
          notes,
          pickupFieldPreferencesAtCheckin: pickupPrefs
        });

        // Add new event check-in record
        guest.eventCheckins.push({
          eventId: result.eventId,
          checkedIn: true,
          checkedInAt: new Date(),
          checkedInBy: req.user.id,
          giftsReceived: result.giftsDistributed.map(gift => ({
            inventoryId: gift.inventoryId,
            quantity: gift.quantity,
            distributedAt: new Date()
          })),
          ...(pickupPrefs != null && { pickupFieldPreferencesAtCheckin: pickupPrefs })
        });
      }

      checkinRecords.push(checkinRecord);
    }

    // Update inventory counts
    for (const [inventoryId, totalQuantity] of inventoryUpdates) {
      if (!isValidInventoryId(inventoryId)) continue;
      const inventoryItem = await Inventory.findById(inventoryId);
      await inventoryItem.updateInventory(
        inventoryItem.currentInventory - totalQuantity,
        'checkin_distributed',
        req.user.id,
        `Distributed to ${guest.firstName} ${guest.lastName} across ${results.filter(r => r.success).length} events`
      );
    }

    // Save guest - hasCheckedIn will be automatically derived from eventCheckins via pre-save hook
    await guest.save();

    if (mainIdForPickup) {
      const nowFullyPickedUpOnMain = await guestFullyPickedUpOnMainProgram(guest, mainIdForPickup);
      if (!wasFullyPickedUpOnMain && nowFullyPickedUpOnMain) {
        try {
          await ActivityLog.create({
            eventId: mainIdForPickup,
            type: 'main_event_fully_picked_up',
            performedBy: req.user.id,
            details: {
              guestId: guest._id,
              guestName: `${guest.firstName} ${guest.lastName}`.trim()
            },
            timestamp: new Date()
          });
        } catch (logErr) {
          console.error('Failed to log main_event_fully_picked_up:', logErr);
        }
      }
    }

    // Populate the updated guest with eventCheckins for frontend
    await guest.populate([
      { path: 'eventId', select: 'eventName isMainEvent' },
      { path: 'eventCheckins.eventId', select: 'eventName isMainEvent' },
      { path: 'eventCheckins.giftsReceived.inventoryId', select: 'type style product size gender color' }
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
      if (isValidInventoryId(inventoryId)) await Inventory.recalculateCurrentInventory(inventoryId);
    }

    // After guest and inventory are updated, log activity for each event check-in
    for (const record of checkinRecords) {
      try {
        console.log('[checkin-activity-log] multiEventCheckin before ActivityLog.create', {
          recordEventId: record.eventId?._id || record.eventId,
          giftsDistributedLength: record.giftsDistributed?.length,
          giftsDistributed: record.giftsDistributed
        });
        let giftsReceivedSummary = [];
        try {
          giftsReceivedSummary = await buildGiftsReceivedSummaryFromDistributed(record.giftsDistributed);
        } catch (sumErr) {
          console.error('Failed to build giftsReceivedSummary for activity log:', sumErr);
        }
        const checkinEventName = record.eventId?.eventName || '';
        console.log('[checkin-activity-log] multiEventCheckin saving ActivityLog with', {
          checkinEventName,
          giftsReceivedSummary
        });
        await ActivityLog.create({
          eventId: record.eventId,
          type: 'checkin',
          performedBy: req.user.id,
          details: {
            guestId: guest._id,
            guestName: `${guest.firstName} ${guest.lastName}`,
            giftsDistributed: record.giftsDistributed,
            notes: notes || '',
            checkinEventName,
            giftsReceivedSummary
          },
          timestamp: new Date()
        });
      } catch (logErr) {
        console.error('Failed to log check-in activity:', logErr);
      }
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
    const { guestId, eventId, selectedGifts, notes, pickupFieldPreferences } = req.body;

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

    const mainIdForPickup = resolveMainProgramIdFromEventDoc(event);
    const wasFullyPickedUpOnMain = await guestFullyPickedUpOnMainProgram(guest, mainIdForPickup);

    const giftsDistributed = [];

    // Process gift selections (skip invalid/empty inventoryId)
    if (selectedGifts && selectedGifts.length > 0) {
      for (const gift of selectedGifts) {
        if (!isValidInventoryId(gift.inventoryId)) continue;
        const inventoryItem = await Inventory.findById(gift.inventoryId);
        if (!inventoryItem) {
          return res.status(404).json({ message: `Inventory item not found: ${gift.inventoryId}` });
        }

        // Inventory is for counts only; allow check-in even if inventory is 0 or negative
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

    const pickupPrefs = pickupFieldPreferences ?? event.pickupFieldPreferences ?? undefined;

    // Check if guest already has a check-in record for this event with no gifts
    const existingCheckin = guest.eventCheckins.find(ec => 
      ec.eventId.toString() === eventId.toString() && 
      ec.checkedIn && 
      (!ec.giftsReceived || ec.giftsReceived.length === 0)
    );

    let checkin;
    if (existingCheckin) {
      // Update existing check-in record with gifts
      existingCheckin.giftsReceived = giftsDistributed.map(gift => ({
        inventoryId: gift.inventoryId,
        quantity: gift.quantity,
        distributedAt: new Date()
      }));
      existingCheckin.checkedInAt = new Date();
      existingCheckin.checkedInBy = req.user.id;
      if (pickupPrefs != null) existingCheckin.pickupFieldPreferencesAtCheckin = pickupPrefs;

      // Create or update the Checkin document
      const existingCheckinDoc = await Checkin.findOne({ guestId, eventId });
      if (existingCheckinDoc) {
        existingCheckinDoc.giftsDistributed = giftsDistributed;
        existingCheckinDoc.notes = notes;
        if (pickupPrefs != null) existingCheckinDoc.pickupFieldPreferencesAtCheckin = pickupPrefs;
        checkin = await existingCheckinDoc.save();
      } else {
        checkin = await Checkin.create({
          guestId,
          eventId,
          checkedInBy: req.user.id,
          giftsDistributed,
          notes,
          pickupFieldPreferencesAtCheckin: pickupPrefs
        });
      }
    } else {
      // Create new checkin record
      checkin = await Checkin.create({
        guestId,
        eventId,
        checkedInBy: req.user.id,
        giftsDistributed,
        notes,
        pickupFieldPreferencesAtCheckin: pickupPrefs
      });

      // Add new event check-in record
      guest.eventCheckins.push({
        eventId,
        checkedIn: true,
        checkedInAt: new Date(),
        checkedInBy: req.user.id,
        giftsReceived: giftsDistributed.map(gift => ({
          inventoryId: gift.inventoryId,
          quantity: gift.quantity,
          distributedAt: new Date()
        })),
        ...(pickupPrefs != null && { pickupFieldPreferencesAtCheckin: pickupPrefs })
      });
    }

    // Save guest - hasCheckedIn will be automatically derived from eventCheckins via pre-save hook
    await guest.save();

    if (mainIdForPickup) {
      const nowFullyPickedUpOnMain = await guestFullyPickedUpOnMainProgram(guest, mainIdForPickup);
      if (!wasFullyPickedUpOnMain && nowFullyPickedUpOnMain) {
        try {
          await ActivityLog.create({
            eventId: mainIdForPickup,
            type: 'main_event_fully_picked_up',
            performedBy: req.user.id,
            details: {
              guestId: guest._id,
              guestName: `${guest.firstName} ${guest.lastName}`.trim()
            },
            timestamp: new Date()
          });
        } catch (logErr) {
          console.error('Failed to log main_event_fully_picked_up:', logErr);
        }
      }
    }

    // Recalculate current inventory for each inventory item
    for (const gift of giftsDistributed) {
      if (isValidInventoryId(gift.inventoryId)) await Inventory.recalculateCurrentInventory(gift.inventoryId);
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
      { path: 'eventCheckins.giftsReceived.inventoryId', select: 'type style product size gender color' }
    ]);

    // After guest and inventory are updated, log activity for each event check-in
    try {
      console.log('[checkin-activity-log] singleEventCheckin before ActivityLog.create', {
        eventId: event._id,
        giftsDistributedLength: giftsDistributed?.length,
        giftsDistributed
      });
      let giftsReceivedSummary = [];
      try {
        giftsReceivedSummary = await buildGiftsReceivedSummaryFromDistributed(giftsDistributed);
      } catch (sumErr) {
        console.error('Failed to build giftsReceivedSummary for activity log:', sumErr);
      }
      console.log('[checkin-activity-log] singleEventCheckin saving ActivityLog with', {
        checkinEventName: event.eventName || '',
        giftsReceivedSummary
      });
      await ActivityLog.create({
        eventId: event._id,
        type: 'checkin',
        performedBy: req.user.id,
        details: {
          guestId: guest._id,
          guestName: `${guest.firstName} ${guest.lastName}`,
          giftsDistributed: giftsDistributed,
          notes: notes || '',
          checkinEventName: event.eventName || '',
          giftsReceivedSummary
        },
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error('Failed to log check-in activity:', logErr);
    }

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
      .populate('giftsDistributed.inventoryId', 'type style product size gender color')
      .sort({ createdAt: -1 });

    res.json({ checkins });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.undoCheckin = async (req, res) => {
  try {
    const { checkinId } = req.params;
    const { reason, guestId, eventId } = req.body;

    console.log('=== UNDO CHECKIN DEBUG ===');
    console.log('checkinId from params:', checkinId);
    console.log('guestId from body:', guestId);
    console.log('eventId from body:', eventId);

    // Try to find by checkinId first (if it's a real Checkin document)
    let checkin = await Checkin.findById(checkinId)
      .populate('guestId')
      .populate('giftsDistributed.inventoryId');

    console.log('Found checkin by ID:', checkin ? 'YES' : 'NO');

    // If not found by checkinId, try to find by guestId and eventId
    if (!checkin && guestId && eventId) {
      console.log('Trying to find by guestId and eventId...');
      checkin = await Checkin.findOne({ guestId, eventId })
        .populate('guestId')
        .populate('giftsDistributed.inventoryId');
      console.log('Found checkin by guestId/eventId:', checkin ? 'YES' : 'NO');
    }

    // Let's also check what checkins exist for this guest
    if (!checkin && guestId) {
      console.log('Checking all checkins for this guest...');
      const allCheckins = await Checkin.find({ guestId });
      console.log('All checkins for guest:', allCheckins.length);
      allCheckins.forEach((c, i) => {
        console.log(`Checkin ${i}:`, c._id.toString(), 'for event:', c.eventId.toString());
      });
    }

    if (!checkin) {
      console.log('=== NO CHECKIN FOUND ===');
      return res.status(404).json({ message: 'Check-in not found' });
    }

    // Restore inventory
    for (const gift of checkin.giftsDistributed) {
      const id = gift.inventoryId?._id ?? gift.inventoryId;
      if (!isValidInventoryId(id)) continue;
      const inventoryItem = await Inventory.findById(id);
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

    // Save guest - hasCheckedIn will be automatically derived from eventCheckins via pre-save hook
    await guest.save();

    // Log activity before deleting
    await ActivityLog.create({
      eventId: checkin.eventId,
      type: 'undo_checkin',
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
      const id = gift.inventoryId?._id ?? gift.inventoryId;
      if (isValidInventoryId(id)) await Inventory.recalculateCurrentInventory(id);
    }

    // Emit WebSocket update for analytics
    emitAnalyticsUpdate(checkin.eventId);

    res.json({
      success: true,
      message: 'Check-in undone successfully'
    });

  } catch (error) {
    console.error('Error in undoCheckin:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateCheckinGifts = async (req, res) => {
  try {
    const { checkinId } = req.params;
    const { newGifts, reason, guestId, eventId } = req.body; // newGifts: [{ inventoryId, quantity, notes }]

    console.log('=== UPDATE CHECKIN GIFTS DEBUG ===');
    console.log('checkinId from params:', checkinId);
    console.log('guestId from body:', guestId);
    console.log('eventId from body:', eventId);
    console.log('newGifts from body:', newGifts);
    console.log('reason from body:', reason);

    let checkin = await Checkin.findById(checkinId)
    .populate('guestId')
    .populate('giftsDistributed.inventoryId');

  console.log('Found checkin by ID:', checkin ? 'YES' : 'NO');

  // If not found by checkinId, try to find by guestId and eventId
  if (!checkin && guestId && eventId) {
    console.log('Trying to find by guestId and eventId...');
    checkin = await Checkin.findOne({ guestId, eventId })
      .populate('guestId')
      .populate('giftsDistributed.inventoryId');
    console.log('Found checkin by guestId/eventId:', checkin ? 'YES' : 'NO');
  }

  if (!checkin) {
    console.log('=== NO CHECKIN FOUND ===');
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

    // Track old gifts (skip invalid inventoryId)
    for (const gift of checkin.giftsDistributed) {
      const id = gift.inventoryId?._id ?? gift.inventoryId;
      if (!isValidInventoryId(id)) continue;
      const key = id.toString();
      oldGifts.set(key, gift.quantity);
      inventoryChanges.set(key, gift.quantity); // Will be subtracted
    }

    // Track new gifts (skip invalid inventoryId)
    for (const gift of newGifts) {
      if (!isValidInventoryId(gift.inventoryId)) continue;
      const key = gift.inventoryId;
      newGiftsMap.set(key, gift.quantity);
      const currentChange = inventoryChanges.get(key) || 0;
      inventoryChanges.set(key, currentChange - gift.quantity); // Subtract new quantity
    }

    // Validate inventory availability for new gifts
    for (const [inventoryId, change] of inventoryChanges) {
      if (!isValidInventoryId(inventoryId)) continue;
      if (change < 0) { // We're adding more than we had
        const inventoryItem = await Inventory.findById(inventoryId);
        if (!inventoryItem) {
          return res.status(404).json({ message: `Inventory item not found: ${inventoryId}` });
        }
      }
    }

    // Restore old gifts to inventory
    for (const [inventoryId, quantity] of oldGifts) {
      if (!isValidInventoryId(inventoryId)) continue;
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
      if (!isValidInventoryId(gift.inventoryId)) continue;
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

    // Update checkin record (only persist valid inventoryIds)
    checkin.giftsDistributed = newGifts
      .filter(g => isValidInventoryId(g.inventoryId))
      .map(gift => ({
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
      guestCheckin.giftsReceived = newGifts
        .filter(g => isValidInventoryId(g.inventoryId))
        .map(gift => ({
          inventoryId: gift.inventoryId,
          quantity: gift.quantity,
          distributedAt: new Date()
        }));
      await guest.save();
    }

    // Recalculate current inventory for affected items
    for (const [inventoryId] of inventoryChanges) {
      if (isValidInventoryId(inventoryId)) await Inventory.recalculateCurrentInventory(inventoryId);
    }

    // Log activity
    await ActivityLog.create({
      eventId: checkin.eventId,
      type: 'update_gifts',
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
    console.error('Error in updateCheckinGifts:', error);
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
      const id = gift.inventoryId?._id ?? gift.inventoryId;
      if (!isValidInventoryId(id)) continue;
      const inventoryItem = await Inventory.findById(id);
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

    // Save guest - hasCheckedIn will be automatically derived from eventCheckins via pre-save hook
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