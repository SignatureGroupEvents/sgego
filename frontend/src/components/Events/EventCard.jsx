import React from 'react';
import { Card, CardContent, Typography, Box, Chip, IconButton } from '@mui/material';
import { Event as EventIcon, CalendarToday as CalendarIcon, Business as BusinessIcon } from '@mui/icons-material';

const EventCard = ({ event, onClick, selected }) => {
  return (
    <Card 
      sx={{ 
        borderRadius: 3, 
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4
        },
        ...(selected && {
          border: 2,
          borderColor: 'primary.main',
          backgroundColor: 'primary.light'
        })
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <EventIcon color="primary" sx={{ mt: 0.5 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {event.eventName}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <BusinessIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {event.eventContractNumber}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CalendarIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {new Date(event.eventStart).toLocaleDateString()}
                {event.eventEnd && event.eventEnd !== event.eventStart && 
                  ` - ${new Date(event.eventEnd).toLocaleDateString()}`
                }
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={event.isMainEvent ? 'Main Event' : 'Secondary Event'} 
                size="small" 
                color={event.isMainEvent ? 'primary' : 'secondary'}
                sx={{ borderRadius: 1 }}
              />
              <Chip 
                label={event.status || 'Active'} 
                size="small" 
                color={event.status === 'Completed' ? 'success' : 'default'}
                sx={{ borderRadius: 1 }}
              />
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default EventCard; 