import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { getEventGiftAnalytics, getAllEventAnalytics } from '../../services/analytics';
import { calculateTopGiftsFromGuests } from '../../utils/analyticsUtils';
import { io } from 'socket.io-client';

const BasicAnalytics = ({ event = {}, guests = [], inventory = [] }) => {
  const theme = useTheme();
  const totalGuests = guests.length;
  const checkedInGuests = guests.filter(g => g.hasCheckedIn).length;
  const pendingGuests = totalGuests - checkedInGuests;
  const checkInPercentage = totalGuests > 0 ? Math.round((checkedInGuests / totalGuests) * 100) : 0;
  
  const [giftAnalytics, setGiftAnalytics] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const socketRef = useRef(null);

  // Create inventory lookup map for resolving inventoryId to gift names
  const inventoryMap = React.useMemo(() => {
    return inventory.reduce((acc, item) => {
      acc[item._id] = item;
      return acc;
    }, {});
  }, [inventory]);

  // Helper function to resolve inventoryId to display name
  const resolveGiftName = (inventoryId) => {
    const item = inventoryMap[inventoryId];
    if (item) {
      return `${item.style} ${item.size ? `(${item.size})` : ''}`.trim();
    }
    return `Unknown Gift (${inventoryId})`;
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    if (!event?._id) return;
    
    setAnalyticsLoading(true);
    setAnalyticsError('');
    
    try {
      const response = await getAllEventAnalytics(event._id);
      
      // Handle different response structures from analytics endpoint
      let topGifts = [];
      
      if (response.topGifts) {
        // Use the new topGifts array from enhanced analytics
        topGifts = response.topGifts.slice(0, 5);
      } else if (response.giftDistribution) {
        // Convert giftDistribution object to array format for chart
        topGifts = Object.entries(response.giftDistribution)
          .map(([key, data]) => ({
            name: data.style ? `${data.style} ${data.size ? `(${data.size})` : ''}`.trim() : key,
            count: data.totalQuantity || 0,
            inventoryId: data.inventoryId
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      }
      
      setGiftAnalytics(topGifts);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalyticsError('Failed to load analytics data');
      
      // Enhanced fallback that resolves inventoryId to names
      const fallbackData = calculateTopGiftsFromGuests(guests, inventoryMap);
      setGiftAnalytics(fallbackData);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // WebSocket setup for real-time updates
  useEffect(() => {
    if (!event?._id) return;

    // Initialize socket connection
    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // Join event-specific room
    socket.emit('join-event', event._id);

    // Listen for analytics updates
    socket.on('analytics:update', (data) => {
      console.log('📊 Received analytics update:', data);
      if (data.eventId === event._id) {
        // Re-fetch analytics data when update is received
        fetchAnalytics();
      }
    });

    // Handle connection events
    socket.on('connect', () => {
      console.log('🔌 Connected to analytics WebSocket');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from analytics WebSocket');
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
    });

    // Initial fetch
    fetchAnalytics();

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-event', event._id);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [event?._id]);

  return (
    <Box sx={{ 
      width: '100%', 
      py: 4, 
      px: 3,
      backgroundColor: theme.palette.background.default,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 3
    }}>
      {/* Header with refresh button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, width: '100%' }}>
        <Typography variant="body2" color="text.secondary">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Typography>
        <Tooltip title="Refresh Analytics">
          <IconButton 
            onClick={fetchAnalytics} 
            disabled={analyticsLoading}
            sx={{ 
              bgcolor: 'primary.main', 
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Attendance Card */}
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: 3,
          height: '220px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          flex: '0 1 30%',
          minWidth: '300px'
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
      </Paper>

              {/* Gift Distribution Bar Chart */}
        <Paper
          elevation={3}
          sx={{
            p: 3,
            borderRadius: 3,
            height: '220px',
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 65%',
            minWidth: '400px'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Top Distributed Gifts
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              Top 5 by distribution count
            </Typography>
          </Box>
          
          {analyticsLoading ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: 140 
            }}>
              <CircularProgress size={40} />
            </Box>
          ) : analyticsError ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: 140 
            }}>
              <Alert severity="warning" sx={{ fontSize: '0.8rem' }}>
                {analyticsError}
              </Alert>
            </Box>
          ) : giftAnalytics.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: 140 
            }}>
              <Typography variant="body2" color="text.secondary">
                No gift distribution data available
              </Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={giftAnalytics}>
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  fontSize={12}
                />
                <YAxis />
                <RechartsTooltip formatter={(value) => [`Distributed: ${value}`]} />
                <Bar 
                  dataKey="count" 
                  fill={theme.palette.primary.main}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Paper>

        {/* View Advanced Analytics Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mt: 2 }}>
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
            View Advanced Analytics →
          </Box>
        </Box>
    </Box>
  );
};

export default BasicAnalytics;
