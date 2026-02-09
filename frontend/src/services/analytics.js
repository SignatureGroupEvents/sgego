import api from './api';

/**
 * Get comprehensive overview analytics across all events
 * @param {Object} filters - Filter object
 * @param {string} [filters.eventId] - Optional event ID to filter by specific event
 * @param {string} [filters.year] - Optional year filter (backward compatibility)
 * @param {string} [filters.startDate] - Optional start date filter (ISO 8601 format)
 * @param {string} [filters.endDate] - Optional end date filter (ISO 8601 format)
 * @param {string} [filters.eventType] - Optional event type filter
 * @param {string[]} [filters.giftTypes] - Optional gift types filter
 * @param {string[]} [filters.giftStyles] - Optional gift styles filter
 * @param {string} [filters.groupBy] - Grouping for trend analysis ('month', 'week', 'day', 'event')
 * @returns {Promise<Object>} Analytics data
 */
export const getOverviewAnalytics = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    // Standard filter parameters
    if (filters.eventId) params.append('eventId', filters.eventId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    // Legacy/backward compatibility parameters
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

/**
 * Get analytics for specific gift type or style
 * @param {Object} filters - Filter object
 * @param {string} [filters.eventId] - Optional event ID to filter by specific event
 * @param {string} [filters.giftType] - Optional gift type filter (single value)
 * @param {string} [filters.giftStyle] - Optional gift style filter (single value)
 * @param {string} [filters.startDate] - Optional start date filter (ISO 8601 format)
 * @param {string} [filters.endDate] - Optional end date filter (ISO 8601 format)
 * @returns {Promise<Object>} Analytics data grouped by event, gift type, style, size, and gender
 */
export const getGiftTypeAnalytics = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    // Standard filter parameters
    if (filters.eventId) params.append('eventId', filters.eventId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.giftType) params.append('giftType', filters.giftType);
    if (filters.giftStyle) params.append('giftStyle', filters.giftStyle);

    const response = await api.get(`/analytics/gift-type?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching gift type analytics:', error);
    throw error;
  }
};

/**
 * Get comprehensive event-specific analytics (both event and gift analytics)
 * @param {string} eventId - Event ID
 * @param {Object} [filters={}] - Optional filter object
 * @param {string} [filters.startDate] - Optional start date filter (ISO 8601 format)
 * @param {string} [filters.endDate] - Optional end date filter (ISO 8601 format)
 * @returns {Promise<Object>} Comprehensive analytics data
 */
export const getEventGiftAnalytics = async (eventId, filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const queryString = params.toString();
    const url = `/events/${eventId}/analytics${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching event gift analytics:', error);
    throw error;
  }
};

/**
 * Get event-specific analytics only
 * @param {string} eventId - Event ID
 * @param {Object} [filters={}] - Optional filter object
 * @param {string} [filters.startDate] - Optional start date filter (ISO 8601 format)
 * @param {string} [filters.endDate] - Optional end date filter (ISO 8601 format)
 * @returns {Promise<Object>} Event analytics data
 */
export const getEventAnalytics = async (eventId, filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const queryString = params.toString();
    const url = `/events/${eventId}/analytics${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
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

/**
 * Get gift-specific analytics only
 * @param {string} eventId - Event ID
 * @param {Object} [filters={}] - Optional filter object
 * @param {string} [filters.startDate] - Optional start date filter (ISO 8601 format)
 * @param {string} [filters.endDate] - Optional end date filter (ISO 8601 format)
 * @returns {Promise<Object>} Gift analytics data
 */
export const getGiftAnalytics = async (eventId, filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const queryString = params.toString();
    const url = `/events/${eventId}/analytics${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
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

/**
 * Get inventory-specific analytics only
 * @param {string} eventId - Event ID
 * @param {Object} [filters={}] - Optional filter object
 * @param {string} [filters.startDate] - Optional start date filter (ISO 8601 format)
 * @param {string} [filters.endDate] - Optional end date filter (ISO 8601 format)
 * @returns {Promise<Object>} Inventory analytics data
 */
export const getInventoryAnalytics = async (eventId, filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const queryString = params.toString();
    const url = `/events/${eventId}/analytics${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return {
      inventoryAnalytics: response.data.analytics.inventoryAnalytics,
      inventorySummary: response.data.analytics.inventorySummary
    };
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    throw error;
  }
};

/**
 * Get all analytics data for advanced dashboard
 * @param {string} eventId - Event ID
 * @param {Object} [filters={}] - Optional filter object
 * @param {string} [filters.startDate] - Optional start date filter (ISO 8601 format)
 * @param {string} [filters.endDate] - Optional end date filter (ISO 8601 format)
 * @returns {Promise<Object>} All analytics data
 */
export const getAllEventAnalytics = async (eventId, filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.startDate) {
      params.append('startDate', filters.startDate);
      console.log('📤 Adding startDate to query:', filters.startDate);
    }
    if (filters.endDate) {
      params.append('endDate', filters.endDate);
      console.log('📤 Adding endDate to query:', filters.endDate);
    }
    if (filters.timelineGroupBy) {
      params.append('timelineGroupBy', filters.timelineGroupBy);
    }
    
    const queryString = params.toString();
    const url = `/events/${eventId}/analytics${queryString ? `?${queryString}` : ''}`;
    console.log('🌐 Making request to:', url);
    const response = await api.get(url);
    console.log('✅ Response received, analytics keys:', Object.keys(response.data.analytics || {}));
    return response.data.analytics;
  } catch (error) {
    console.error('Error fetching all event analytics:', error);
    throw error;
  }
};

/**
 * Export analytics data
 * @param {Object} filters - Filter object
 * @param {string} [filters.eventId] - Optional event ID to filter by specific event
 * @param {string} [filters.year] - Optional year filter (backward compatibility)
 * @param {string} [filters.startDate] - Optional start date filter (ISO 8601 format)
 * @param {string} [filters.endDate] - Optional end date filter (ISO 8601 format)
 * @param {string} [filters.eventType] - Optional event type filter
 * @param {string[]} [filters.giftTypes] - Optional gift types filter
 * @param {string[]} [filters.giftStyles] - Optional gift styles filter
 * @param {string} [filters.groupBy] - Grouping for trend analysis
 * @param {string} [format='csv'] - Export format ('csv' or 'excel')
 * @returns {Promise<Object>} Export result
 */
export const exportAnalytics = async (filters = {}, format = 'csv') => {
  try {
    const params = new URLSearchParams();
    
    // Standard filter parameters
    if (filters.eventId) params.append('eventId', filters.eventId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    // Legacy/backward compatibility parameters
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