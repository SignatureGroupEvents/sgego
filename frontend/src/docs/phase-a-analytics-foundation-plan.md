# Phase A: Analytics Foundation - Implementation Plan

**Branch:** `feature/dashboard-analytics`  
**Date:** 2025-02-27  
**Status:** 📋 Planning (Implementation scheduled for tomorrow)

---

## Executive Summary

Standardize analytics data filtering across all endpoints and create a reusable filter system that will drive charts, exports, and activity feed in future phases. This phase focuses on establishing the foundation without implementing new features.

---

## 1. Current Analytics Implementation Analysis

### 1.1 Frontend Analytics Service (`frontend/src/services/analytics.js`)

**Current Functions:**
- `getOverviewAnalytics(filters)` - `/analytics/overview`
  - Filters: `year`, `eventType`, `giftTypes[]`, `giftStyles[]`, `groupBy`
  - **Missing:** `eventId`, `startDate`, `endDate`

- `getGiftTypeAnalytics(filters)` - `/analytics/gift-type`
  - Filters: `year`, `giftTypes[]`, `giftStyles[]`
  - **Missing:** `eventId`, `startDate`, `endDate`

- `getEventGiftAnalytics(eventId)` - `/events/:eventId/analytics`
  - **No filters supported** - only `eventId` in URL

- `getEventAnalytics(eventId)` - `/events/:eventId/analytics`
  - **No filters supported** - only `eventId` in URL

- `getGiftAnalytics(eventId)` - `/events/:eventId/analytics`
  - **No filters supported** - only `eventId` in URL

- `getInventoryAnalytics(eventId)` - `/events/:eventId/analytics`
  - **No filters supported** - only `eventId` in URL

- `getAllEventAnalytics(eventId)` - `/events/:eventId/analytics`
  - **No filters supported** - only `eventId` in URL

**Issues Identified:**
1. Event-specific endpoints (`/events/:eventId/analytics`) don't accept any query parameters
2. No date range filtering on event-specific endpoints
3. Overview endpoint uses `year` instead of `startDate`/`endDate`
4. Gift type endpoint has `startDate`/`endDate` but no `eventId` filtering
5. Inconsistent filter parameter handling

---

### 1.2 Backend Analytics Routes (`backend/routes/analytics.js`)

**Current Routes:**
- `GET /api/analytics/test` - Test route
- `GET /api/analytics/overview` - `analyticsController.getOverviewAnalytics`
- `POST /api/analytics/activity/test` - Test activity log
- `GET /api/analytics/activity` - Global activity feed
- `GET /api/analytics/events/:eventId/activity` - Event-specific activity feed

**Missing Routes:**
- No `/api/analytics/gift-type` route found (referenced in frontend but not in routes file)

---

### 1.3 Backend Event Analytics Route (`backend/routes/events.js`)

**Current Route:**
- `GET /api/events/:id/analytics` - `eventController.getEventAnalytics`
  - Only accepts `eventId` in URL params
  - **No query parameters for filtering**

---

### 1.4 Backend Controllers

#### `analyticsController.js`:
- `getOverviewAnalytics(req, res)`:
  - Accepts: `year`, `eventType`, `giftTypes`, `giftStyles`, `groupBy`
  - Uses `year` to build date range (converts to start/end of year)
  - **Missing:** `eventId`, `startDate`, `endDate` as direct params

- `getGiftTypeAnalytics(req, res)`:
  - Accepts: `giftType`, `giftStyle`, `startDate`, `endDate`
  - **Missing:** `eventId` parameter
  - Date format: Expects ISO string format

- `exportAnalytics(req, res)`:
  - Accepts: `format`, `startDate`, `endDate`, `eventType`, `giftType`, `giftStyle`, `groupBy`
  - **Missing:** `eventId` parameter

#### `eventController.js`:
- `getEventAnalytics(req, res)`:
  - Only accepts `eventId` from URL params
  - **No query parameters** - returns all data for event
  - No date filtering

---

### 1.5 Current Date Format Usage

**Frontend:**
- Uses `new Date().toISOString()` for date strings
- Format: ISO 8601 (e.g., `"2025-02-27T10:30:00.000Z"`)

**Backend:**
- `getGiftTypeAnalytics`: Expects ISO string format, converts with `new Date(startDate)`
- `getOverviewAnalytics`: Uses `year` parameter, builds dates: `new Date(\`${year}-01-01\`)`
- `exportAnalytics`: Uses ISO string format: `new Date(startDate)`

**Standard Format:** ISO 8601 strings (e.g., `"2025-02-27T00:00:00.000Z"`)

---

## 2. Proposed Filter Contract

### 2.1 Standard Filter Object Shape

```typescript
interface AnalyticsFilters {
  eventId: string;           // REQUIRED for event-specific endpoints
  startDate?: string;        // ISO 8601 string (optional)
  endDate?: string;          // ISO 8601 string (optional)
  // Future: Additional filters can be added without breaking existing code
}
```

