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

/**
 * Export chart as image (PNG)
 * @param {string} chartId - ID of the chart container element
 * @param {string} filename - Filename for the download (without extension)
 * @returns {Promise<boolean>} Success status
 */
export async function exportChartAsImage(chartId, filename = 'chart') {
  try {
    const chartElement = document.getElementById(chartId);
    if (!chartElement) {
      console.error('Chart element not found:', chartId);
      return false;
    }

    // Use html2canvas if available, otherwise fallback to SVG export
    const svgElement = chartElement.querySelector('svg');
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      // Convert SVG to PNG using canvas
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      return new Promise((resolve) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              URL.revokeObjectURL(svgUrl);
              resolve(true);
            } else {
              resolve(false);
            }
          }, 'image/png');
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          resolve(false);
        };
        
        img.src = svgUrl;
      });
    }
    
    return false;
  } catch (error) {
    console.error('Error exporting chart:', error);
    return false;
  }
}

/**
 * Calculate gift selection rate
 * @param {Array} guests - Array of guest objects
 * @returns {Object} Selection rate statistics
 */
export function calculateGiftSelectionRate(guests = []) {
  if (!guests || guests.length === 0) {
    return {
      totalGuests: 0,
      guestsWithGifts: 0,
      selectionRate: 0,
      percentage: '0%'
    };
  }

  const guestsWithGifts = guests.filter(g => 
    g?.giftSelection?.inventoryId || 
    (g?.selectedGifts && Array.isArray(g.selectedGifts) && g.selectedGifts.length > 0)
  ).length;

  const selectionRate = guests.length > 0 
    ? (guestsWithGifts / guests.length) * 100 
    : 0;

  return {
    totalGuests: guests.length,
    guestsWithGifts,
    selectionRate: Math.round(selectionRate * 100) / 100,
    percentage: `${Math.round(selectionRate)}%`
  };
}

/**
 * Calculate inventory utilization
 * @param {Array} inventory - Array of inventory items
 * @param {Array} distributedGifts - Array of distributed gift data
 * @returns {Array} Inventory utilization data for charts
 */
export function calculateInventoryUtilization(inventory = [], distributedGifts = []) {
  if (!inventory || inventory.length === 0) {
    return [];
  }

  // Create a map of distributed quantities by inventoryId
  const distributedMap = new Map();
  distributedGifts.forEach(gift => {
    const invId = gift.inventoryId?.toString();
    if (invId) {
      const current = distributedMap.get(invId) || 0;
      distributedMap.set(invId, current + (gift.totalQuantity || gift.quantity || 1));
    }
  });

  return inventory.map(item => {
    const invId = item._id?.toString();
    const distributed = distributedMap.get(invId) || 0;
    const currentInventory = item.currentInventory || 0;
    const total = distributed + currentInventory;
    const utilizationRate = total > 0 ? (distributed / total) * 100 : 0;

    return {
      name: `${item.style || 'N/A'} ${item.product ? `- ${item.product}` : ''}`.trim(),
      distributed,
      remaining: currentInventory,
      total,
      utilizationRate: Math.round(utilizationRate * 100) / 100
    };
  }).filter(item => item.total > 0); // Only show items with inventory
}
  