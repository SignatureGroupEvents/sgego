# Enhanced Analytics Endpoint Usage Guide

The `/events/:eventId/analytics` endpoint now provides comprehensive analytics for both event and gift data. This guide shows how to use it effectively.

## Overview

The enhanced analytics endpoint returns a comprehensive data structure that includes:

- **Event Analytics**: Guest check-in statistics, timeline data
- **Gift Analytics**: Distribution data, category breakdowns, top performers
- **Inventory Analytics**: Stock levels, utilization rates
- **Timeline Analytics**: Check-in patterns over time

## API Response Structure

```json
{
  "success": true,
  "analytics": {
    "eventStats": {
      "totalGuests": 150,
      "checkedInGuests": 120,
      "pendingGuests": 30,
      "checkInPercentage": 80,
      "eventName": "Annual Conference 2024",
      "eventContractNumber": "CONF-2024-001",
      "isMainEvent": true
    },
    "giftDistribution": {
      "Red Tote - M": {
        "inventoryId": "507f1f77bcf86cd799439011",
        "style": "Red Tote",
        "type": "Tote Bag",
        "size": "M",
        "totalQuantity": 25,
        "distributedCount": 25,
        "uniqueGuestCount": 25
      }
    },
    "categoryTotals": {
      "Accessories": 45,
      "Clothing": 30,
      "Custom Shoes": 15
    },
    "topGifts": [
      {
        "name": "Red Tote (M)",
        "type": "Tote Bag",
        "style": "Red Tote",
        "size": "M",
        "totalQuantity": 25,
        "distributedCount": 25,
        "uniqueGuestCount": 25
      }
    ],
    "giftSummary": {
      "totalGiftsDistributed": 90,
      "uniqueItemsDistributed": 8,
      "averageGiftsPerGuest": 0.75
    },
    "inventoryAnalytics": [
      {
        "type": "Tote Bag",
        "style": "Red Tote",
        "totalWarehouse": 50,
        "totalOnSite": 30,
        "currentInventory": 20,
        "itemCount": 2,
        "utilizationRate": 75.0
      }
    ],
    "inventorySummary": {
      "totalInventoryItems": 12,
      "averageUtilizationRate": 68.5,
      "lowStockItems": 3
    },
    "checkInTimeline": [
      {
        "_id": { "date": "2024-01-15" },
        "checkIns": 15,
        "giftsDistributed": 12
      }
    ],
    "rawGiftDistribution": [...],
    "secondaryEvents": [...]
  }
}
```

## Frontend Usage Examples

### 1. Get All Analytics (Recommended)

```javascript
import { getAllEventAnalytics } from '../services/analytics';

const MyComponent = ({ eventId }) => {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await getAllEventAnalytics(eventId);
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };

    fetchAnalytics();
  }, [eventId]);

  // Use analytics.eventStats, analytics.giftSummary, etc.
};
```

### 2. Get Event Analytics Only

```javascript
import { getEventAnalytics } from '../services/analytics';

const EventStatsComponent = ({ eventId }) => {
  const [eventStats, setEventStats] = useState(null);

  useEffect(() => {
    const fetchEventStats = async () => {
      try {
        const data = await getEventAnalytics(eventId);
        setEventStats(data.eventStats);
      } catch (error) {
        console.error('Error fetching event stats:', error);
      }
    };

    fetchEventStats();
  }, [eventId]);

  return (
    <div>
      <h3>Event Statistics</h3>
      <p>Total Guests: {eventStats?.totalGuests}</p>
      <p>Checked In: {eventStats?.checkedInGuests}</p>
      <p>Check-in Rate: {eventStats?.checkInPercentage}%</p>
    </div>
  );
};
```

### 3. Get Gift Analytics Only

```javascript
import { getGiftAnalytics } from '../services/analytics';

const GiftAnalyticsComponent = ({ eventId }) => {
  const [giftData, setGiftData] = useState(null);

  useEffect(() => {
    const fetchGiftData = async () => {
      try {
        const data = await getGiftAnalytics(eventId);
        setGiftData(data);
      } catch (error) {
        console.error('Error fetching gift data:', error);
      }
    };

    fetchGiftData();
  }, [eventId]);

  return (
    <div>
      <h3>Gift Analytics</h3>
      <p>Total Distributed: {giftData?.giftSummary.totalGiftsDistributed}</p>
      <p>Average per Guest: {giftData?.giftSummary.averageGiftsPerGuest}</p>
      
      <h4>Top Gifts</h4>
      {giftData?.topGifts.map((gift, idx) => (
        <div key={idx}>
          {gift.name}: {gift.totalQuantity} distributed
        </div>
      ))}
    </div>
  );
};
```

### 4. Get Inventory Analytics Only

```javascript
import { getInventoryAnalytics } from '../services/analytics';

const InventoryAnalyticsComponent = ({ eventId }) => {
  const [inventoryData, setInventoryData] = useState(null);

  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        const data = await getInventoryAnalytics(eventId);
        setInventoryData(data);
      } catch (error) {
        console.error('Error fetching inventory data:', error);
      }
    };

    fetchInventoryData();
  }, [eventId]);

  return (
    <div>
      <h3>Inventory Analytics</h3>
      <p>Total Items: {inventoryData?.inventorySummary.totalInventoryItems}</p>
      <p>Utilization Rate: {inventoryData?.inventorySummary.averageUtilizationRate}%</p>
      <p>Low Stock Items: {inventoryData?.inventorySummary.lowStockItems}</p>
    </div>
  );
};
```

## Chart Data Preparation

### Bar Chart for Top Gifts

```javascript
const topGiftsData = analytics.topGifts.map(gift => ({
  name: gift.name,
  quantity: gift.totalQuantity,
  guests: gift.uniqueGuestCount
}));
```

### Pie Chart for Categories

```javascript
const categoryData = Object.entries(analytics.categoryTotals).map(([name, value]) => ({
  name,
  value
}));
```

### Line Chart for Timeline

```javascript
const timelineData = analytics.checkInTimeline.map(item => ({
  date: item._id.date,
  checkIns: item.checkIns,
  giftsDistributed: item.giftsDistributed
}));
```

## Real-time Updates

The analytics endpoint works with the existing WebSocket system for real-time updates:

```javascript
// In your component
useEffect(() => {
  const socket = io('http://localhost:3001');
  
  socket.emit('join-event', eventId);
  
  socket.on('analytics:update', (data) => {
    if (data.eventId === eventId) {
      // Re-fetch analytics data
      fetchAnalytics();
    }
  });

  return () => socket.disconnect();
}, [eventId]);
```

## Error Handling

```javascript
const fetchAnalytics = async () => {
  try {
    setLoading(true);
    const data = await getAllEventAnalytics(eventId);
    setAnalytics(data);
  } catch (error) {
    console.error('Analytics Error:', error);
    setError('Failed to load analytics data');
  } finally {
    setLoading(false);
  }
};
```

## Performance Considerations

1. **Caching**: Consider caching analytics data for better performance
2. **Pagination**: For large datasets, implement pagination
3. **Filtering**: Use query parameters to filter data when needed
4. **Real-time**: Use WebSocket updates for live data

## Migration from Old Analytics

If you're migrating from the old analytics structure:

```javascript
// Old way
const response = await getEventGiftAnalytics(eventId);
const giftSelections = response.giftSelections || [];

// New way
const response = await getAllEventAnalytics(eventId);
const topGifts = response.topGifts || [];
const giftDistribution = response.giftDistribution || {};
```

The enhanced endpoint provides much more comprehensive data while maintaining backward compatibility. 