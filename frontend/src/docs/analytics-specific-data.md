# Accessing Specific Analytics Data

The enhanced analytics endpoint allows you to access specific information from each analytics section. Here are detailed examples:

## 1. Event Statistics - Specific Data Points

```javascript
import { getAllEventAnalytics } from '../services/analytics';

const fetchSpecificEventData = async (eventId) => {
  const analytics = await getAllEventAnalytics(eventId);
  
  // Access specific event statistics
  const {
    totalGuests,
    checkedInGuests,
    pendingGuests,
    checkInPercentage,
    eventName,
    eventContractNumber,
    isMainEvent
  } = analytics.eventStats;

  return {
    totalGuests,           // 150
    checkedInGuests,       // 120
    pendingGuests,         // 30
    checkInPercentage,     // 80
    eventName,            // "Annual Conference 2024"
    eventContractNumber,  // "CONF-2024-001"
    isMainEvent          // true
  };
};
```

## 2. Gift Analytics - Specific Data Points

### Top Gifts Data
```javascript
const getTopGiftsData = async (eventId) => {
  const analytics = await getAllEventAnalytics(eventId);
  
  // Get top 5 gifts
  const top5Gifts = analytics.topGifts.slice(0, 5);
  
  // Get specific gift data
  const topGift = analytics.topGifts[0];
  const {
    name,              // "Red Tote (M)"
    type,              // "Tote Bag"
    style,             // "Red Tote"
    size,              // "M"
    totalQuantity,     // 25
    distributedCount,  // 25
    uniqueGuestCount   // 25
  } = topGift;

  return { top5Gifts, topGift };
};
```

### Gift Distribution by Category
```javascript
const getGiftCategories = async (eventId) => {
  const analytics = await getAllEventAnalytics(eventId);
  
  // Get all categories
  const categories = Object.keys(analytics.categoryTotals);
  // ["Accessories", "Clothing", "Custom Shoes", "Hats", "Other"]

  // Get specific category totals
  const accessoriesCount = analytics.categoryTotals.Accessories; // 45
  const clothingCount = analytics.categoryTotals.Clothing;       // 30
  const shoesCount = analytics.categoryTotals["Custom Shoes"];   // 15

  // Get category breakdown for charts
  const categoryData = Object.entries(analytics.categoryTotals).map(([name, value]) => ({
    name,
    value
  }));

  return { categories, categoryData, accessoriesCount, clothingCount, shoesCount };
};
```

### Gift Summary Statistics
```javascript
const getGiftSummary = async (eventId) => {
  const analytics = await getAllEventAnalytics(eventId);
  
  const {
    totalGiftsDistributed,    // 90
    uniqueItemsDistributed,   // 8
    averageGiftsPerGuest      // 0.75
  } = analytics.giftSummary;

  return { totalGiftsDistributed, uniqueItemsDistributed, averageGiftsPerGuest };
};
```

## 3. Inventory Analytics - Specific Data Points

### Inventory Summary
```javascript
const getInventorySummary = async (eventId) => {
  const analytics = await getAllEventAnalytics(eventId);
  
  const {
    totalInventoryItems,      // 12
    averageUtilizationRate,   // 68.5
    lowStockItems            // 3
  } = analytics.inventorySummary;

  return { totalInventoryItems, averageUtilizationRate, lowStockItems };
};
```

### Detailed Inventory Data
```javascript
const getDetailedInventory = async (eventId) => {
  const analytics = await getAllEventAnalytics(eventId);
  
  // Get all inventory items
  const allInventory = analytics.inventoryAnalytics;
  
  // Get low stock items (less than 5 in stock)
  const lowStockItems = allInventory.filter(item => item.currentInventory < 5);
  
  // Get high utilization items (above 80%)
  const highUtilizationItems = allInventory.filter(item => item.utilizationRate > 80);
  
  // Get specific item data
  const firstItem = allInventory[0];
  const {
    type,              // "Tote Bag"
    style,             // "Red Tote"
    totalWarehouse,    // 50
    totalOnSite,       // 30
    currentInventory,  // 20
    itemCount,         // 2
    utilizationRate    // 75.0
  } = firstItem;

  return { allInventory, lowStockItems, highUtilizationItems, firstItem };
};
```

## 4. Timeline Analytics - Specific Data Points

### Check-in Timeline
```javascript
const getTimelineData = async (eventId) => {
  const analytics = await getAllEventAnalytics(eventId);
  
  // Get all timeline data
  const timeline = analytics.checkInTimeline;
  
  // Get today's data
  const today = new Date().toISOString().split('T')[0];
  const todayData = timeline.find(item => item._id.date === today);
  
  // Get last 3 days
  const last3Days = timeline.slice(-3);
  
  // Get total check-ins for the period
  const totalCheckIns = timeline.reduce((sum, item) => sum + item.checkIns, 0);
  
  // Get total gifts distributed for the period
  const totalGiftsDistributed = timeline.reduce((sum, item) => sum + item.giftsDistributed, 0);

  return { timeline, todayData, last3Days, totalCheckIns, totalGiftsDistributed };
};
```

## 5. Gift Distribution - Specific Data Points

### Individual Gift Data
```javascript
const getSpecificGiftData = async (eventId, giftStyle, giftSize) => {
  const analytics = await getAllEventAnalytics(eventId);
  
  // Find specific gift in distribution
  const giftKey = `${giftStyle} - ${giftSize}`;
  const giftData = analytics.giftDistribution[giftKey];
  
  if (giftData) {
    const {
      inventoryId,
      style,
      type,
      size,
      totalQuantity,
      distributedCount,
      uniqueGuestCount
    } = giftData;

    return {
      inventoryId,
      style,
      type,
      size,
      totalQuantity,
      distributedCount,
      uniqueGuestCount
    };
  }

  return null;
};
```

