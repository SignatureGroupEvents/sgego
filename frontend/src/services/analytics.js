import api from './api';

// Get comprehensive overview analytics across all events
export const getOverviewAnalytics = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.year) params.append('year', filters.year);
    if (filters.eventType) params.append('eventType', filters.eventType);
    if (filters.giftTypes && filters.giftTypes.length > 0) {
      filters.giftTypes.forEach(type => params.append('giftTypes', type));
    }
    if (filters.giftStyles && filters.giftStyles.length > 0) {
      filters.giftStyles.forEach(style => params.append('giftStyles', style));
    }
    if (filters.groupBy) params.append('groupBy', filters.groupBy);

    const response = await api.get(`/analytics/overview?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching overview analytics:', error);
    throw error;
  }
};

// Get analytics for specific gift type or style
export const getGiftTypeAnalytics = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.year) params.append('year', filters.year);
    if (filters.giftTypes && filters.giftTypes.length > 0) {
      filters.giftTypes.forEach(type => params.append('giftTypes', type));
    }
    if (filters.giftStyles && filters.giftStyles.length > 0) {
      filters.giftStyles.forEach(style => params.append('giftStyles', style));
    }

    const response = await api.get(`/analytics/gift-type?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching gift type analytics:', error);
    throw error;
  }
};

// Get comprehensive event-specific analytics (both event and gift analytics)
export const getEventGiftAnalytics = async (eventId) => {
  try {
    const response = await api.get(`/events/${eventId}/analytics`);
    return response.data;
  } catch (error) {
    console.error('Error fetching event gift analytics:', error);
    throw error;
  }
};

// Get event-specific analytics only
export const getEventAnalytics = async (eventId) => {
  try {
    const response = await api.get(`/events/${eventId}/analytics`);
    return {
      eventStats: response.data.analytics.eventStats,
      checkInTimeline: response.data.analytics.checkInTimeline,
      inventorySummary: response.data.analytics.inventorySummary
    };
  } catch (error) {
    console.error('Error fetching event analytics:', error);
    throw error;
  }
};

// Get gift-specific analytics only
export const getGiftAnalytics = async (eventId) => {
  try {
    const response = await api.get(`/events/${eventId}/analytics`);
    return {
      giftDistribution: response.data.analytics.giftDistribution,
      categoryTotals: response.data.analytics.categoryTotals,
      topGifts: response.data.analytics.topGifts,
      giftSummary: response.data.analytics.giftSummary
    };
  } catch (error) {
    console.error('Error fetching gift analytics:', error);
    throw error;
  }
};

// Get inventory-specific analytics only
export const getInventoryAnalytics = async (eventId) => {
  try {
    const response = await api.get(`/events/${eventId}/analytics`);
    return {
      inventoryAnalytics: response.data.analytics.inventoryAnalytics,
      inventorySummary: response.data.analytics.inventorySummary
    };
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    throw error;
  }
};

// Get all analytics data for advanced dashboard
export const getAllEventAnalytics = async (eventId) => {
  try {
    const response = await api.get(`/events/${eventId}/analytics`);
    return response.data.analytics;
  } catch (error) {
    console.error('Error fetching all event analytics:', error);
    throw error;
  }
};

// Export analytics data
export const exportAnalytics = async (filters = {}, format = 'csv') => {
  try {
    const params = new URLSearchParams();
    
    if (filters.year) params.append('year', filters.year);
    if (filters.eventType) params.append('eventType', filters.eventType);
    if (filters.giftTypes && filters.giftTypes.length > 0) {
      filters.giftTypes.forEach(type => params.append('giftTypes', type));
    }
    if (filters.giftStyles && filters.giftStyles.length > 0) {
      filters.giftStyles.forEach(style => params.append('giftStyles', style));
    }
    if (filters.groupBy) params.append('groupBy', filters.groupBy);
    
    params.append('format', format);

    const response = await api.get(`/analytics/export?${params.toString()}`, {
      responseType: 'blob'
    });

    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const extension = format === 'excel' ? 'xlsx' : 'csv';
    link.download = `analytics_overview_${date}.${extension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error('Error exporting analytics:', error);
    throw error;
  }
}; 