### 2.2 Query Parameter Standardization

**All analytics endpoints should accept:**
- `eventId` - Required (can be in URL or query param)
- `startDate` - Optional ISO 8601 string
- `endDate` - Optional ISO 8601 string

**Format:** ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ` or `YYYY-MM-DD`)

**Default Behavior:**
- If no `startDate`/`endDate`: Return all data for the event
- If only `startDate`: Filter from `startDate` to end of event data
- If only `endDate`: Filter from beginning of event data to `endDate`

---

## 3. Files to Change

### 3.1 Backend Files

**`backend/routes/analytics.js`**
- Add route for `/gift-type` if missing
- Document query parameters in comments

**`backend/controllers/analyticsController.js`**
- `getOverviewAnalytics()`:
  - Add support for `eventId` query param
  - Change `year` to optional, add `startDate`/`endDate` support
  - Maintain backward compatibility with `year` parameter

- `getGiftTypeAnalytics()`:
  - Add support for `eventId` query param
  - Keep existing `startDate`/`endDate` support

- `exportAnalytics()`:
  - Add support for `eventId` query param
  - Keep existing date filtering

**`backend/routes/events.js`**
- No changes needed (route already exists)

**`backend/controllers/eventController.js`**
- `getEventAnalytics()`:
  - Add query parameter parsing for `startDate` and `endDate`
  - Apply date filtering to all aggregation pipelines
  - Maintain backward compatibility (if no dates, return all data)

### 3.2 Frontend Files

**`frontend/src/services/analytics.js`**
- Update all functions to accept consistent filter object
- Standardize parameter passing
- Add `startDate`/`endDate` to all event-specific functions

**New File: `frontend/src/hooks/useAnalyticsFilters.js`**
- Create reusable hook for filter state management
- Provides: `filters`, `setFilters`, `updateFilter`, `resetFilters`
- Handles event selection, date range selection
- Returns standardized filter object

**New File: `frontend/src/components/analytics/AnalyticsFilters.jsx`**
- Reusable filter component
- Event selector (dropdown/autocomplete)
- Date range picker (start date, end date)
- "Apply Filters" button (or live update)
- "Clear Filters" button

**`frontend/src/components/analytics/ComprehensiveAnalytics.jsx`**
- Integrate `useAnalyticsFilters` hook
- Use `AnalyticsFilters` component
- Pass filters to `getAllEventAnalytics()`
- Add loading/error handling

**`frontend/src/pages/Dashboard/AdvancedDashboard.jsx`**
- Integrate filter state (if needed)
- Pass filters to analytics components

**`frontend/src/components/dashboard/AdvancedDashboardTabs/EventAnalytics.jsx`**
- Integrate filter state
- Apply filters when fetching data

---

## 4. Implementation Steps

### Step 1: Define Filter Contract (Documentation)
- Document the standard filter object shape
- Create TypeScript/JSDoc types (if using TypeScript)
- Document query parameter format

### Step 2: Update Backend Endpoints
**Priority order:**
1. `eventController.getEventAnalytics()` - Most used endpoint
2. `analyticsController.getOverviewAnalytics()` - Overview dashboard
3. `analyticsController.getGiftTypeAnalytics()` - Gift-specific analytics

**Changes:**
- Add query parameter parsing for `startDate`, `endDate`
- Add `eventId` support where missing
- Apply date filtering to MongoDB aggregation pipelines
- Maintain backward compatibility (no breaking changes)

### Step 3: Update Frontend Service
- Standardize all `analytics.js` functions to accept filter object
- Update parameter building to use consistent format
- Ensure all functions pass `eventId`, `startDate`, `endDate` when provided

### Step 4: Create Filter Hook
- Implement `useAnalyticsFilters` hook
- Manage filter state (eventId, startDate, endDate)
- Provide helper functions (update, reset, validate)

### Step 5: Create Filter Component
- Build `AnalyticsFilters` component
- Event selector (for non-event-specific pages)
- Date range picker
- Apply/Clear buttons

### Step 6: Integrate Filters
- Update `ComprehensiveAnalytics` to use filters
- Update `EventAnalytics` to use filters
- Add loading states during filter changes
- Add error handling

---

## 5. Backward Compatibility Strategy

### 5.1 Backend Compatibility
- **Event Analytics Endpoint:**
  - Keep existing behavior when no query params provided
  - Add new query params as optional
  - No breaking changes to response structure

- **Overview Analytics:**
  - Keep `year` parameter working
  - If `year` provided, use it; if `startDate`/`endDate` provided, use those
  - If both provided, prefer `startDate`/`endDate`

### 5.2 Frontend Compatibility
- Keep all existing function signatures
- Add filter parameter as optional (defaults to empty object)
- Existing calls without filters continue to work

---

## 6. Breaking Changes Assessment

**No Breaking Changes Expected:**
- All new parameters are optional
- Existing API calls will continue to work
- Response structure unchanged
- Only adds new capabilities without removing existing ones

---

## 7. Testing Considerations

### 7.1 Backend Tests
- Test event analytics with no filters (existing behavior)
- Test event analytics with `startDate` only
- Test event analytics with `endDate` only
- Test event analytics with both dates
- Test date format validation
- Test invalid date handling

### 7.2 Frontend Tests
- Test filter hook state management
- Test filter component UI
- Test filter application triggers data refetch
- Test filter persistence (localStorage if needed)
- Test error handling when filters are invalid

---

## 8. Naming/Structure Suggestions for Phase B

### 8.1 Export Functions
- Location: `frontend/src/services/analytics.js`
- Function name: `exportAnalyticsData(filters, format)`
- Formats: `'csv' | 'excel' | 'json'`
- Uses same filter object as analytics queries

### 8.2 Chart Data Transformation
- Location: `frontend/src/utils/analyticsUtils.js` (already exists)
- Functions:
  - `transformEventStatsForChart(analyticsData)`
  - `transformGiftDistributionForChart(analyticsData, filters)`
  - `transformTimelineForChart(analyticsData, filters)`

### 8.3 Activity Feed Integration
- Location: `frontend/src/services/activity.js` (new or extend existing)
- Function: `getActivityFeed(filters)`
- Uses same filter contract for consistency

---

## 9. File Change Summary

### Backend (4 files)
1. `backend/routes/analytics.js` - Add missing route, document params
2. `backend/controllers/analyticsController.js` - Add filter support to 3 functions
3. `backend/controllers/eventController.js` - Add date filtering to `getEventAnalytics`
4. (No changes needed to routes/events.js - route exists)

### Frontend (5 files + 2 new)
1. `frontend/src/services/analytics.js` - Standardize all 7 functions
2. **NEW:** `frontend/src/hooks/useAnalyticsFilters.js` - Filter state hook
3. **NEW:** `frontend/src/components/analytics/AnalyticsFilters.jsx` - Filter UI component
4. `frontend/src/components/analytics/ComprehensiveAnalytics.jsx` - Integrate filters
5. `frontend/src/components/dashboard/AdvancedDashboardTabs/EventAnalytics.jsx` - Integrate filters
6. `frontend/src/pages/Dashboard/AdvancedDashboard.jsx` - Integrate filters (if needed)
7. `frontend/src/utils/analyticsUtils.js` - Review for date utilities (may need updates)

---

## 10. Implementation Checklist

### Backend
- [ ] Update `eventController.getEventAnalytics()` to accept `startDate`/`endDate`
- [ ] Apply date filtering to all aggregation pipelines in `getEventAnalytics`
- [ ] Update `analyticsController.getOverviewAnalytics()` to accept `eventId`, `startDate`/`endDate`
- [ ] Maintain backward compatibility with `year` parameter
- [ ] Update `analyticsController.getGiftTypeAnalytics()` to accept `eventId`
- [ ] Add validation for date formats
- [ ] Test all endpoints with new filters

### Frontend
- [ ] Create `useAnalyticsFilters` hook
- [ ] Create `AnalyticsFilters` component
- [ ] Update all functions in `analytics.js` to use standard filter format
- [ ] Integrate filters into `ComprehensiveAnalytics`
- [ ] Integrate filters into `EventAnalytics`
- [ ] Add loading states during filter changes
- [ ] Add error handling
- [ ] Test filter state management
- [ ] Test filter application

---

## 11. Example Code Structure (For Reference)

### Filter Hook Structure
```javascript
// frontend/src/hooks/useAnalyticsFilters.js
export const useAnalyticsFilters = (initialEventId = null) => {
  const [eventId, setEventId] = useState(initialEventId);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const filters = {
    eventId,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString()
  };

  const updateFilter = (key, value) => { /* ... */ };
  const resetFilters = () => { /* ... */ };
  const isValid = () => { /* ... */ };

  return { filters, updateFilter, resetFilters, isValid, ... };
};
```

### Backend Filter Parsing
```javascript
// backend/controllers/eventController.js - getEventAnalytics
const { startDate, endDate } = req.query;

const dateFilter = {};
if (startDate) dateFilter.$gte = new Date(startDate);
if (endDate) dateFilter.$lte = new Date(endDate);

// Apply to aggregation pipelines
if (Object.keys(dateFilter).length > 0) {
  pipeline.unshift({ $match: { createdAt: dateFilter } });
}
```

---

## 12. Notes for Tomorrow's Implementation

1. **Start with backend** - Get filtering working first, then update frontend
2. **Test incrementally** - Update one endpoint at a time, test before moving on
3. **Keep it simple** - Don't over-engineer; basic date filtering is the goal
4. **Document as you go** - Add JSDoc comments for new parameters
5. **Verify backward compatibility** - Test existing API calls still work

---

**End of Phase A Plan**  
Ready for implementation tomorrow! 🚀