### All Gift Distribution Data
```javascript
const getAllGiftDistribution = async (eventId) => {
  const analytics = await getAllEventAnalytics(eventId);
  
  // Get all gift distribution entries
  const allGifts = Object.entries(analytics.giftDistribution);
  
  // Convert to array format
  const giftArray = allGifts.map(([key, data]) => ({
    key,
    ...data
  }));

  // Sort by quantity
  const sortedByQuantity = giftArray.sort((a, b) => b.totalQuantity - a.totalQuantity);
  
  // Get gifts with high distribution (more than 10)
  const highDistributionGifts = giftArray.filter(gift => gift.totalQuantity > 10);

  return { allGifts: giftArray, sortedByQuantity, highDistributionGifts };
};
```

## 6. Practical Usage Examples

### Dashboard Widgets
```javascript
const DashboardWidgets = ({ eventId }) => {
  const [widgetData, setWidgetData] = useState({});

  useEffect(() => {
    const fetchWidgetData = async () => {
      const analytics = await getAllEventAnalytics(eventId);
      
      setWidgetData({
        // Quick stats
        totalGuests: analytics.eventStats.totalGuests,
        checkInRate: analytics.eventStats.checkInPercentage,
        totalGifts: analytics.giftSummary.totalGiftsDistributed,
        lowStockCount: analytics.inventorySummary.lowStockItems,
        
        // Top performer
        topGift: analytics.topGifts[0]?.name || 'No data',
        
        // Category breakdown
        topCategory: Object.entries(analytics.categoryTotals)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'No data'
      });
    };

    fetchWidgetData();
  }, [eventId]);

  return (
    <div>
      <div>Total Guests: {widgetData.totalGuests}</div>
      <div>Check-in Rate: {widgetData.checkInRate}%</div>
      <div>Top Gift: {widgetData.topGift}</div>
      <div>Top Category: {widgetData.topCategory}</div>
    </div>
  );
};
```

### Real-time Alerts
```javascript
const InventoryAlerts = ({ eventId }) => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const checkAlerts = async () => {
      const analytics = await getAllEventAnalytics(eventId);
      
      const newAlerts = [];
      
      // Low stock alert
      if (analytics.inventorySummary.lowStockItems > 0) {
        newAlerts.push({
          type: 'warning',
          message: `${analytics.inventorySummary.lowStockItems} items are low on stock`
        });
      }
      
      // High utilization alert
      if (analytics.inventorySummary.averageUtilizationRate > 90) {
        newAlerts.push({
          type: 'info',
          message: 'Inventory utilization is very high'
        });
      }
      
      // Low check-in rate alert
      if (analytics.eventStats.checkInPercentage < 50) {
        newAlerts.push({
          type: 'warning',
          message: 'Check-in rate is below 50%'
        });
      }
      
      setAlerts(newAlerts);
    };

    checkAlerts();
  }, [eventId]);

  return (
    <div>
      {alerts.map((alert, idx) => (
        <div key={idx} className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      ))}
    </div>
  );
};
```

### Performance Metrics
```javascript
const PerformanceMetrics = ({ eventId }) => {
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    const calculateMetrics = async () => {
      const analytics = await getAllEventAnalytics(eventId);
      
      const metrics = {
        // Efficiency metrics
        giftEfficiency: analytics.giftSummary.averageGiftsPerGuest,
        inventoryEfficiency: analytics.inventorySummary.averageUtilizationRate,
        checkInEfficiency: analytics.eventStats.checkInPercentage,
        
        // Performance indicators
        topPerformer: analytics.topGifts[0],
        mostPopularCategory: Object.entries(analytics.categoryTotals)
          .sort(([,a], [,b]) => b - a)[0],
        
        // Risk indicators
        lowStockRisk: analytics.inventorySummary.lowStockItems,
        lowCheckInRisk: analytics.eventStats.checkInPercentage < 70
      };
      
      setMetrics(metrics);
    };

    calculateMetrics();
  }, [eventId]);

  return (
    <div>
      <h3>Performance Metrics</h3>
      <p>Gift Efficiency: {metrics.giftEfficiency}</p>
      <p>Inventory Efficiency: {metrics.inventoryEfficiency}%</p>
      <p>Check-in Efficiency: {metrics.checkInEfficiency}%</p>
      <p>Top Performer: {metrics.topPerformer?.name}</p>
      <p>Most Popular: {metrics.mostPopularCategory?.[0]}</p>
    </div>
  );
};
```

## 7. Data Transformation Examples

### For Charts
```javascript
const prepareChartData = async (eventId) => {
  const analytics = await getAllEventAnalytics(eventId);
  
  return {
    // Bar chart data
    topGiftsChart: analytics.topGifts.map(gift => ({
      name: gift.name,
      quantity: gift.totalQuantity,
      guests: gift.uniqueGuestCount
    })),
    
    // Pie chart data
    categoryChart: Object.entries(analytics.categoryTotals).map(([name, value]) => ({
      name,
      value
    })),
    
    // Line chart data
    timelineChart: analytics.checkInTimeline.map(item => ({
      date: item._id.date,
      checkIns: item.checkIns,
      gifts: item.giftsDistributed
    }))
  };
};
```

This approach gives you **granular control** over which specific data points you want to access and use in your components! 🎯 