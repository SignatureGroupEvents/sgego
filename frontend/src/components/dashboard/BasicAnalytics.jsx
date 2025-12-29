import React from 'react';
import {
  Box,
  Paper,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import GiftAnalyticsPreview from './GiftAnalyticsPreview';

/**
 * BasicAnalytics - Main dashboard analytics component
 * 
 * Displays:
 * - Total Attendance card (left)
 * - Gift Distribution preview (right)
 * 
 * Note: GiftAnalyticsPreview handles its own data fetching and state management
 * for better separation of concerns and reusability.
 */
const BasicAnalytics = ({ event = {}, guests = [], inventory = [] }) => {
  const theme = useTheme();
  const totalGuests = guests.length;
  
  // Use eventCheckins as source of truth for attendance
  const checkedInGuests = guests.filter(g => 
    g.eventCheckins && g.eventCheckins.length > 0 && 
    g.eventCheckins.some(ec => ec.checkedIn === true)
  ).length;
  const pendingGuests = totalGuests - checkedInGuests;
  const checkInPercentage = totalGuests > 0 ? Math.round((checkedInGuests / totalGuests) * 100) : 0;

  return (
    <Box sx={{ 
      width: '100%', 
      py: 1, 
      px: 0,
      backgroundColor: theme.palette.background.default,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 3,
      alignItems: 'stretch',
      minHeight: 350
    }}>
      {/* Attendance Card */}
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: 3,
          minHeight: 260,
          minWidth: 300,
          flex: '0 1 320px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" sx={{ color: theme.palette.text.secondary, fontWeight: 700, mb: 2 }}>
          TOTAL ATTENDANCE:
        </Typography>
        <Typography variant="h2" sx={{ fontWeight: 700, mb: 1 }}>
          {checkedInGuests} / {totalGuests}
        </Typography>
        <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 600, mb: 1 }}>
          {checkInPercentage}% Checked In
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {pendingGuests} guests pending
        </Typography>
        {/* Advanced Analytics Button - now grouped below stats */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', width: '100%' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 4,
              py: 2,
              borderRadius: 3,
              cursor: 'pointer',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: 'white',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: 0.5,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              },
              '&:active': {
                transform: 'translateY(0)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }
            }}
            onClick={() =>
              window.location.href = `/events/${event?._id || 'demo'}/dashboard/advanced`
            }
          >
           Advanced Analytics →
          </Box>
        </Box>
      </Paper>

      {/* Gift Analytics Preview */}
      <GiftAnalyticsPreview event={event} inventory={inventory} />
    </Box>
  );
};

export default BasicAnalytics;
