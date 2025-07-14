# Testing the Enhanced Analytics System

This guide shows you how to test the enhanced analytics endpoint and components using various methods.

## 1. Backend API Testing

### Using Postman or Similar Tools

#### Test the Analytics Endpoint
```
GET http://localhost:3001/api/events/{eventId}/analytics
```

**Headers:**
```
Authorization: Bearer {your-jwt-token}
Content-Type: application/json
```

**Example Response:**
```json
{
  "success": true,
  "analytics": {
    "eventStats": {
      "totalGuests": 150,
      "checkedInGuests": 120,
      "pendingGuests": 30,
      "checkInPercentage": 80,
      "eventName": "Test Event 2024",
      "eventContractNumber": "TEST-2024-001",
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
    "topGifts": [...],
    "categoryTotals": {...},
    "inventorySummary": {...},
    "checkInTimeline": [...]
  }
}
```

### Using cURL

```bash
# Test analytics endpoint
curl -X GET \
  http://localhost:3001/api/events/YOUR_EVENT_ID/analytics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Test with specific event ID
curl -X GET \
  http://localhost:3001/api/events/507f1f77bcf86cd799439011/analytics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 2. Frontend Component Testing

### Test the SpecificAnalyticsExamples Component

1. **Add the component to your route:**

```javascript
// In your App.jsx or route file
import SpecificAnalyticsExamples from './components/dashboard/SpecificAnalyticsExamples';

// Add a test route
<Route path="/test-analytics/:eventId" element={
  <ProtectedRoute>
    <SpecificAnalyticsExamples eventId={useParams().eventId} />
  </ProtectedRoute>
} />
```

2. **Navigate to the test page:**
```
http://localhost:3000/test-analytics/YOUR_EVENT_ID
```

### Test the ComprehensiveAnalytics Component

```javascript
// Add to your routes
<Route path="/comprehensive-analytics/:eventId" element={
  <ProtectedRoute>
    <ComprehensiveAnalytics eventId={useParams().eventId} />
  </ProtectedRoute>
} />
```

## 3. Browser Console Testing

### Test Analytics Service Functions

Open your browser's developer console and run:

```javascript
// Test getAllEventAnalytics
const testAnalytics = async () => {
  try {
    const analytics = await getAllEventAnalytics('YOUR_EVENT_ID');
    console.log('Full Analytics:', analytics);
    
    // Test specific data access
    console.log('Event Stats:', analytics.eventStats);
    console.log('Top Gifts:', analytics.topGifts);
    console.log('Gift Summary:', analytics.giftSummary);
    console.log('Inventory Summary:', analytics.inventorySummary);
    
    return analytics;
  } catch (error) {
    console.error('Analytics Error:', error);
  }
};

// Run the test
testAnalytics();
```

### Test Specific Data Access

```javascript
// Test specific data extraction
const testSpecificData = async () => {
  const analytics = await getAllEventAnalytics('YOUR_EVENT_ID');
  
  // Test event stats
  console.log('Total Guests:', analytics.eventStats.totalGuests);
  console.log('Check-in Rate:', analytics.eventStats.checkInPercentage);
  
  // Test gift data
  console.log('Top Gift:', analytics.topGifts[0]?.name);
  console.log('Total Gifts:', analytics.giftSummary.totalGiftsDistributed);
  
  // Test inventory data
  console.log('Low Stock Items:', analytics.inventorySummary.lowStockItems);
  console.log('Utilization Rate:', analytics.inventorySummary.averageUtilizationRate);
  
  // Test timeline data
  console.log('Today\'s Check-ins:', analytics.checkInTimeline.find(item => 
    item._id.date === new Date().toISOString().split('T')[0]
  ));
};

testSpecificData();
```

## 4. Unit Testing with Jest

### Create Test Files

```javascript
// __tests__/analytics.test.js
import { getAllEventAnalytics, getEventAnalytics, getGiftAnalytics } from '../services/analytics';

