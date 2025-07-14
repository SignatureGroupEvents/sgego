import React from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const EventHeader = ({ event, mainEvent, secondaryEvents = [], showDropdown = false }) => {
  const navigate = useNavigate();
  if (!event || !mainEvent) return null;
  return (
    <Box mb={4}>
      <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
        {event.eventName || 'Event'}
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Contract: {event.eventContractNumber || '—'}
      </Typography>
      {showDropdown && (
        <Box mt={3} display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="secondary-event-label">Additional Events</InputLabel>
            <Select
              labelId="secondary-event-label"
              label="Additional Events"
              value={event?._id || ''}
              onChange={e => {
                const selectedId = e.target.value;
                if (selectedId && selectedId !== event?._id) {
                  navigate(`/events/${selectedId}/dashboard`);
                }
              }}
            >
              {mainEvent && (
                <MenuItem key={mainEvent?._id} value={mainEvent?._id}>
                  {mainEvent?.eventName} (Main)
                </MenuItem>
              )}
              {secondaryEvents.map(ev => (
                <MenuItem key={ev?._id} value={ev?._id}>
                  {ev?.eventName}
                </MenuItem>
              ))}
              {/* If current event is not in the above, add it */}
              {event && mainEvent && event._id !== mainEvent._id && !secondaryEvents.some(ev => ev._id === event._id) && (
                <MenuItem key={event._id} value={event._id}>
                  {event.eventName}
                </MenuItem>
              )}
            </Select>
          </FormControl>
        </Box>
      )}
    </Box>
  );
};

export default EventHeader; 