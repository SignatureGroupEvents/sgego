import React, { useState, useEffect } from 'react';
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

  // Auto-apply filters if enabled
  useEffect(() => {
    if (autoApply && isValid() && onFiltersChange) {
      onFiltersChange(filters);
    }
  }, [filters, autoApply, isValid, onFiltersChange]);

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
          <Grid item xs={12} md={isCompact ? 12 : 4}>
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
        <Grid item xs={12} md={isCompact ? 6 : showEventSelector ? 4 : 6}>
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
        <Grid item xs={12} md={isCompact ? 6 : showEventSelector ? 4 : 6}>
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
          <Grid item xs={12} md={isCompact ? 12 : showEventSelector ? 12 : 12}>
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