// Mock the API
jest.mock('../services/api', () => ({
  get: jest.fn()
}));

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAllEventAnalytics returns correct structure', async () => {
    const mockResponse = {
      data: {
        analytics: {
          eventStats: {
            totalGuests: 150,
            checkedInGuests: 120,
            checkInPercentage: 80
          },
          giftSummary: {
            totalGiftsDistributed: 90,
            averageGiftsPerGuest: 0.75
          },
          topGifts: [
            {
              name: 'Red Tote (M)',
              totalQuantity: 25,
              uniqueGuestCount: 25
            }
          ]
        }
      }
    };

    // Mock the API response
    require('../services/api').get.mockResolvedValue(mockResponse);

    const result = await getAllEventAnalytics('test-event-id');

    expect(result.eventStats.totalGuests).toBe(150);
    expect(result.giftSummary.totalGiftsDistributed).toBe(90);
    expect(result.topGifts[0].name).toBe('Red Tote (M)');
  });
});
```

### Test Component Rendering

```javascript
// __tests__/SpecificAnalyticsExamples.test.jsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SpecificAnalyticsExamples from '../components/dashboard/SpecificAnalyticsExamples';

// Mock the analytics service
jest.mock('../../services/analytics', () => ({
  getAllEventAnalytics: jest.fn()
}));

