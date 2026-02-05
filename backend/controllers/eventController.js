const Event = require('../models/Event');
const ActivityLog = require('../models/ActivityLog');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

exports.getEvents = async (req, res) => {
  try {
    const { parentEventId, status, includeArchived } = req.query;
    let filter = { isActive: true };

    if (parentEventId) {
      filter.parentEventId = parentEventId;
    }

    // Handle archived events filtering
    if (includeArchived === 'true') {
      // When including archived events, remove isActive filter and set isArchived to true
      delete filter.isActive;
      filter.isArchived = true;
    } else {
      // By default, exclude archived events
      filter.isArchived = false;
    }

    // Filter by status if provided
    if (status) {
      filter.status = status;
    }

    const events = await Event.find(filter)
      .populate('createdBy', 'username email profileColor firstName lastName')
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
      // Secondary events use the same contract number as parent
      eventData.eventContractNumber = parentEvent.eventContractNumber;
    } else {
      // For main events, check if contract number is already in use
      const existingEvent = await Event.findOne({ 
        eventContractNumber: eventContractNumber.toUpperCase(),
        isMainEvent: true,
        isActive: true
      });
      
      if (existingEvent) {
        return res.status(400).json({ 
          message: `Contract number "${eventContractNumber}" is already in use by event "${existingEvent.eventName}". Please use a different contract number.` 
        });
      }
    }

    const event = await Event.create(eventData);
    await event.populate('createdBy', 'username email profileColor firstName lastName');

    // Log event creation
    await ActivityLog.create({
      eventId: event._id,
      type: 'event_create',
      performedBy: req.user.id,
      details: {
        eventName: event.eventName,
        eventContractNumber: event.eventContractNumber,
        eventStart: event.eventStart,
        eventEnd: event.eventEnd,
        parentEventId: event.parentEventId || null
      },
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      event
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'username email profileColor firstName lastName');

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

    // Role checks are now handled by route middleware (requireOperationsOrAdmin)
    // This ensures only operations managers and admins can access this endpoint

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email profileColor firstName lastName');

    // Log event update
    await ActivityLog.create({
      eventId: updatedEvent._id,
      type: 'event_update',
      performedBy: req.user.id,
      details: req.body,
      timestamp: new Date()
    });

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

/**
 * Analytics endpoint for comprehensive event and gift analytics
 * 
 * @route GET /api/events/:id/analytics
 * @param {string} id - Event ID (from URL params)
 * @param {string} [startDate] - Optional start date filter (ISO 8601 format, e.g., "2025-02-27T00:00:00.000Z" or "2025-02-27")
 * @param {string} [endDate] - Optional end date filter (ISO 8601 format)
 * @returns {Object} Comprehensive analytics including event stats, gift distribution, inventory, and timeline
 * 
 * Date filtering applies to:
 * - Gift distribution data (filtered by check-in createdAt)
 * - Check-in timeline data (filtered by check-in createdAt)
 * 
 * If no date filters provided, returns all data for the event.
 */
exports.getEventAnalytics = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { startDate, endDate, timelineGroupBy } = req.query;
    
    const timelineFormat = (timelineGroupBy === 'hour')
      ? '%Y-%m-%dT%H'
      : (timelineGroupBy === 'minute')
        ? '%Y-%m-%dT%H:%M'
        : '%Y-%m-%d';
    
    console.log('📥 Backend received request:', {
      eventId,
      startDate,
      endDate,
      timelineGroupBy: timelineGroupBy || 'day',
      queryParams: req.query
    });
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const Checkin = require('../models/Checkin');
    const Inventory = require('../models/Inventory');
    const Guest = require('../models/Guest');

    // Get all check-ins for this event and its secondary events
    const eventIds = [eventId];
    if (event.isMainEvent) {
      const secondaryEvents = await Event.find({ parentEventId: eventId });
      eventIds.push(...secondaryEvents.map(e => e._id));
    }

    // Build date filter from query parameters
    // If dates provided, filter by createdAt on check-ins
    // Format: ISO 8601 strings (e.g., "2025-02-27T00:00:00.000Z" or "2025-02-27")
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
        console.log('📅 Applied startDate filter:', dateFilter.createdAt.$gte);
      }
      if (endDate) {
        // If endDate is just a date string without time, set to end of day
        const endDateObj = new Date(endDate);
        if (endDate.split('T').length === 1) {
          endDateObj.setHours(23, 59, 59, 999);
        }
        dateFilter.createdAt.$lte = endDateObj;
        console.log('📅 Applied endDate filter:', dateFilter.createdAt.$lte);
      }
      console.log('📊 Final dateFilter:', JSON.stringify(dateFilter, null, 2));
    } else {
      console.log('📊 No date filters provided - returning all data');
    }

    // 1. EVENT ANALYTICS - Guest Check-in Statistics
    // Calculate based on Guest model's eventCheckins array to match Guest Table behavior
    // This ensures consistency between analytics and the guest list view
    // Note: Guest stats are NOT filtered by date - they represent current state of all guests
    
    // Convert eventIds to ObjectIds for matching
    const mongoose = require('mongoose');
    const eventIdObjects = eventIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id);
    
    // Build $or conditions for each eventId to check in eventCheckins
    const eventIdConditions = eventIdObjects.map(eventId => ({
      $eq: ['$$checkin.eventId', eventId]
    }));
    
    const guestStats = await Guest.aggregate([
      { 
        $match: { 
          eventId: { $in: eventIdObjects }
        } 
      },
      {
        $addFields: {
          hasCheckedIn: {
            // Check if guest has any check-in record in eventCheckins for any of the events
            $anyElementTrue: {
              $map: {
                input: { $ifNull: ['$eventCheckins', []] },
                as: 'checkin',
                in: {
                  $or: eventIdConditions
                }
              }
            }
          }
        } 
      },
      {
        $group: {
          _id: null,
          totalGuests: { $sum: 1 },
          checkedInGuests: { $sum: { $cond: ['$hasCheckedIn', 1, 0] } },
          pendingGuests: { $sum: { $cond: ['$hasCheckedIn', 0, 1] } }
        }
      }
    ]);

    const stats = guestStats[0] || { totalGuests: 0, checkedInGuests: 0, pendingGuests: 0 };
    const checkInPercentage = stats.totalGuests > 0 
      ? Math.round((stats.checkedInGuests / stats.totalGuests) * 100) 
      : 0;
    
    const eventStats = {
      ...stats,
      checkInPercentage
    };

    // 2. GIFT ANALYTICS - Distribution Data
    // Note: eventIdObjects is already defined above for guest stats calculation
    const giftDistributionMatch = {
      eventId: { $in: eventIdObjects }
    };
    
    // Apply date filtering if provided
    if (Object.keys(dateFilter).length > 0) {
      Object.assign(giftDistributionMatch, dateFilter);
    }
    
    const giftDistribution = await Checkin.aggregate([
      { 
        $match: giftDistributionMatch
      },
      { $unwind: '$giftsDistributed' },
      {
        $lookup: {
          from: 'inventories',
          localField: 'giftsDistributed.inventoryId',
          foreignField: '_id',
          as: 'inventoryItem'
        }
      },
      { $unwind: '$inventoryItem' },
      {
        $group: {
          _id: {
            inventoryId: '$giftsDistributed.inventoryId',
            style: '$inventoryItem.style',
            type: '$inventoryItem.type',
            product: '$inventoryItem.product',
            size: '$inventoryItem.size'
          },
          totalQuantity: { $sum: '$giftsDistributed.quantity' },
          distributedCount: { $sum: 1 },
          uniqueGuests: { $addToSet: '$guestId' }
        }
      },
      {
        $project: {
          _id: 0,
          inventoryId: '$_id.inventoryId',
          style: '$_id.style',
          type: '$_id.type',
          product: '$_id.product',
          size: '$_id.size',
          totalQuantity: 1,
          distributedCount: 1,
          uniqueGuestCount: { $size: '$uniqueGuests' }
        }
      },
      { $sort: { totalQuantity: -1 } }
    ]);

    // Create gift distribution object
    const giftDistributionMap = {};
    giftDistribution.forEach(item => {
      const key = `${item.style} - ${item.size}`;
      giftDistributionMap[key] = {
        inventoryId: item.inventoryId,
        style: item.style,
        type: item.type,
        size: item.size,
        totalQuantity: item.totalQuantity,
        distributedCount: item.distributedCount,
        uniqueGuestCount: item.uniqueGuestCount
      };
    });

    // 3. GIFT ANALYTICS - Category Breakdown
    const categoryTotals = {};
    giftDistribution.forEach(item => {
      const category = getGiftCategory(item.style, item.type);
      categoryTotals[category] = (categoryTotals[category] || 0) + item.totalQuantity;
    });

    // 4. GIFT ANALYTICS - Top Performing Items
    const topGifts = giftDistribution
      .slice(0, 10)
      .map(item => ({
        name: `${item.style} ${item.size ? `(${item.size})` : ''}`.trim(),
        type: item.type,
        style: item.style,
        size: item.size,
        totalQuantity: item.totalQuantity,
        distributedCount: item.distributedCount,
        uniqueGuestCount: item.uniqueGuestCount
      }));

    // 5. INVENTORY ANALYTICS - Current Stock Levels
    const inventoryAnalytics = await Inventory.aggregate([
      { 
        $match: { 
          eventId: { $in: eventIds.map(id => id.toString()) },
          isActive: true 
        } 
      },
      {
        $group: {
          _id: {
            type: '$type',
            style: '$style'
          },
          totalWarehouse: { $sum: '$qtyWarehouse' },
          totalOnSite: { $sum: '$qtyOnSite' },
          currentInventory: { $sum: '$currentInventory' },
          itemCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          type: '$_id.type',
          style: '$_id.style',
          totalWarehouse: 1,
          totalOnSite: 1,
          currentInventory: 1,
          itemCount: 1,
          utilizationRate: {
            $cond: {
              if: { $gt: [{ $add: ['$totalWarehouse', '$totalOnSite'] }, 0] },
              then: {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: [{ $add: ['$totalWarehouse', '$totalOnSite'] }, '$currentInventory'] },
                      { $add: ['$totalWarehouse', '$totalOnSite'] }
                    ]
                  },
                  100
                ]
              },
              else: 0
            }
          }
        }
      },
      { $sort: { currentInventory: -1 } }
    ]);

    // 6. EVENT ANALYTICS - Check-in Timeline
    // If date filters provided, use them; otherwise return all timeline data
    // Note: eventIdObjects is already defined above for guest stats calculation
    const checkInTimelineMatch = {
      eventId: { $in: eventIdObjects }
    };
    
    // Apply date filtering if provided
    if (Object.keys(dateFilter).length > 0) {
      Object.assign(checkInTimelineMatch, dateFilter);
    }
    
    const checkInTimeline = await Checkin.aggregate([
      { 
        $match: checkInTimelineMatch
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: timelineFormat, date: '$createdAt', timezone: 'UTC' } }
          },
          checkIns: { $sum: 1 },
          giftsDistributed: { $sum: { $size: '$giftsDistributed' } }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // 7. DETAILED CHECK-IN LIST (for display in table)
    // Get all check-ins with guest and user details, filtered by date if provided
    const detailedCheckInsMatch = {
      eventId: { $in: eventIdObjects }
    };
    
    // Apply date filtering if provided
    if (Object.keys(dateFilter).length > 0) {
      Object.assign(detailedCheckInsMatch, dateFilter);
    }
    
    const detailedCheckIns = await Checkin.aggregate([
      { $match: detailedCheckInsMatch },
      {
        $lookup: {
          from: 'guests',
          localField: 'guestId',
          foreignField: '_id',
          as: 'guest'
        }
      },
      { $unwind: '$guest' },
      {
        $lookup: {
          from: 'users',
          localField: 'checkedInBy',
          foreignField: '_id',
          as: 'checkedInByUser'
        }
      },
      { $unwind: { path: '$checkedInByUser', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          guestId: 1,
          eventId: 1,
          guestName: {
            $concat: [
              { $ifNull: ['$guest.firstName', ''] },
              ' ',
              { $ifNull: ['$guest.lastName', ''] }
            ]
          },
          guestEmail: { $ifNull: ['$guest.email', ''] },
          checkedInAt: '$createdAt',
          checkedInBy: {
            $concat: [
              { $ifNull: ['$checkedInByUser.firstName', ''] },
              ' ',
              { $ifNull: ['$checkedInByUser.lastName', '$checkedInByUser.username', 'Unknown'] }
            ]
          },
          checkedInByUsername: { $ifNull: ['$checkedInByUser.username', 'Unknown'] },
          giftsCount: { $size: { $ifNull: ['$giftsDistributed', []] } },
          notes: { $ifNull: ['$notes', ''] }
        }
      },
      { $sort: { checkedInAt: -1 } }
    ]);

    // 8. COMPREHENSIVE SUMMARY
    const totalGiftsDistributed = giftDistribution.reduce((sum, item) => sum + item.totalQuantity, 0);
    const uniqueItemsDistributed = giftDistribution.length;
    const totalInventoryItems = inventoryAnalytics.length;
    const averageUtilizationRate = inventoryAnalytics.length > 0 
      ? inventoryAnalytics.reduce((sum, item) => sum + item.utilizationRate, 0) / inventoryAnalytics.length 
      : 0;

    res.json({
      success: true,
      analytics: {
        // Event Analytics
        eventStats: {
          totalGuests: eventStats.totalGuests,
          checkedInGuests: eventStats.checkedInGuests,
          pendingGuests: eventStats.pendingGuests,
          checkInPercentage: checkInPercentage,
          eventName: event.eventName,
          eventContractNumber: event.eventContractNumber,
          isMainEvent: event.isMainEvent
        },
        
        // Gift Analytics
        giftDistribution: giftDistributionMap,
        categoryTotals,
        topGifts,
        giftSummary: {
          totalGiftsDistributed,
          uniqueItemsDistributed,
          averageGiftsPerGuest: eventStats.checkedInGuests > 0 
            ? Math.round((totalGiftsDistributed / eventStats.checkedInGuests) * 100) / 100 
            : 0
        },
        
        // Inventory Analytics
        inventoryAnalytics,
        inventorySummary: {
          totalInventoryItems,
          averageUtilizationRate: Math.round(averageUtilizationRate * 100) / 100,
          lowStockItems: inventoryAnalytics.filter(item => item.currentInventory < 5).length
        },
        
        // Timeline Analytics
        checkInTimeline,
        
        // Detailed Check-in List (for table display)
        detailedCheckIns,
        
        // Raw Data for Advanced Processing
        rawGiftDistribution: giftDistribution,
        secondaryEvents: event.isMainEvent ? await Event.find({ parentEventId: eventId }).select('eventName eventContractNumber') : []
      }
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Helper function to categorize gifts
function getGiftCategory(style, type) {
  const styleLower = style.toLowerCase();
  const typeLower = type.toLowerCase();
  
  // Check for shoes
  if (styleLower.includes('nike') || styleLower.includes('shoe') || styleLower.includes('sneaker') || 
      typeLower.includes('shoe') || typeLower.includes('footwear')) {
    return 'Custom Shoes';
  }
  
  // Check for hats
  if (styleLower.includes('hat') || styleLower.includes('cap') || typeLower.includes('hat')) {
    return 'Hats';
  }
  
  // Check for clothing
  if (styleLower.includes('shirt') || styleLower.includes('t-shirt') || styleLower.includes('hoodie') || 
      styleLower.includes('jacket') || styleLower.includes('sweater') || typeLower.includes('clothing')) {
    return 'Clothing';
  }
  
  // Check for accessories
  if (styleLower.includes('bag') || styleLower.includes('backpack') || styleLower.includes('tote') ||
      styleLower.includes('wallet') || styleLower.includes('keychain') || typeLower.includes('accessory')) {
    return 'Accessories';
  }
  
  // Default category
  return 'Other';
}

// Get inventory for a specific event
exports.getEventInventory = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const Inventory = require('../models/Inventory');

    // Get inventory items that are:
    // 1. Active (isActive: true)
    // 2. Linked to this specific event (eventId matches)
    const inventory = await Inventory.find({ 
      eventId: eventId,
      isActive: true 
    }).sort({ type: 1, style: 1, size: 1 });

    res.json({
      success: true,
      inventory,
      event: {
        id: event._id,
        name: event.eventName,
        contractNumber: event.eventContractNumber
      }
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Archive an event
exports.archiveEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check permissions - only operations manager, admin, or event creator can archive
    if (req.user.role !== 'admin' && 
        req.user.role !== 'operations_manager' && 
        event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Archive the event and all its secondary events
    await Event.updateMany(
      { $or: [{ _id: req.params.id }, { parentEventId: req.params.id }] },
      { 
        $set: { 
          isArchived: true, 
          status: 'archived',
          archivedAt: new Date(),
          archivedBy: req.user.id
        } 
      }
    );

    // Log event archiving
    await ActivityLog.create({
      eventId: event._id,
      type: 'event_archive',
      performedBy: req.user.id,
      details: {
        eventName: event.eventName,
        eventContractNumber: event.eventContractNumber,
        archivedAt: new Date()
      },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: `Event "${event.eventName}" and its secondary events have been archived`
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Unarchive an event
exports.unarchiveEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check permissions - only operations manager, admin, or event creator can unarchive
    if (req.user.role !== 'admin' && 
        req.user.role !== 'operations_manager' && 
        event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Unarchive the event and all its secondary events
    await Event.updateMany(
      { $or: [{ _id: req.params.id }, { parentEventId: req.params.id }] },
      { 
        $set: { 
          isArchived: false, 
          status: 'active',
          unarchivedAt: new Date(),
          unarchivedBy: req.user.id
        },
        $unset: { archivedAt: 1, archivedBy: 1 }
      }
    );

    // Log event unarchiving
    await ActivityLog.create({
      eventId: event._id,
      type: 'event_unarchive',
      performedBy: req.user.id,
      details: {
        eventName: event.eventName,
        eventContractNumber: event.eventContractNumber,
        unarchivedAt: new Date()
      },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: `Event "${event.eventName}" and its secondary events have been unarchived`
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update event status (active/closed)
exports.updateEventStatus = async (req, res) => {
  try {
    const { status } = req.body;
    console.log('UpdateEventStatus - Request body:', req.body);
    console.log('UpdateEventStatus - Status:', status);
    console.log('UpdateEventStatus - Event ID:', req.params.id);
    
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check permissions - only operations manager, admin, or event creator can update status
    if (req.user.role !== 'admin' && 
        req.user.role !== 'operations_manager' && 
        event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!['active', 'closed'].includes(status)) {
      console.log('UpdateEventStatus - Invalid status:', status);
      return res.status(400).json({ message: 'Status must be either "active" or "closed"' });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email profileColor firstName lastName');

    console.log('UpdateEventStatus - Event updated successfully:', updatedEvent);

    // Log status change
    try {
      await ActivityLog.create({
        eventId: event._id,
        type: 'event_status_change',
        performedBy: req.user.id,
        details: {
          eventName: event.eventName,
          eventContractNumber: event.eventContractNumber,
          oldStatus: event.status,
          newStatus: status,
          changedAt: new Date()
        },
        timestamp: new Date()
      });
      console.log('UpdateEventStatus - Activity log created successfully');
    } catch (logError) {
      console.error('UpdateEventStatus - Error creating activity log:', logError);
      // Don't fail the request if activity logging fails
    }

    res.json({ event: updatedEvent });

  } catch (error) {
    console.error('UpdateEventStatus - Error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Update pickup field preferences for an event
exports.updatePickupFieldPreferences = async (req, res) => {
  try {
    const { pickupFieldPreferences } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check permissions - only operations manager and admin can update preferences
    if (req.user.role !== 'admin' && req.user.role !== 'operations_manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate preferences structure
    const validFields = ['type', 'brand', 'product', 'size', 'gender', 'color'];
    const preferences = {};
    
    validFields.forEach(field => {
      if (pickupFieldPreferences && typeof pickupFieldPreferences[field] === 'boolean') {
        preferences[field] = pickupFieldPreferences[field];
      } else {
        // Use defaults if not provided
        preferences[field] = field === 'brand' ? true : false;
      }
    });

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { pickupFieldPreferences: preferences },
      { new: true, runValidators: true }
    );

    res.json({ 
      success: true,
      event: updatedEvent,
      pickupFieldPreferences: updatedEvent.pickupFieldPreferences
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Check if contract number is available for main events
exports.checkContractAvailability = async (req, res) => {
  try {
    const { contractNumber } = req.params;
    
    if (!contractNumber) {
      return res.status(400).json({ message: 'Contract number is required' });
    }

    // Check if contract number is already in use by a main event
    const existingEvent = await Event.findOne({ 
      eventContractNumber: contractNumber.toUpperCase(),
      isMainEvent: true,
      isActive: true
    });

    res.json({
      available: !existingEvent,
      message: existingEvent 
        ? `Contract number "${contractNumber}" is already in use by event "${existingEvent.eventName}"`
        : `Contract number "${contractNumber}" is available`
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ---------- Client Portal (Ops) ----------
const generatePortalPassword = () => crypto.randomBytes(10).toString('base64').replace(/[+/=]/g, '').slice(0, 12);

const ensureClientPortalDefaults = (event) => {
  const now = new Date();
  const startDate = event.eventStart ? new Date(event.eventStart) : now;
  const closeAt = new Date(startDate);
  closeAt.setDate(closeAt.getDate() + 30);
  return {
    enabled: false,
    allowedEmails: [],
    openAt: startDate,
    closeAt,
    options: { allowCsvExport: false },
    createdAt: now,
    updatedAt: now
  };
};

const toClientPortalResponse = (event, passwordPlain = null) => {
  const cp = event.clientPortal || {};
  const out = {
    enabled: !!cp.enabled,
    allowedEmails: Array.isArray(cp.allowedEmails) ? cp.allowedEmails : [],
    openAt: cp.openAt || null,
    closeAt: cp.closeAt || null,
    options: { allowCsvExport: !!(cp.options && cp.options.allowCsvExport) }
  };
  if (passwordPlain) out.passwordPlain = passwordPlain;
  return out;
};

exports.getClientPortal = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const cp = event.clientPortal;
    const neverInitialized = !cp || (cp.passwordHash == null && cp.enabled !== true);

    if (neverInitialized) {
      const defaults = ensureClientPortalDefaults(event);
      const passwordPlain = generatePortalPassword();
      const passwordHash = await bcrypt.hash(passwordPlain, 10);
      event.clientPortal = {
        ...defaults,
        passwordHash
      };
      await event.save();
      return res.json({
        settings: toClientPortalResponse(event, passwordPlain),
        passwordPlain
      });
    }

    return res.json({ settings: toClientPortalResponse(event) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateClientPortal = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const existing = event.clientPortal || ensureClientPortalDefaults(event);
    const wasEnabled = !!existing.enabled;
    const { enabled, allowedEmails, openAt, closeAt, options } = req.body;

    let passwordPlain = null;
    let passwordHash = existing.passwordHash;
    if (enabled === true && !wasEnabled) {
      passwordPlain = generatePortalPassword();
      passwordHash = await bcrypt.hash(passwordPlain, 10);
    }

    const now = new Date();
    const updatedPortal = {
      enabled: typeof enabled === 'boolean' ? enabled : !!existing.enabled,
      passwordHash,
      allowedEmails: Array.isArray(allowedEmails)
        ? allowedEmails.map(e => (e || '').trim()).filter(Boolean)
        : (Array.isArray(existing.allowedEmails) ? existing.allowedEmails : []),
      openAt: openAt !== undefined ? (openAt ? new Date(openAt) : null) : (existing.openAt || null),
      closeAt: closeAt !== undefined ? (closeAt ? new Date(closeAt) : null) : (existing.closeAt || null),
      options: {
        allowCsvExport: options && typeof options.allowCsvExport === 'boolean'
          ? options.allowCsvExport
          : !!(existing.options && existing.options.allowCsvExport)
      },
      createdAt: existing.createdAt || now,
      updatedAt: now
    };

    event.clientPortal = updatedPortal;
    event.markModified('clientPortal');
    await event.save();

    const response = { settings: toClientPortalResponse(event, passwordPlain || undefined) };
    if (passwordPlain) response.passwordPlain = passwordPlain;
    return res.json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.regenerateClientPortalPassword = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const cp = event.clientPortal || ensureClientPortalDefaults(event);
    const passwordPlain = generatePortalPassword();
    cp.passwordHash = await bcrypt.hash(passwordPlain, 10);
    cp.updatedAt = new Date();
    event.clientPortal = cp;
    await event.save();

    return res.json({
      settings: toClientPortalResponse(event),
      passwordPlain
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};