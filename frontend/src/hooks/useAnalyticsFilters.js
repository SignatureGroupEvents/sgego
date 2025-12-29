import { useState, useCallback } from 'react';

/**
 * Custom hook for managing analytics filter state
 * 
 * @param {string|null} initialEventId - Initial event ID (optional)
 * @returns {Object} Filter state and helper functions
 * @returns {Object} returns.filters - Standardized filter object with eventId, startDate, endDate
 * @returns {Function} returns.updateFilter - Function to update a specific filter
 * @returns {Function} returns.setFilters - Function to set all filters at once
 * @returns {Function} returns.resetFilters - Function to reset all filters to initial state
 * @returns {Function} returns.isValid - Function to validate filter state
 * @returns {string|null} returns.eventId - Current event ID
 * @returns {Date|null} returns.startDate - Current start date (Date object)
 * @returns {Date|null} returns.endDate - Current end date (Date object)
 * @returns {Function} returns.setEventId - Function to set event ID
 * @returns {Function} returns.setStartDate - Function to set start date
 * @returns {Function} returns.setEndDate - Function to set end date
 */
export const useAnalyticsFilters = (initialEventId = null) => {
  const [eventId, setEventId] = useState(initialEventId);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  /**
   * Update a specific filter by key
   * @param {string} key - Filter key ('eventId', 'startDate', 'endDate')
   * @param {any} value - Filter value
   */
  const updateFilter = useCallback((key, value) => {
    switch (key) {
      case 'eventId':
        setEventId(value);
        break;
      case 'startDate':
        // Accept Date object or ISO string
        setStartDate(value instanceof Date ? value : value ? new Date(value) : null);
        break;
      case 'endDate':
        // Accept Date object or ISO string
        setEndDate(value instanceof Date ? value : value ? new Date(value) : null);
        break;
      default:
        console.warn(`Unknown filter key: ${key}`);
    }
  }, []);

  /**
   * Set all filters at once
   * @param {Object} newFilters - Filter object with eventId, startDate, endDate
   */
  const setFilters = useCallback((newFilters) => {
    if (newFilters.eventId !== undefined) {
      setEventId(newFilters.eventId);
    }
    if (newFilters.startDate !== undefined) {
      setStartDate(newFilters.startDate instanceof Date 
        ? newFilters.startDate 
        : newFilters.startDate ? new Date(newFilters.startDate) : null);
    }
    if (newFilters.endDate !== undefined) {
      setEndDate(newFilters.endDate instanceof Date 
        ? newFilters.endDate 
        : newFilters.endDate ? new Date(newFilters.endDate) : null);
    }
  }, []);

  /**
   * Reset all filters to initial state
   */
  const resetFilters = useCallback(() => {
    setEventId(initialEventId);
    setStartDate(null);
    setEndDate(null);
  }, [initialEventId]);

  /**
   * Validate filter state
   * @returns {boolean} True if filters are valid
   */
  const isValid = useCallback(() => {
    // Check date validity
    if (startDate && isNaN(startDate.getTime())) return false;
    if (endDate && isNaN(endDate.getTime())) return false;
    
    // Check date range validity (startDate should be before endDate)
    if (startDate && endDate && startDate > endDate) return false;
    
    return true;
  }, [startDate, endDate]);

  /**
   * Get standardized filter object for API calls
   * Converts Date objects to ISO strings, removes null/undefined values
   */
  const filters = {
    ...(eventId && { eventId }),
    ...(startDate && { startDate: startDate.toISOString() }),
    ...(endDate && { endDate: endDate.toISOString() })
  };

  return {
    // Standardized filter object (for API calls)
    filters,
    
    // Individual state values
    eventId,
    startDate,
    endDate,
    
    // State setters
    setEventId,
    setStartDate,
    setEndDate,
    
    // Helper functions
    updateFilter,
    setFilters,
    resetFilters,
    isValid
  };
};