describe('SpecificAnalyticsExamples', () => {
  const mockAnalytics = {
    eventStats: {
      totalGuests: 150,
      checkedInGuests: 120,
      pendingGuests: 30,
      checkInPercentage: 80,
      eventName: 'Test Event',
      eventContractNumber: 'TEST-001'
    },
    giftSummary: {
      totalGiftsDistributed: 90,
      averageGiftsPerGuest: 0.75,
      uniqueItemsDistributed: 8
    },
    inventorySummary: {
      totalInventoryItems: 12,
      averageUtilizationRate: 68.5,
      lowStockItems: 3
    },
    topGifts: [
      {
        name: 'Red Tote (M)',
        type: 'Tote Bag',
        totalQuantity: 25,
        uniqueGuestCount: 25
      }
    ],
    categoryTotals: {
      'Accessories': 45,
      'Clothing': 30
    },
    checkInTimeline: [
      {
        _id: { date: '2024-01-15' },
        checkIns: 15,
        giftsDistributed: 12
      }
    ]
  };

  beforeEach(() => {
    require('../../services/analytics').getAllEventAnalytics.mockResolvedValue(mockAnalytics);
  });

  test('renders analytics data correctly', async () => {
    render(<SpecificAnalyticsExamples eventId="test-event-id" />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total guests
      expect(screen.getByText('80%')).toBeInTheDocument(); // Check-in rate
      expect(screen.getByText('90')).toBeInTheDocument(); // Total gifts
      expect(screen.getByText('Red Tote (M)')).toBeInTheDocument(); // Top gift
    });
  });

  test('shows loading state initially', () => {
    render(<SpecificAnalyticsExamples eventId="test-event-id" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('shows error state when API fails', async () => {
    require('../../services/analytics').getAllEventAnalytics.mockRejectedValue(
      new Error('API Error')
    );

    render(<SpecificAnalyticsExamples eventId="test-event-id" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument();
    });
  });
});
```

## 5. Integration Testing

### Test with Real Data

1. **Create test data in your database:**
```javascript
// Create test event
const testEvent = await Event.create({
  eventName: 'Test Analytics Event',
  eventContractNumber: 'TEST-ANALYTICS-001',
  isMainEvent: true
});

// Create test guests
await Guest.create([
  { eventId: testEvent._id, firstName: 'John', lastName: 'Doe', hasCheckedIn: true },
  { eventId: testEvent._id, firstName: 'Jane', lastName: 'Smith', hasCheckedIn: true },
  { eventId: testEvent._id, firstName: 'Bob', lastName: 'Johnson', hasCheckedIn: false }
]);

// Create test inventory
await Inventory.create([
  { 
    eventId: testEvent._id, 
    type: 'Tote Bag', 
    style: 'Red Tote', 
    size: 'M',
    currentInventory: 20,
    qtyWarehouse: 50,
    qtyOnSite: 30
  }
]);

// Create test check-ins
await Checkin.create([
  {
    eventId: testEvent._id,
    guestId: 'guest-id-1',
    giftsDistributed: [
      { inventoryId: 'inventory-id-1', quantity: 1 }
    ],
    isValid: true
  }
]);
```

2. **Test the complete flow:**
```javascript
// Test the full analytics flow
const testCompleteFlow = async () => {
  // 1. Create test data
  const eventId = await createTestEvent();
  
  // 2. Test analytics endpoint
  const analytics = await getAllEventAnalytics(eventId);
  
  // 3. Verify data structure
  expect(analytics.eventStats.totalGuests).toBe(3);
  expect(analytics.eventStats.checkedInGuests).toBe(2);
  expect(analytics.eventStats.checkInPercentage).toBe(67);
  
  // 4. Test component rendering
  render(<SpecificAnalyticsExamples eventId={eventId} />);
  
  await waitFor(() => {
    expect(screen.getByText('3')).toBeInTheDocument(); // Total guests
    expect(screen.getByText('67%')).toBeInTheDocument(); // Check-in rate
  });
};
```

## 6. Performance Testing

### Test API Response Time

```javascript
// Test analytics endpoint performance
const testPerformance = async () => {
  const startTime = performance.now();
  
  const analytics = await getAllEventAnalytics('YOUR_EVENT_ID');
  
  const endTime = performance.now();
  const responseTime = endTime - startTime;
  
  console.log(`Analytics API response time: ${responseTime}ms`);
  
  // Should be under 1000ms for good performance
  expect(responseTime).toBeLessThan(1000);
};
```

### Test Component Rendering Performance

```javascript
// Test component rendering performance
const testComponentPerformance = () => {
  const startTime = performance.now();
  
  render(<SpecificAnalyticsExamples eventId="test-event-id" />);
  
  const endTime = performance.now();
  const renderTime = endTime - startTime;
  
  console.log(`Component render time: ${renderTime}ms`);
  
  // Should be under 100ms for good performance
  expect(renderTime).toBeLessThan(100);
};
```

## 7. Manual Testing Checklist

### ✅ Backend Testing
- [ ] Analytics endpoint returns 200 status
- [ ] Response structure matches expected format
- [ ] All analytics sections are present
- [ ] Data calculations are correct
- [ ] Error handling works for invalid event IDs

### ✅ Frontend Testing
- [ ] Components load without errors
- [ ] Loading states display correctly
- [ ] Error states handle API failures
- [ ] Data displays correctly in UI
- [ ] Real-time updates work via WebSocket
- [ ] Responsive design works on different screen sizes

### ✅ Data Validation
- [ ] Event statistics are accurate
- [ ] Gift distribution data is correct
- [ ] Inventory analytics match actual inventory
- [ ] Timeline data shows correct dates
- [ ] Category totals add up correctly

### ✅ Performance Testing
- [ ] API response time is under 1 second
- [ ] Component rendering is under 100ms
- [ ] Memory usage is reasonable
- [ ] No memory leaks in long-running sessions

## 8. Debugging Tips

### Enable Debug Logging

```javascript
// Add to your analytics service
const getAllEventAnalytics = async (eventId) => {
  console.log('🔍 Fetching analytics for event:', eventId);
  
  try {
    const response = await api.get(`/events/${eventId}/analytics`);
    console.log('📊 Analytics response:', response.data);
    return response.data.analytics;
  } catch (error) {
    console.error('❌ Analytics error:', error);
    throw error;
  }
};
```

### Check Network Tab

1. Open browser DevTools
2. Go to Network tab
3. Navigate to analytics page
4. Look for the analytics API call
5. Check response status and data

### Test with Different Event IDs

```javascript
// Test with various event scenarios
const testScenarios = [
  'event-with-no-guests',
  'event-with-no-inventory',
  'event-with-no-checkins',
  'main-event-with-secondary-events'
];

testScenarios.forEach(async (scenario) => {
  console.log(`Testing scenario: ${scenario}`);
  const analytics = await getAllEventAnalytics(scenario);
  console.log(`Result:`, analytics);
});
```

This comprehensive testing approach ensures your analytics system works correctly across all scenarios! 🧪 