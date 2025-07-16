const Event = require('../models/Event');
const ActivityLog = require('../models/ActivityLog');

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
      // Secondary events use the same contract number as parent
      eventData.eventContractNumber = parentEvent.eventContractNumber;
    }

    const event = await Event.create(eventData);
    await event.populate(['createdBy']);

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

    // Role checks are now handled by route middleware (requireOperationsOrAdmin)
    // This ensures only operations managers and admins can access this endpoint

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email');

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

// Analytics endpoint for comprehensive event and gift analytics
exports.getEventAnalytics = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    
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

    // 1. EVENT ANALYTICS - Guest Check-in Statistics
    const guestStats = await Guest.aggregate([
      { 
        $match: { 
          eventId: { $in: eventIds.map(id => id.toString()) }
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

    const eventStats = guestStats[0] || { totalGuests: 0, checkedInGuests: 0, pendingGuests: 0 };
    const checkInPercentage = eventStats.totalGuests > 0 
      ? Math.round((eventStats.checkedInGuests / eventStats.totalGuests) * 100) 
      : 0;

    // 2. GIFT ANALYTICS - Distribution Data
    const giftDistribution = await Checkin.aggregate([
      { 
        $match: { 
          eventId: { $in: eventIds.map(id => id.toString()) },
          isValid: true 
        } 
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

    // 6. EVENT ANALYTICS - Check-in Timeline (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const checkInTimeline = await Checkin.aggregate([
      { 
        $match: { 
          eventId: { $in: eventIds.map(id => id.toString()) },
          isValid: true,
          createdAt: { $gte: sevenDaysAgo }
        } 
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          checkIns: { $sum: 1 },
          giftsDistributed: { $sum: { $size: '$giftsDistributed' } }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // 7. COMPREHENSIVE SUMMARY
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