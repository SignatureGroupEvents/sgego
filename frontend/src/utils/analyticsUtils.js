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
  