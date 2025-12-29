// src/utils/analyticsUtils.js

export function calculateTopGiftsFromGuests(guests, inventoryMap = {}, topN = 5) {
    const giftSelectionCounts = {};
  
    guests.forEach(guest => {
      if (guest.selectedGifts && Array.isArray(guest.selectedGifts)) {
        guest.selectedGifts.forEach(gift => {
          let giftKey;
          
          // Try to resolve inventoryId to gift name
          if (gift.inventoryId && inventoryMap[gift.inventoryId]) {
            const item = inventoryMap[gift.inventoryId];
            giftKey = `${item.style} ${item.size ? `(${item.size})` : ''}`.trim();
          } else if (gift.style) {
            // Use style if available
            giftKey = gift.style;
          } else if (gift.inventoryId) {
            // Fallback to inventoryId if no resolution possible
            giftKey = `Unknown Gift (${gift.inventoryId})`;
          } else {
            giftKey = 'Unknown Gift';
          }
          
          giftSelectionCounts[giftKey] = (giftSelectionCounts[giftKey] || 0) + 1;
        });
      }
      
      // Also check for single giftSelection (legacy format)
      if (guest.giftSelection && inventoryMap[guest.giftSelection]) {
        const item = inventoryMap[guest.giftSelection];
        const giftKey = `${item.style} ${item.size ? `(${item.size})` : ''}`.trim();
        giftSelectionCounts[giftKey] = (giftSelectionCounts[giftKey] || 0) + 1;
      }
    });
  
    return Object.entries(giftSelectionCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);
  }

/**
 * Transform event statistics data for chart visualization
 * @param {Object} analyticsData - Analytics data object containing eventStats
 * @returns {Object} Transformed data ready for chart components
 */
export function transformEventStatsForChart(analyticsData) {
  if (!analyticsData || !analyticsData.eventStats) {
    return {
      stats: [],
      percentages: []
    };
  }

  const { eventStats } = analyticsData;
  
  return {
    stats: [
      { name: 'Total Guests', value: eventStats.totalGuests || 0 },
      { name: 'Checked In', value: eventStats.checkedInGuests || 0 },
      { name: 'Pending', value: eventStats.pendingGuests || 0 }
    ],
    percentages: [
      { name: 'Checked In', value: eventStats.checkInPercentage || 0 },
      { name: 'Pending', value: 100 - (eventStats.checkInPercentage || 0) }
    ]
  };
}

/**
 * Transform gift distribution data for chart visualization
 * @param {Object} analyticsData - Analytics data object containing giftDistribution
 * @param {Object} filters - Optional filters object (for future use)
 * @returns {Array} Array of data points ready for chart components
 */
export function transformGiftDistributionForChart(analyticsData, filters = {}) {
  if (!analyticsData) {
    return [];
  }

  // Handle both object and array formats
  let distribution = [];
  
  if (analyticsData.giftDistribution && typeof analyticsData.giftDistribution === 'object') {
    // Convert object to array
    distribution = Object.entries(analyticsData.giftDistribution).map(([key, value]) => ({
      name: key,
      value: typeof value === 'number' ? value : (value?.count || value?.quantity || 0)
    }));
  } else if (Array.isArray(analyticsData.rawGiftDistribution)) {
    // Use raw gift distribution array
    const grouped = {};
    analyticsData.rawGiftDistribution.forEach(item => {
      const key = item.style || item.type || 'Unknown';
      grouped[key] = (grouped[key] || 0) + (item.quantity || item.count || 1);
    });
    distribution = Object.entries(grouped).map(([name, value]) => ({ name, value }));
  } else if (Array.isArray(analyticsData.topGifts)) {
    // Use topGifts array
    distribution = analyticsData.topGifts.map(gift => ({
      name: gift.name || 'Unknown',
      value: gift.totalQuantity || gift.count || 0
    }));
  }

  // Sort by value descending
  return distribution.sort((a, b) => b.value - a.value);
}

/**
 * Transform timeline data for chart visualization
 * @param {Object} analyticsData - Analytics data object containing checkInTimeline
 * @param {Object} filters - Optional filters object (for future use)
 * @returns {Array} Array of timeline data points ready for line/bar charts
 */
export function transformTimelineForChart(analyticsData, filters = {}) {
  if (!analyticsData || !Array.isArray(analyticsData.checkInTimeline)) {
    return [];
  }

  return analyticsData.checkInTimeline.map(item => ({
    date: item._id?.date || item.date || 'Unknown',
    checkIns: item.checkIns || 0,
    giftsDistributed: item.giftsDistributed || 0,
    // For line charts, you might want separate series
    name: item._id?.date || item.date || 'Unknown'
  }));
}
  