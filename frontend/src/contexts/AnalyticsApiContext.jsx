import React, { createContext, useContext } from 'react';
import { getAllEventAnalytics } from '../services/analytics';

/**
 * Optional analytics API for advanced dashboards.
 * When provided (e.g. in portal), GiftAnalytics and EventAnalytics use this instead of the main api.
 * Signature: (eventId, filters?) => Promise<analytics>
 */
const AnalyticsApiContext = createContext(null);

export const useAnalyticsApi = () => {
  const context = useContext(AnalyticsApiContext);
  return context ?? getAllEventAnalytics;
};

export const AnalyticsApiProvider = AnalyticsApiContext.Provider;
export default AnalyticsApiContext;
