import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { usePermissions } from '../../hooks/usePermissions';
import CheckInGiftsTimeline from './CheckInGiftsTimeline';

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
const BasicAnalytics = ({ event = {}, guests = [], inventory = [], isPortalView = false, onShowAdvanced }) => {
  const theme = useTheme();
  const { canAccessAnalyticsFull } = usePermissions();
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
      py: { xs: 0.5, sm: 1 },
      px: { xs: 0, sm: 0 },
      backgroundColor: theme.palette.background.default,
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      flexWrap: 'wrap',
      gap: { xs: 1, sm: 3 },
      alignItems: 'stretch',
      minHeight: { xs: 'auto', sm: 350 }
    }}>
      {/* Attendance Card */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 4 },
          borderRadius: 3,
          minHeight: { xs: 'auto', sm: 260 },
          width: { xs: '100%', sm: 'auto' },
          minWidth: { xs: 'unset', sm: 300 },
          flex: { xs: '1 1 100%', sm: '0 1 320px' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            color: theme.palette.text.secondary, 
            fontWeight: 700, 
            mb: { xs: 1, sm: 2 },
            fontSize: { xs: '1rem', sm: '1.25rem' }
          }}
        >
          TOTAL ATTENDANCE:
        </Typography>
        <Typography 
          variant="h2" 
          sx={{ 
            fontWeight: 700, 
            mb: { xs: 0.5, sm: 1 },
            fontSize: { xs: '2rem', sm: '3rem' }
          }}
        >
          {checkedInGuests} / {totalGuests}
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'success.main', 
            fontWeight: 600, 
            mb: { xs: 0.5, sm: 1 },
            fontSize: { xs: '1rem', sm: '1.25rem' }
          }}
        >
          {checkInPercentage}% Checked In
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ fontSize: { xs: '0.875rem', sm: '0.875rem' } }}
        >
          {pendingGuests} guests pending
        </Typography>
        {/* Portal: "View detailed analytics" stays in portal. Ops: "Advanced Analytics" links to full dashboard. */}
        {isPortalView && onShowAdvanced && (
          <Box sx={{ mt: { xs: 1, sm: 2 }, display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: { xs: 2, sm: 4 },
                py: { xs: 1, sm: 2 },
                borderRadius: 3,
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                fontWeight: 700,
                fontSize: { xs: '0.875rem', sm: '1rem' },
                letterSpacing: 0.5,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease',
                width: { xs: '100%', sm: 'auto' },
                justifyContent: 'center',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                },
                '&:active': { transform: 'translateY(0)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }
              }}
              onClick={onShowAdvanced}
            >
              View detailed analytics →
            </Box>
          </Box>
        )}
        {!isPortalView && canAccessAnalyticsFull && (
          <Box sx={{ mt: { xs: 1, sm: 2 }, display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: { xs: 2, sm: 4 },
                py: { xs: 1, sm: 2 },
                borderRadius: 3,
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                fontWeight: 700,
                fontSize: { xs: '0.875rem', sm: '1rem' },
                letterSpacing: 0.5,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease',
                width: { xs: '100%', sm: 'auto' },
                justifyContent: 'center',
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
        )}
      </Paper>

      {/* Check-in & Gifts Timeline - in place of Gift Distribution card (compact, responsive) */}
      {event?._id && (
        <Box sx={{ width: '100%', flex: { xs: '1 1 100%', sm: '1 1 500px' }, minWidth: 0 }}>
          <Paper
            elevation={2}
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              height: '100%',
              minHeight: { xs: 'auto', sm: 320 },
              backgroundColor: theme.palette.background.paper,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <CheckInGiftsTimeline
              eventId={event._id}
              isPortalView={isPortalView}
              onShowAdvanced={onShowAdvanced}
              compact
            />
          </Paper>
        </Box>
      )}

    </Box>
  );
};

export default BasicAnalytics;
