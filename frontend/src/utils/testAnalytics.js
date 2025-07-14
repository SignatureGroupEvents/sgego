// Analytics Testing Utility
// Run this in your browser console to test the analytics functionality

import { getAllEventAnalytics, getEventAnalytics, getGiftAnalytics } from '../services/analytics';

// Test configuration
const TEST_CONFIG = {
  eventId: 'YOUR_EVENT_ID_HERE', // Replace with actual event ID
  enableLogging: true,
  testAllFunctions: true
};

// Utility functions
const log = (message, data = null) => {
  if (TEST_CONFIG.enableLogging) {
    console.log(`🧪 ${message}`, data || '');
  }
};

const logError = (message, error = null) => {
  if (TEST_CONFIG.enableLogging) {
    console.error(`❌ ${message}`, error || '');
  }
};

const logSuccess = (message, data = null) => {
  if (TEST_CONFIG.enableLogging) {
    console.log(`✅ ${message}`, data || '');
  }
};

// Test 1: Test getAllEventAnalytics
export const testGetAllEventAnalytics = async (eventId = TEST_CONFIG.eventId) => {
  log('Testing getAllEventAnalytics...');
  
  try {
    const startTime = performance.now();
    const analytics = await getAllEventAnalytics(eventId);
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    logSuccess(`getAllEventAnalytics completed in ${responseTime.toFixed(2)}ms`);
    
    // Validate response structure
    const requiredSections = ['eventStats', 'giftSummary', 'inventorySummary', 'topGifts', 'categoryTotals', 'checkInTimeline'];
    const missingSections = requiredSections.filter(section => !analytics[section]);
    
    if (missingSections.length > 0) {
      logError(`Missing analytics sections: ${missingSections.join(', ')}`);
      return false;
    }
    
    logSuccess('Analytics response structure is valid');
    
    // Log key metrics
    log('Event Stats:', {
      totalGuests: analytics.eventStats.totalGuests,
      checkedInGuests: analytics.eventStats.checkedInGuests,
      checkInPercentage: analytics.eventStats.checkInPercentage
    });
    
    log('Gift Summary:', {
      totalGiftsDistributed: analytics.giftSummary.totalGiftsDistributed,
      averageGiftsPerGuest: analytics.giftSummary.averageGiftsPerGuest
    });
    
    log('Inventory Summary:', {
      totalInventoryItems: analytics.inventorySummary.totalInventoryItems,
      lowStockItems: analytics.inventorySummary.lowStockItems
    });
    
    return true;
  } catch (error) {
    logError('getAllEventAnalytics failed', error);
    return false;
  }
};

// Test 2: Test specific data access
export const testSpecificDataAccess = async (eventId = TEST_CONFIG.eventId) => {
  log('Testing specific data access...');
  
  try {
    const analytics = await getAllEventAnalytics(eventId);
    
    // Test event stats access
    const eventStats = analytics.eventStats;
    log('Event Stats Access:', {
      totalGuests: eventStats.totalGuests,
      checkInRate: eventStats.checkInPercentage,
      eventName: eventStats.eventName
    });
    
    // Test gift data access
    const topGift = analytics.topGifts[0];
    log('Top Gift Access:', {
      name: topGift?.name,
      quantity: topGift?.totalQuantity,
      guests: topGift?.uniqueGuestCount
    });
    
    // Test category data access
    const categories = Object.keys(analytics.categoryTotals);
    const topCategory = Object.entries(analytics.categoryTotals)
      .sort(([,a], [,b]) => b - a)[0];
    
    log('Category Access:', {
      allCategories: categories,
      topCategory: topCategory ? `${topCategory[0]} (${topCategory[1]})` : 'None'
    });
    
    // Test inventory data access
    const inventorySummary = analytics.inventorySummary;
    log('Inventory Access:', {
      totalItems: inventorySummary.totalInventoryItems,
      utilizationRate: inventorySummary.averageUtilizationRate,
      lowStockCount: inventorySummary.lowStockItems
    });
    
    // Test timeline data access
    const today = new Date().toISOString().split('T')[0];
    const todayData = analytics.checkInTimeline.find(item => item._id.date === today);
    
    log('Timeline Access:', {
      today: today,
      todayCheckIns: todayData?.checkIns || 0,
      todayGifts: todayData?.giftsDistributed || 0,
      totalTimelineEntries: analytics.checkInTimeline.length
    });
    
    logSuccess('Specific data access test completed');
    return true;
  } catch (error) {
    logError('Specific data access test failed', error);
    return false;
  }
};

