import React from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Card, CardContent, IconButton, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Edit as EditIcon, Dashboard as DashboardIcon, Event as EventIcon } from '@mui/icons-material';

const EventHeader = ({ event, mainEvent, secondaryEvents = [], showDropdown = false }) => {
  const navigate = useNavigate();
  if (!event || !mainEvent) return null;

  const isMainEvent = event.isMainEvent;
  const hasSecondaryEvents = secondaryEvents.length > 0;

  return (
    <Box mb={4}>
      {/* Event Information Container */}
      <Card 
        sx={{ 
          mb: 3,
          background: isMainEvent 
            ? 'linear-gradient(135deg,rgb(227, 252, 253) 0%,rgb(240, 249, 249) 100%)' 
            : 'linear-gradient(135deg,rgb(245, 240, 232) 0%,rgb(248, 243, 233) 100%)',
          border: isMainEvent ? '2px solid #00B2C0' : '2px solid #FAA951',
          borderRadius: 3,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isMainEvent ? (
                <DashboardIcon sx={{ color: '#00B2C0', fontSize: 32 }} />
              ) : (
                <EventIcon sx={{ color: '#FAA951', fontSize: 32 }} />
              )}
              <Box>
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {event.eventName || 'Event'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip 
                    label={isMainEvent ? 'Program Dashboard' : 'Check-in Event'} 
                    size="small" 
                    color={isMainEvent ? 'primary' : 'success'}
                    sx={{ fontWeight: 600 }}
                  />
                  {isMainEvent && hasSecondaryEvents && (
                    <Chip 
                      label={`${secondaryEvents.length} Check-in Event${secondaryEvents.length > 1 ? 's' : ''}`} 
                      size="small" 
                      variant="outlined"
                      color="primary"
                    />
                  )}
                </Box>
              </Box>
            </Box>
            <IconButton 
              onClick={() => navigate(`/events/${event._id}/edit`)}
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.8)', 
                '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
              }}
            >
              <EditIcon />
            </IconButton>
          </Box>
          
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
            Contract: {event.eventContractNumber || '—'}
          </Typography>
          
          {isMainEvent && hasSecondaryEvents && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
              This is the main program dashboard. Guests check in to the individual events below.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Event Navigation Dropdown */}
      {showDropdown && (
        <Box sx={{ 
          p: 2, 
          bgcolor: 'grey.50', 
          borderRadius: 2, 
          border: '1px solid #e0e0e0'
        }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
            Switch Between Events:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="secondary-event-label">Select Event</InputLabel>
            <Select
              labelId="secondary-event-label"
              label="Select Event"
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DashboardIcon sx={{ fontSize: 16, color: '#00B2C0' }} />
                    <Typography>{mainEvent?.eventName}</Typography>
                    <Chip label="Dashboard" size="small" color="primary" sx={{ ml: 'auto' }} />
                  </Box>
                </MenuItem>
              )}
              {secondaryEvents.map(ev => (
                <MenuItem key={ev?._id} value={ev?._id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EventIcon sx={{ fontSize: 16, color: '#FAA951' }} />
                    <Typography>{ev?.eventName}</Typography>
                    <Chip label="Check-in" size="small" color="success" sx={{ ml: 'auto' }} />
                  </Box>
                </MenuItem>
              ))}
              {/* If current event is not in the above, add it */}
              {event && mainEvent && event._id !== mainEvent._id && !secondaryEvents.some(ev => ev._id === event._id) && (
                <MenuItem key={event._id} value={event._id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EventIcon sx={{ fontSize: 16, color: '#FAA951' }} />
                    <Typography>{event.eventName}</Typography>
                    <Chip label="Check-in" size="small" color="success" sx={{ ml: 'auto' }} />
                  </Box>
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