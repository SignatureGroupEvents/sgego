const Event = require('../models/Event');
const Inventory = require('../models/Inventory');
const Checkin = require('../models/Checkin');
const Guest = require('../models/Guest');

// Get comprehensive analytics across all events
exports.getOverviewAnalytics = async (req, res) => {
  try {
    const { 
      year, 
      eventType, 
      giftTypes, 
      giftStyles,
      groupBy = 'month' // month, week, day, event
    } = req.query;

    // Build date filter based on year
    const dateFilter = {};
    if (year) {
      const startOfYear = new Date(`${year}-01-01`);
      const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
      dateFilter.$gte = startOfYear;
      dateFilter.$lte = endOfYear;
    }

    // Parse giftTypes and giftStyles arrays
    const giftTypesArray = giftTypes ? (Array.isArray(giftTypes) ? giftTypes : giftTypes.split(',')) : [];
    const giftStylesArray = giftStyles ? (Array.isArray(giftStyles) ? giftStyles : giftStyles.split(',')) : [];

    // Get all events with optional filtering
    let eventFilter = {};
    if (eventType) {
      eventFilter.eventType = eventType;
    }

    const events = await Event.find(eventFilter);
    const eventIds = events.map(e => e._id);

    // 1. Gift Distribution Analytics by Type and Style
    const giftDistributionPipeline = [
      { $match: { eventId: { $in: eventIds }, isValid: true } },
      { $unwind: '$giftsDistributed' },
      {
        $lookup: {
          from: 'inventories',
          localField: 'giftsDistributed.inventoryId',
          foreignField: '_id',
          as: 'inventoryItem'
        }
      },
      { $unwind: '$inventoryItem' }
    ];

    // Add date filtering if provided
    if (Object.keys(dateFilter).length > 0) {
      giftDistributionPipeline.unshift({
        $match: { createdAt: dateFilter }
      });
    }

    // Add gift type filtering if provided
    if (giftTypesArray.length > 0) {
      giftDistributionPipeline.push({
        $match: { 'inventoryItem.type': { $in: giftTypesArray } }
      });
    }

    // Add gift style filtering if provided
    if (giftStylesArray.length > 0) {
      giftDistributionPipeline.push({
        $match: { 'inventoryItem.style': { $in: giftStylesArray } }
      });
    }

    giftDistributionPipeline.push(
      {
        $group: {
          _id: {
            type: '$inventoryItem.type',
            style: '$inventoryItem.style',
            size: '$inventoryItem.size',
            gender: '$inventoryItem.gender'
          },
          totalDistributed: { $sum: '$giftsDistributed.quantity' },
          distributionCount: { $sum: 1 },
          events: { $addToSet: '$eventId' },
          uniqueGuests: { $addToSet: '$guestId' }
        }
      },
      {
        $project: {
          _id: 0,
          type: '$_id.type',
          style: '$_id.style',
          size: '$_id.size',
          gender: '$_id.gender',
          totalDistributed: 1,
          distributionCount: 1,
          eventCount: { $size: '$events' },
          uniqueGuestCount: { $size: '$uniqueGuests' }
        }
      },
      { $sort: { totalDistributed: -1 } }
    );

    const giftDistribution = await Checkin.aggregate(giftDistributionPipeline);

    // 2. Inventory Performance Analytics
    const inventoryPerformance = await Inventory.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      {
        $lookup: {
          from: 'checkins',
          let: { inventoryId: '$_id' },
          pipeline: [
            { $match: { isValid: true } },
            { $unwind: '$giftsDistributed' },
            { $match: { $expr: { $eq: ['$giftsDistributed.inventoryId', '$$inventoryId'] } } },
            { $group: { _id: null, totalDistributed: { $sum: '$giftsDistributed.quantity' } } }
          ],
          as: 'distributionData'
        }
      },
      {
        $project: {
          type: 1,
          style: 1,
          size: 1,
          gender: 1,
          qtyWarehouse: 1,
          qtyOnSite: 1,
          currentInventory: 1,
          totalDistributed: { $ifNull: [{ $arrayElemAt: ['$distributionData.totalDistributed', 0] }, 0] },
          utilizationRate: {
            $cond: {
              if: { $gt: [{ $add: ['$qtyWarehouse', '$qtyOnSite'] }, 0] },
              then: {
                $multiply: [
                  {
                    $divide: [
                      { $ifNull: [{ $arrayElemAt: ['$distributionData.totalDistributed', 0] }, 0] },
                      { $add: ['$qtyWarehouse', '$qtyOnSite'] }
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
      { $sort: { totalDistributed: -1 } }
    ]);

    // 3. Event Performance Analytics
    const eventPerformance = await Event.aggregate([
      { $match: { _id: { $in: eventIds } } },
      {
        $lookup: {
          from: 'guests',
          localField: '_id',
          foreignField: 'eventId',
          as: 'guests'
        }
      },
      {
        $lookup: {
          from: 'checkins',
          localField: '_id',
          foreignField: 'eventId',
          as: 'checkins'
        }
      },
      {
        $project: {
          eventName: 1,
          eventContractNumber: 1,
          eventDate: 1,
          eventType: 1,
          totalGuests: { $size: '$guests' },
          checkedInGuests: { $size: { $filter: { input: '$guests', cond: '$hasCheckedIn' } } },
          totalGiftsDistributed: {
            $reduce: {
              input: '$checkins',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $reduce: {
                      input: '$$this.giftsDistributed',
                      initialValue: 0,
                      in: { $add: ['$$value', '$$this.quantity'] }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      { $sort: { eventDate: -1 } }
    ]);

    // 4. Trend Analysis by Time Period
    const trendAnalysisPipeline = [
      { $match: { eventId: { $in: eventIds }, isValid: true } },
      { $unwind: '$giftsDistributed' },
      {
        $lookup: {
          from: 'inventories',
          localField: 'giftsDistributed.inventoryId',
          foreignField: '_id',
          as: 'inventoryItem'
        }
      },
      { $unwind: '$inventoryItem' }
    ];

    // Add date filtering if provided
    if (Object.keys(dateFilter).length > 0) {
      trendAnalysisPipeline.unshift({
        $match: { createdAt: dateFilter }
      });
    }

    // Add gift type filtering if provided
    if (giftTypesArray.length > 0) {
      trendAnalysisPipeline.push({
        $match: { 'inventoryItem.type': { $in: giftTypesArray } }
      });
    }

    // Add gift style filtering if provided
    if (giftStylesArray.length > 0) {
      trendAnalysisPipeline.push({
        $match: { 'inventoryItem.style': { $in: giftStylesArray } }
      });
    }

    trendAnalysisPipeline.push(
      {
        $group: {
          _id: {
            period: {
              $dateToString: {
                format: groupBy === 'month' ? '%Y-%m' : groupBy === 'week' ? '%Y-%U' : '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            type: '$inventoryItem.type',
            style: '$inventoryItem.style'
          },
          totalDistributed: { $sum: '$giftsDistributed.quantity' },
          distributionCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.period',
          giftTypes: {
            $push: {
              type: '$_id.type',
              style: '$_id.style',
              totalDistributed: '$totalDistributed',
              distributionCount: '$distributionCount'
            }
          },
          totalDistributed: { $sum: '$totalDistributed' }
        }
      },
      { $sort: { _id: 1 } }
    );

    const trendAnalysis = await Checkin.aggregate(trendAnalysisPipeline);

    // 5. Top Performing Items
    const topPerformers = giftDistribution.slice(0, 10);

    // 6. Category Performance Summary
    const categorySummary = giftDistribution.reduce((acc, item) => {
      const category = getGiftCategory(item.style, item.type);
      if (!acc[category]) {
        acc[category] = {
          totalDistributed: 0,
          uniqueItems: 0,
          avgDistributionPerItem: 0,
          topItems: []
        };
      }
      acc[category].totalDistributed += item.totalDistributed;
      acc[category].uniqueItems += 1;
      acc[category].topItems.push({
        style: item.style,
        type: item.type,
        totalDistributed: item.totalDistributed
      });
      return acc;
    }, {});

    // Calculate averages and sort top items for each category
    Object.keys(categorySummary).forEach(category => {
      categorySummary[category].avgDistributionPerItem = 
        categorySummary[category].totalDistributed / categorySummary[category].uniqueItems;
      categorySummary[category].topItems.sort((a, b) => b.totalDistributed - a.totalDistributed);
      categorySummary[category].topItems = categorySummary[category].topItems.slice(0, 5);
    });

    // 7. Overall Statistics
    const overallStats = {
      totalEvents: events.length,
      totalGiftsDistributed: giftDistribution.reduce((sum, item) => sum + item.totalDistributed, 0),
      uniqueGiftTypes: new Set(giftDistribution.map(item => item.type)).size,
      uniqueGiftStyles: new Set(giftDistribution.map(item => item.style)).size,
      totalUniqueGuests: new Set(giftDistribution.flatMap(item => item.uniqueGuests || [])).size,
      avgGiftsPerGuest: giftDistribution.reduce((sum, item) => sum + item.totalDistributed, 0) / 
                       Math.max(1, new Set(giftDistribution.flatMap(item => item.uniqueGuests || [])).size)
    };

    res.json({
      success: true,
      analytics: {
        giftDistribution,
        inventoryPerformance,
        eventPerformance,
        trendAnalysis,
        topPerformers,
        categorySummary,
        overallStats
      }
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating analytics',
      error: error.message 
    });
  }
};

// Get analytics for specific gift type or style
exports.getGiftTypeAnalytics = async (req, res) => {
  try {
    const { giftType, giftStyle, startDate, endDate } = req.query;

    const matchStage = { isValid: true };
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$giftsDistributed' },
      {
        $lookup: {
          from: 'inventories',
          localField: 'giftsDistributed.inventoryId',
          foreignField: '_id',
          as: 'inventoryItem'
        }
      },
      { $unwind: '$inventoryItem' }
    ];

    // Add gift type/style filtering
    if (giftType) {
      pipeline.push({ $match: { 'inventoryItem.type': giftType } });
    }
    if (giftStyle) {
      pipeline.push({ $match: { 'inventoryItem.style': giftStyle } });
    }

    pipeline.push(
      {
        $group: {
          _id: {
            eventId: '$eventId',
            type: '$inventoryItem.type',
            style: '$inventoryItem.style',
            size: '$inventoryItem.size',
            gender: '$inventoryItem.gender'
          },
          totalDistributed: { $sum: '$giftsDistributed.quantity' },
          distributionCount: { $sum: 1 },
          uniqueGuests: { $addToSet: '$guestId' }
        }
      },
      {
        $lookup: {
          from: 'events',
          localField: '_id.eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $project: {
          _id: 0,
          eventName: '$event.eventName',
          eventContractNumber: '$event.eventContractNumber',
          eventDate: '$event.eventDate',
          type: '$_id.type',
          style: '$_id.style',
          size: '$_id.size',
          gender: '$_id.gender',
          totalDistributed: 1,
          distributionCount: 1,
          uniqueGuestCount: { $size: '$uniqueGuests' }
        }
      },
      { $sort: { eventDate: -1 } }
    );

    const results = await Checkin.aggregate(pipeline);

    res.json({
      success: true,
      analytics: results
    });

  } catch (error) {
    console.error('Gift Type Analytics Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating gift type analytics',
      error: error.message 
    });
  }
};

// Export analytics data
exports.exportAnalytics = async (req, res) => {
  try {
    const { format = 'csv', ...filters } = req.query;
    
    // Get analytics data by calling the overview function directly
    const { 
      startDate, 
      endDate, 
      eventType, 
      giftType, 
      giftStyle,
      groupBy = 'month'
    } = filters;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Get all events with optional filtering
    let eventFilter = {};
    if (eventType) {
      eventFilter.eventType = eventType;
    }

    const events = await Event.find(eventFilter);
    const eventIds = events.map(e => e._id);

    // Get gift distribution data
    const giftDistributionPipeline = [
      { $match: { eventId: { $in: eventIds }, isValid: true } },
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
            type: '$inventoryItem.type',
            style: '$inventoryItem.style',
            size: '$inventoryItem.size',
            gender: '$inventoryItem.gender'
          },
          totalDistributed: { $sum: '$giftsDistributed.quantity' },
          distributionCount: { $sum: 1 },
          events: { $addToSet: '$eventId' },
          uniqueGuests: { $addToSet: '$guestId' }
        }
      },
      {
        $project: {
          _id: 0,
          type: '$_id.type',
          style: '$_id.style',
          size: '$_id.size',
          gender: '$_id.gender',
          totalDistributed: 1,
          distributionCount: 1,
          eventCount: { $size: '$events' },
          uniqueGuestCount: { $size: '$uniqueGuests' }
        }
      },
      { $sort: { totalDistributed: -1 } }
    ];

    // Add date filtering if provided
    if (Object.keys(dateFilter).length > 0) {
      giftDistributionPipeline.unshift({
        $match: { createdAt: dateFilter }
      });
    }

    const giftDistribution = await Checkin.aggregate(giftDistributionPipeline);

    if (format === 'excel') {
      // Excel export implementation
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      
      // Gift Distribution Sheet
      const giftSheet = workbook.addWorksheet('Gift Distribution');
      giftSheet.columns = [
        { header: 'Type', key: 'type', width: 20 },
        { header: 'Style', key: 'style', width: 30 },
        { header: 'Size', key: 'size', width: 15 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Total Distributed', key: 'totalDistributed', width: 20 },
        { header: 'Distribution Count', key: 'distributionCount', width: 20 },
        { header: 'Event Count', key: 'eventCount', width: 15 },
        { header: 'Unique Guests', key: 'uniqueGuestCount', width: 15 }
      ];

      giftDistribution.forEach(item => {
        giftSheet.addRow(item);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_overview_${new Date().toISOString().split('T')[0]}.xlsx"`);
      
      await workbook.xlsx.write(res);
      res.end();

    } else {
      // CSV export
      const csvData = giftDistribution.map(item => ({
        Type: item.type,
        Style: item.style,
        Size: item.size,
        Gender: item.gender,
        'Total Distributed': item.totalDistributed,
        'Distribution Count': item.distributionCount,
        'Event Count': item.eventCount,
        'Unique Guests': item.uniqueGuestCount
      }));

      const csv = require('csv-writer').createObjectCsvWriter({
        path: 'temp_analytics.csv',
        header: [
          { id: 'Type', title: 'Type' },
          { id: 'Style', title: 'Style' },
          { id: 'Size', title: 'Size' },
          { id: 'Gender', title: 'Gender' },
          { id: 'Total Distributed', title: 'Total Distributed' },
          { id: 'Distribution Count', title: 'Distribution Count' },
          { id: 'Event Count', title: 'Event Count' },
          { id: 'Unique Guests', title: 'Unique Guests' }
        ]
      });

      await csv.writeRecords(csvData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_overview_${new Date().toISOString().split('T')[0]}.csv"`);
      
      const fs = require('fs');
      const fileContent = fs.readFileSync('temp_analytics.csv');
      res.send(fileContent);
      
      // Clean up temp file
      fs.unlinkSync('temp_analytics.csv');
    }

  } catch (error) {
    console.error('Export Analytics Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error exporting analytics',
      error: error.message 
    });
  }
};

// Helper function to categorize gifts
function getGiftCategory(style, type) {
  const styleLower = style.toLowerCase();
  const typeLower = type.toLowerCase();
  
  if (styleLower.includes('nike') || styleLower.includes('shoe') || styleLower.includes('sneaker') || 
      typeLower.includes('shoe') || typeLower.includes('footwear')) {
    return 'Custom Shoes';
  }
  
  if (styleLower.includes('hat') || styleLower.includes('cap') || typeLower.includes('hat')) {
    return 'Hats';
  }
  
  if (styleLower.includes('shirt') || styleLower.includes('t-shirt') || styleLower.includes('hoodie') || 
      styleLower.includes('jacket') || styleLower.includes('sweater') || typeLower.includes('clothing')) {
    return 'Clothing';
  }
  
  if (styleLower.includes('bag') || styleLower.includes('backpack') || styleLower.includes('tote') ||
      styleLower.includes('wallet') || styleLower.includes('keychain') || typeLower.includes('accessory')) {
    return 'Accessories';
  }
  
  return 'Other';
} 