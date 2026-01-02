import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Alert
} from '@mui/material';
import { FilterList as FilterIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useAnalyticsFilters } from '../../hooks/useAnalyticsFilters';
import { getEvents } from '../../services/events';

/**
 * Reusable analytics filter component
 * 
 * @param {Object} props
 * @param {string|null} props.initialEventId - Initial event ID (if filtering by specific event)
 * @param {boolean} props.showEventSelector - Whether to show event selector (default: true for overview pages)
 * @param {Function} props.onFiltersChange - Callback when filters are applied (receives filters object)
 * @param {boolean} props.autoApply - If true, applies filters automatically on change (default: false)
 * @param {string} props.variant - Display variant ('compact' | 'full', default: 'full')
 */
const AnalyticsFilters = ({
  initialEventId = null,
  showEventSelector = true,
  onFiltersChange,
  autoApply = false,
  variant = 'full'
}) => {
  const {
    filters,
    eventId,
    startDate,
    endDate,
    setEventId,
    setStartDate,
    setEndDate,
    resetFilters,
    isValid
  } = useAnalyticsFilters(initialEventId);

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [validationError, setValidationError] = useState('');
  const prevFiltersRef = useRef(null); // Start as null to detect first render
  const timeoutRef = useRef(null);
  const isFirstRender = useRef(true); // Track if this is the first render

  // Fetch events for selector (only if showEventSelector is true)
  useEffect(() => {
    if (showEventSelector) {
      const fetchEvents = async () => {
        try {
          setLoadingEvents(true);
          const response = await getEvents('active');
          const eventsData = response.events || response || [];
          setEvents(eventsData);
        } catch (error) {
          console.error('Error fetching events:', error);
        } finally {
          setLoadingEvents(false);
        }
      };
      fetchEvents();
    }
  }, [showEventSelector]);

  // Validate filters and show error if invalid
  useEffect(() => {
    if (!isValid()) {
      if (startDate && endDate && startDate > endDate) {
        setValidationError('Start date must be before end date');
      } else {
        setValidationError('Please check your date selections');
      }
    } else {
      setValidationError('');
    }
  }, [startDate, endDate, isValid]);

  // Auto-apply filters if enabled (with debounce to allow time to select both dates)
  useEffect(() => {
    if (autoApply && onFiltersChange) {
      // Create a clean filters object without eventId if showEventSelector is false
      // (eventId is only needed for overview analytics, not event-specific analytics)
      const cleanFilters = { ...filters };
      if (!showEventSelector && cleanFilters.eventId) {
        delete cleanFilters.eventId;
      }
      
      // Normalize filters for comparison (normalize dates to ISO strings for consistent comparison)
      const normalizeFilters = (f) => {
        const normalized = {};
        if (f.startDate) {
          // Normalize date to ISO string (date only, no time) for consistent comparison
          const startDate = f.startDate instanceof Date ? f.startDate : new Date(f.startDate);
          normalized.startDate = startDate.toISOString().split('T')[0];
        }
        if (f.endDate) {
          // Normalize date to ISO string (date only, no time) for consistent comparison
          const endDate = f.endDate instanceof Date ? f.endDate : new Date(f.endDate);
          normalized.endDate = endDate.toISOString().split('T')[0];
        }
        if (f.eventId) normalized.eventId = f.eventId;
        return normalized;
      };
      
      const normalizedCurrent = normalizeFilters(cleanFilters);
      const normalizedPrev = prevFiltersRef.current ? normalizeFilters(prevFiltersRef.current) : {};
      
      const currentString = JSON.stringify(normalizedCurrent);
      const prevString = JSON.stringify(normalizedPrev);
      
      // On first render, just initialize prevFiltersRef and skip triggering onFiltersChange
      // Only trigger when user actually changes dates (not on initial mount)
      if (isFirstRender.current) {
        console.log('🚀 AnalyticsFilters: First render, initializing prevFiltersRef:', normalizedCurrent);
        prevFiltersRef.current = JSON.parse(JSON.stringify(normalizedCurrent));
        isFirstRender.current = false;
        return; // Don't trigger onFiltersChange on first render
      }
      
      // Only trigger if there are actual date filters (startDate or endDate)
      // Don't trigger if filters are empty or only contain eventId
      const hasDateFilters = normalizedCurrent.startDate || normalizedCurrent.endDate;
      const hadDateFilters = normalizedPrev.startDate || normalizedPrev.endDate;
      
      // If no date filters now and no date filters before, skip
      if (!hasDateFilters && !hadDateFilters && Object.keys(normalizedCurrent).length === 0 && Object.keys(normalizedPrev).length === 0) {
        console.log('⏭️ AnalyticsFilters: No date filters and filters are empty, skipping');
        return;
      }
      
      // Only call onFiltersChange if filters actually changed
      if (currentString !== prevString) {
        console.log('🔄 AnalyticsFilters: Filters changed, scheduling onFiltersChange:', normalizedCurrent);
        console.log('   Previous filters:', normalizedPrev);
        console.log('   Previous filters string:', prevString);
        console.log('   Current filters string:', currentString);
        
        // Clear any existing timeout
        if (timeoutRef.current) {
          console.log('🧹 AnalyticsFilters: Clearing existing timeout');
          clearTimeout(timeoutRef.current);
        }
        
        // Store the pending filters immediately so rapid changes don't all compare against the same prev value
        // We'll update prevFiltersRef.current in the timeout callback after actually calling onFiltersChange
        const pendingFilters = JSON.parse(JSON.stringify(normalizedCurrent));
        
        // Debounce: Wait 500ms before applying filters to give user time to select both dates
        timeoutRef.current = setTimeout(() => {
          console.log('⏰ AnalyticsFilters: Debounce complete, calling onFiltersChange:', normalizedCurrent);
          // Update prevFiltersRef AFTER we're about to call onFiltersChange
          // This ensures that if the component re-renders before the timeout, we still have the correct prev value
          prevFiltersRef.current = pendingFilters;
          // Call with the original cleanFilters (not normalized) to preserve Date objects if needed
          onFiltersChange(cleanFilters);
          timeoutRef.current = null;
        }, 500);
        
        // Cleanup timeout if filters change again before timeout completes
        return () => {
          if (timeoutRef.current) {
            console.log('🧹 AnalyticsFilters: Cleaning up timeout (filters changed again)');
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        };
      } else {
        console.log('⏭️ AnalyticsFilters: Filters unchanged, skipping onFiltersChange');
      }
    }
  }, [filters, autoApply, onFiltersChange, showEventSelector]);

  const handleApply = () => {
    if (!isValid()) {
      setValidationError('Please fix the filter errors before applying');
      return;
    }
    setValidationError('');
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
  };

  const handleClear = () => {
    resetFilters();
    setValidationError('');
    if (onFiltersChange) {
      // Call with empty filters
      onFiltersChange({});
    }
  };

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    if (!date) return '';
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return date;
  };

  // Handle date input change
  const handleDateChange = (field, value) => {
    if (!value) {
      if (field === 'startDate') setStartDate(null);
      if (field === 'endDate') setEndDate(null);
      return;
    }
    const date = new Date(value);
    if (field === 'startDate') setStartDate(date);
    if (field === 'endDate') setEndDate(date);
  };

  const isCompact = variant === 'compact';

  return (
    <Paper
      elevation={1}
      sx={{
        p: isCompact ? 2 : 3,
        mb: 3,
        bgcolor: 'background.paper'
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <FilterIcon color="primary" />
        <Typography variant="h6" component="h2">
          Filters
        </Typography>
      </Box>

      {validationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationError}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Event Selector */}
        {showEventSelector && (
          <Grid size={{ xs: 12, md: isCompact ? 12 : 4 }}>
            <FormControl fullWidth size={isCompact ? 'small' : 'medium'}>
              <InputLabel id="event-select-label">Event</InputLabel>
              <Select
                labelId="event-select-label"
                label="Event"
                value={eventId || ''}
                onChange={(e) => setEventId(e.target.value || null)}
                disabled={loadingEvents}
              >
                <MenuItem value="">
                  <em>All Events</em>
                </MenuItem>
                {events.map((event) => (
                  <MenuItem key={event._id} value={event._id}>
                    {event.eventName}
                    {event.eventContractNumber && (
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        ({event.eventContractNumber})
                      </Typography>
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        {/* Start Date */}
        <Grid size={{ xs: 12, md: isCompact ? 6 : showEventSelector ? 4 : 6 }}>
          <TextField
            fullWidth
            label="Start Date"
            type="date"
            value={formatDateForInput(startDate)}
            onChange={(e) => handleDateChange('startDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            size={isCompact ? 'small' : 'medium'}
          />
        </Grid>

        {/* End Date */}
        <Grid size={{ xs: 12, md: isCompact ? 6 : showEventSelector ? 4 : 6 }}>
          <TextField
            fullWidth
            label="End Date"
            type="date"
            value={formatDateForInput(endDate)}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            size={isCompact ? 'small' : 'medium'}
            inputProps={{
              min: startDate ? formatDateForInput(startDate) : undefined
            }}
          />
        </Grid>

        {/* Action Buttons */}
        {!autoApply && (
          <Grid size={{ xs: 12, md: isCompact ? 12 : showEventSelector ? 12 : 12 }}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleClear}
                size={isCompact ? 'small' : 'medium'}
              >
                Clear
              </Button>
              <Button
                variant="contained"
                startIcon={<FilterIcon />}
                onClick={handleApply}
                disabled={!isValid()}
                size={isCompact ? 'small' : 'medium'}
              >
                Apply Filters
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default AnalyticsFilters;