// Test 3: Test individual analytics functions
export const testIndividualFunctions = async (eventId = TEST_CONFIG.eventId) => {
  log('Testing individual analytics functions...');
  
  try {
    // Test getEventAnalytics
    const eventData = await getEventAnalytics(eventId);
    log('Event Analytics:', eventData);
    
    // Test getGiftAnalytics
    const giftData = await getGiftAnalytics(eventId);
    log('Gift Analytics:', giftData);
    
    // Test getInventoryAnalytics
    const inventoryData = await getInventoryAnalytics(eventId);
    log('Inventory Analytics:', inventoryData);
    
    logSuccess('Individual functions test completed');
    return true;
  } catch (error) {
    logError('Individual functions test failed', error);
    return false;
  }
};

// Test 4: Performance test
export const testPerformance = async (eventId = TEST_CONFIG.eventId, iterations = 5) => {
  log(`Testing performance with ${iterations} iterations...`);
  
  const responseTimes = [];
  
  for (let i = 0; i < iterations; i++) {
    try {
      const startTime = performance.now();
      await getAllEventAnalytics(eventId);
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      responseTimes.push(responseTime);
      
      log(`Iteration ${i + 1}: ${responseTime.toFixed(2)}ms`);
    } catch (error) {
      logError(`Iteration ${i + 1} failed`, error);
    }
  }
  
  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    
    logSuccess('Performance Test Results:', {
      average: `${avgResponseTime.toFixed(2)}ms`,
      min: `${minResponseTime.toFixed(2)}ms`,
      max: `${maxResponseTime.toFixed(2)}ms`,
      iterations: responseTimes.length
    });
    
    // Performance thresholds
    if (avgResponseTime < 1000) {
      logSuccess('✅ Performance is good (avg < 1000ms)');
    } else if (avgResponseTime < 2000) {
      log('⚠️ Performance is acceptable (avg < 2000ms)');
    } else {
      logError('❌ Performance is poor (avg > 2000ms)');
    }
  }
  
  return responseTimes;
};

// Test 5: Error handling test
export const testErrorHandling = async () => {
  log('Testing error handling...');
  
  try {
    // Test with invalid event ID
    await getAllEventAnalytics('invalid-event-id');
    logError('Expected error for invalid event ID, but request succeeded');
    return false;
  } catch (error) {
    logSuccess('Error handling works correctly for invalid event ID');
  }
  
  try {
    // Test with empty event ID
    await getAllEventAnalytics('');
    logError('Expected error for empty event ID, but request succeeded');
    return false;
  } catch (error) {
    logSuccess('Error handling works correctly for empty event ID');
  }
  
  logSuccess('Error handling test completed');
  return true;
};

