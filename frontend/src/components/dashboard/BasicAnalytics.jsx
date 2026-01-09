import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Collapse,
  IconButton,
  useMediaQuery
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileExpanded, setMobileExpanded] = useState(false);
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
        {/* Advanced Analytics Button - now grouped below stats */}
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
      </Paper>

      {/* Gift Analytics Preview - Collapsible on mobile */}
      <Box sx={{ width: '100%', flex: { xs: '1 1 100%', sm: '1 1 500px' } }}>
        {/* Collapsible Header - Only visible on mobile */}
        {isMobile && (
          <Paper
            elevation={2}
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              mb: { xs: 0.5, sm: 1 },
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              backgroundColor: theme.palette.background.paper,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              }
            }}
            onClick={() => setMobileExpanded(!mobileExpanded)}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Gift Distribution
            </Typography>
            <IconButton size="small">
              {mobileExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Paper>
        )}
        
        {/* Gift Analytics Preview - Always visible on desktop, collapsible on mobile */}
        <Collapse in={!isMobile || mobileExpanded} timeout="auto" unmountOnExit={false}>
          <GiftAnalyticsPreview event={event} inventory={inventory} />
        </Collapse>
      </Box>
    </Box>
  );
};

export default BasicAnalytics;
