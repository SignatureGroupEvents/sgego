import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { getEventGiftAnalytics } from '../../services/analytics';
import { calculateTopGiftsFromGuests } from '../../utils/analyticsUtils';
import { io } from 'socket.io-client';

const BasicAnalytics = ({ event = {}, guests = [], inventory = [] }) => {
  const theme = useTheme();
  const totalGuests = guests.length;
  const checkedInGuests = guests.filter(g => g.hasCheckedIn).length;
  
  const [giftAnalytics, setGiftAnalytics] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const socketRef = useRef(null);

  // Fetch real gift analytics data
  const fetchGiftAnalytics = async () => {
    if (!event?._id) return;
    
    setAnalyticsLoading(true);
    setAnalyticsError('');
    
    try {
      const response = await getEventGiftAnalytics(event._id);
      // Extract top 5 most distributed gifts from the response
      const topGifts = response.giftSelections || response.topGifts || [];
      setGiftAnalytics(topGifts.slice(0, 5));
    } catch (error) {
      console.error('Error fetching gift analytics:', error);
      setAnalyticsError('Failed to load gift analytics');
      const fallbackData = calculateTopGiftsFromGuests(guests);
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
        fetchGiftAnalytics();
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
    fetchGiftAnalytics();

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
        <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 600 }}>
          CHECKED IN
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
            Top 5 by distribution
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
              <Tooltip formatter={(value) => [`Distributed: ${value}`]} />
              <Bar 
                dataKey="count" 
                fill={theme.palette.primary.main}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              letterSpacing: 1,
              cursor: 'pointer',
              color: theme.palette.primary.main,
              '&:hover': { color: theme.palette.info.main }
            }}
            onClick={() =>
              window.location.href = `/events/${event?._id || 'demo'}/dashboard/advanced`
            }
          >
            ADVANCED
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default BasicAnalytics;
