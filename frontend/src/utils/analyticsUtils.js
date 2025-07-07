// src/utils/analyticsUtils.js

export function calculateTopGiftsFromGuests(guests, topN = 5) {
    const giftSelectionCounts = {};
  
    guests.forEach(guest => {
      if (guest.selectedGifts && Array.isArray(guest.selectedGifts)) {
        guest.selectedGifts.forEach(gift => {
          const giftKey = gift.style || gift.inventoryId || 'Unknown Gift';
          giftSelectionCounts[giftKey] = (giftSelectionCounts[giftKey] || 0) + 1;
        });
      }
    });
  
    return Object.entries(giftSelectionCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);
  }
  