// Test 6: Test with empty data (new function)
export const testEmptyData = async (eventId = TEST_CONFIG.eventId) => {
  log('Testing analytics with empty data...');
  
  try {
    const analytics = await getAllEventAnalytics(eventId);
    
    log('Empty Data Test Results:');
    log('Event Stats:', analytics.eventStats);
    log('Gift Summary:', analytics.giftSummary);
    log('Inventory Summary:', analytics.inventorySummary);
    log('Top Gifts:', analytics.topGifts);
    log('Category Totals:', analytics.categoryTotals);
    log('Check-in Timeline:', analytics.checkInTimeline);
    
    // Check if data is empty
    const hasGuests = analytics.eventStats.totalGuests > 0;
    const hasGifts = analytics.giftSummary.totalGiftsDistributed > 0;
    const hasInventory = analytics.inventorySummary.totalInventoryItems > 0;
    const hasCheckins = analytics.checkInTimeline.length > 0;
    
    if (!hasGuests && !hasGifts && !hasInventory && !hasCheckins) {
      log('📝 No data found. This is expected if:');
      log('   - No guests have been added to the event');
      log('   - No inventory items have been created');
      log('   - No check-ins have been performed');
      log('   - No gifts have been distributed');
      log('');
      log('💡 To see analytics data, you need to:');
      log('   1. Add guests to the event');
      log('   2. Create inventory items');
      log('   3. Perform some check-ins');
      log('   4. Distribute gifts during check-ins');
      log('');
      log('✅ Analytics endpoint is working correctly with empty data');
      return true;
    } else {
      logSuccess('✅ Found some data in the analytics');
      return true;
    }
  } catch (error) {
    logError('Empty data test failed', error);
    return false;
  }
};

// Main test runner
export const runAllTests = async (eventId = TEST_CONFIG.eventId) => {
  console.log('🚀 Starting Analytics Tests...');
  console.log('Event ID:', eventId);
  console.log('='.repeat(50));
  
  const results = {
    getAllEventAnalytics: false,
    specificDataAccess: false,
    individualFunctions: false,
    performance: false,
    errorHandling: false,
    emptyData: false
  };
  
  // Run all tests
  results.getAllEventAnalytics = await testGetAllEventAnalytics(eventId);
  results.specificDataAccess = await testSpecificDataAccess(eventId);
  results.individualFunctions = await testIndividualFunctions(eventId);
  results.performance = await testPerformance(eventId);
  results.errorHandling = await testErrorHandling();
  results.emptyData = await testEmptyData(eventId);
  
  // Summary
  console.log('='.repeat(50));
  console.log('📊 Test Results Summary:');
  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${test}: ${status}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Analytics system is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the logs above for details.');
  }
  
  return results;
};

// Quick test function
export const quickTest = async (eventId = TEST_CONFIG.eventId) => {
  console.log('⚡ Quick Analytics Test...');
  
  try {
    const analytics = await getAllEventAnalytics(eventId);
    console.log('✅ Analytics loaded successfully');
    console.log('📊 Key Metrics:', {
      totalGuests: analytics.eventStats.totalGuests,
      checkInRate: analytics.eventStats.checkInPercentage,
      totalGifts: analytics.giftSummary.totalGiftsDistributed,
      topGift: analytics.topGifts[0]?.name || 'None'
    });
    
    // Check if data is empty
    if (analytics.eventStats.totalGuests === 0 && analytics.giftSummary.totalGiftsDistributed === 0) {
      console.log('📝 No data found - this is normal for new events');
      console.log('💡 Add guests, inventory, and perform check-ins to see data');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return false;
  }
};

// Export for browser console usage
if (typeof window !== 'undefined') {
  window.testAnalytics = {
    runAllTests,
    quickTest,
    testGetAllEventAnalytics,
    testSpecificDataAccess,
    testIndividualFunctions,
    testPerformance,
    testErrorHandling,
    testEmptyData
  };
  
  console.log('🧪 Analytics testing utilities loaded!');
  console.log('Available functions:');
  console.log('- window.testAnalytics.quickTest(eventId)');
  console.log('- window.testAnalytics.runAllTests(eventId)');
  console.log('- window.testAnalytics.testEmptyData(eventId)');
  console.log('- window.testAnalytics.testGetAllEventAnalytics(eventId)');
  console.log('- window.testAnalytics.testSpecificDataAccess(eventId)');
  console.log('- window.testAnalytics.testPerformance(eventId)');
} 