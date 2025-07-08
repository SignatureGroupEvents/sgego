import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Chip
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { getAllEventAnalytics } from '../../services/analytics';
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

  // Helper: Get all unique types from inventory
  const allGiftTypes = React.useMemo(() => {
    const types = new Set();
    inventory.forEach(item => {
      if (item.type) types.add(item.type);
    });
    return Array.from(types);
  }, [inventory]);

  // Helper: Count selected by guest for each type
  const selectedByType = React.useMemo(() => {
    const typeCount = {};
    guests.forEach(guest => {
      if (guest.giftSelection) {
        const item = inventory.find(i => i._id === guest.giftSelection);
        if (item && item.type) {
          typeCount[item.type] = (typeCount[item.type] || 0) + 1;
        }
      }
    });
    return typeCount;
  }, [guests, inventory]);

  // Helper: Available by type
  const availableByType = React.useMemo(() => {
    const typeCount = {};
    inventory.forEach(item => {
      if (item.type) {
        typeCount[item.type] = (typeCount[item.type] || 0) + (item.currentInventory || 0);
      }
    });
    return typeCount;
  }, [inventory]);

  // Compose data for bar chart: only selected by type, include all types
  const barChartData = React.useMemo(() => {
    if (allGiftTypes.length === 0) return [];
    return allGiftTypes.map(type => ({
      type,
      selected: selectedByType[type] || 0
    }));
  }, [allGiftTypes, selectedByType]);

  // Calculate not selected guests
  const notSelectedCount = guests.filter(g => !g.giftSelection).length;

  // Fetch analytics data (kept for future, but fallback is inventory)
  const fetchAnalytics = async () => {
    if (!event?._id) return;
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const response = await getAllEventAnalytics(event._id);
      // ... (existing logic, but we now always fallback to inventory for pie chart)
      setLastUpdated(new Date());
    } catch (error) {
      setAnalyticsError('Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // WebSocket setup for real-time updates
  useEffect(() => {
    if (!event?._id) return;
    let socket;
    try {
      socket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 5000
      });
      socketRef.current = socket;
      socket.emit('join-event', event._id);
      socket.on('analytics:update', (data) => {
        if (data.eventId === event._id) {
          fetchAnalytics();
        }
      });
      socket.on('connect_error', (error) => {
        // WebSocket is optional
      });
    } catch (error) {}
    fetchAnalytics();
    return () => {
      if (socketRef.current) {
        try {
          socketRef.current.emit('leave-event', event._id);
          socketRef.current.disconnect();
          socketRef.current = null;
        } catch (error) {}
      }
    };
  }, [event?._id]);

  // Fallback: update last updated time when inventory or guests change
  useEffect(() => {
    setLastUpdated(new Date());
  }, [inventory, guests]);

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

      {/* Gift Types Bar Chart */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 3,
          minHeight: 260,
          minWidth: 400,
          flex: '1 1 500px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, width: '100%' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Gift Types Selected
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Number selected by guests
          </Typography>
        </Box>
        {analyticsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 180 }}>
            <CircularProgress size={40} />
          </Box>
        ) : (allGiftTypes.length === 0) ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 180 }}>
            <Typography variant="body2" color="text.secondary">
              No gift types available
            </Typography>
          </Box>
        ) : (
          <Box sx={{ width: '100%', height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barChartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <XAxis dataKey="type" tick={{ fontSize: 13 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 13 }} />
                <RechartsTooltip formatter={(value, name) => [`${value} selected`, name]} />
                <Bar dataKey="selected" fill={theme.palette.primary.main} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <Box sx={{ width: '100%', mt: 2, display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Chip label={`Not Selected: ${notSelectedCount}`} color="secondary" />
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default BasicAnalytics;
