import React, { useMemo, useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ButtonGroup,
  Button,
  IconButton,
  Grid,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, Tooltip as BarTooltip, ResponsiveContainer as BarResponsiveContainer, Cell as BarCell } from 'recharts';
import { LineChart, Line, CartesianGrid } from 'recharts';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import MuiTooltip from '@mui/material/Tooltip';
import { getAllEventAnalytics } from '../../../services/analytics';

// Centralized fallback label
const UNKNOWN_LABEL = 'Unlabeled';

const EventAnalytics = ({ eventId }) => {
  const theme = useTheme();
  
  // State management
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [hiddenCategories, setHiddenCategories] = useState([]);

  // Debug logging for data validation
  console.log('📊 EventAnalytics Debug:', {
    eventId,
    hasAnalytics: !!analytics,
    loading,
    error
  });

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!eventId) {
        setError('No event ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        console.log('🔄 Fetching event analytics for eventId:', eventId);
        
        const data = await getAllEventAnalytics(eventId);
        setAnalytics(data);
        
        console.log('✅ Event analytics loaded successfully:', {
          eventStats: data.eventStats,
          timelineLength: data.checkInTimeline?.length || 0,
          hasGiftData: !!data.giftSummary
        });
      } catch (err) {
        console.error('❌ Error fetching event analytics:', err);
        setError('Failed to load event analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [eventId]);

  // Use theme palette colors for the charts
  const CHART_COLORS = useMemo(() => [
    theme.palette.primary.main,      // #00B2C0
    theme.palette.secondary.main,    // #31365E
    theme.palette.warning.main,      // #CB1033
    theme.palette.info.main,         // #FAA951
    '#00838F', // dark teal
    '#4DD0E1', // light teal
    '#FFD166', // soft yellow
    '#F67280', // soft red/pink
    '#6C5B7B', // muted purple
    '#355C7D', // blue-grey
    '#B5EAD7', // mint
    '#FFB7B2', // light coral
    '#B2C2FF', // soft blue
    '#F6D186', // pale gold
    '#C06C84', // mauve
    '#F8B195', // light peach
    '#A8E6CF', // light green
    '#D6A4A4', // dusty rose
  ], [theme]);

  // Process check-in timeline data
  const timelineData = useMemo(() => {
    if (!analytics?.checkInTimeline) return [];
    
    const processed = analytics.checkInTimeline.map(item => ({
      date: item._id.date,
      checkIns: item.checkIns,
      giftsDistributed: item.giftsDistributed,
      formattedDate: new Date(item._id.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }));

    console.log('📈 Timeline Data Processing:', {
      totalDays: processed.length,
      totalCheckIns: processed.reduce((sum, item) => sum + item.checkIns, 0),
      totalGifts: processed.reduce((sum, item) => sum + item.giftsDistributed, 0),
      dateRange: processed.length > 0 ? `${processed[0].date} to ${processed[processed.length - 1].date}` : 'No data'
    });

    return processed;
  }, [analytics?.checkInTimeline]);

  // Process guest status data for pie chart
  const guestStatusData = useMemo(() => {
    if (!analytics?.eventStats) return [];
    
    const { totalGuests, checkedInGuests, pendingGuests } = analytics.eventStats;
    
    const data = [
      { name: 'Checked In', value: checkedInGuests, color: theme.palette.success.main },
      { name: 'Pending', value: pendingGuests, color: theme.palette.warning.main }
    ].filter(item => item.value > 0);

    console.log('👥 Guest Status Processing:', {
      totalGuests,
      checkedInGuests,
      pendingGuests,
      checkInRate: analytics.eventStats.checkInPercentage
    });

    return data;
  }, [analytics?.eventStats, theme.palette]);

  // Process daily check-in performance for bar chart
  const dailyPerformanceData = useMemo(() => {
    if (!timelineData.length) return [];
    
    return timelineData
      .map(item => ({
        name: item.formattedDate,
        checkIns: item.checkIns,
        giftsDistributed: item.giftsDistributed
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

  }, [timelineData]);

  // Error handling for missing data
  if (error) {
    return (
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" color="error" gutterBottom>
            ⚠️ Event Analytics Error
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}. Please refresh the page or contact support.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={60} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading Event Analytics...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" color="error" gutterBottom>
            ⚠️ No Analytics Data
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No event analytics data available. This may be because no guests have checked in yet.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const { eventStats } = analytics;

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} mb={1} color="primary.main">
          Event Analytics Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Track guest check-ins, event performance, and attendance patterns
        </Typography>

        {/* Quick Summary Stats */}
        <Box mb={3} p={2} bgcolor="grey.50" borderRadius={2}>
          <Typography variant="subtitle2" fontWeight={600} mb={1} color="primary.main">
            📈 Event Summary
          </Typography>
          <Box display="flex" gap={3} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary">Total Guests</Typography>
              <Typography variant="h6" fontWeight={700}>{eventStats.totalGuests}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Checked In</Typography>
              <Typography variant="h6" fontWeight={700} color="success.main">
                {eventStats.checkedInGuests}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Pending</Typography>
              <Typography variant="h6" fontWeight={700} color="warning.main">
                {eventStats.pendingGuests}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Check-in Rate</Typography>
              <Typography variant="h6" fontWeight={700} color="primary.main">
                {eventStats.checkInPercentage}%
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* SECTION 1: Event Details Table */}
        <Box mb={4}>
          <Typography variant="subtitle1" fontWeight={600} mb={2} color="primary.main">
            📋 Event Details
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Comprehensive overview of event statistics and guest information
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ minWidth: 600, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Event Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Contract Number</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Total Guests</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Checked In</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Pending</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Check-in Rate</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Event Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow hover>
                  <TableCell>{eventStats.eventName || 'N/A'}</TableCell>
                  <TableCell>{eventStats.eventContractNumber || 'N/A'}</TableCell>
                  <TableCell>{eventStats.totalGuests}</TableCell>
                  <TableCell sx={{ color: 'success.main', fontWeight: 600 }}>
                    {eventStats.checkedInGuests}
                  </TableCell>
                  <TableCell sx={{ color: 'warning.main', fontWeight: 600 }}>
                    {eventStats.pendingGuests}
                  </TableCell>
                  <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>
                    {eventStats.checkInPercentage}%
                  </TableCell>
                  <TableCell>
                    {eventStats.isMainEvent ? 'Main Event' : 'Secondary Event'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* SECTION 2: Chart Controls */}
        <Box mb={2} pb={2} display="flex" alignItems="center" justifyContent="space-between">
          <MuiTooltip title="Reset Charts">
            <IconButton
              color="secondary"
              onClick={() => {
                setActiveFilter(null);
                setHiddenCategories([]);
              }}
              aria-label="Reset Charts"
            >
              <RefreshIcon />
            </IconButton>
          </MuiTooltip>
        </Box>

        {/* SECTION 3: Data Visualization Charts */}
        <Box mb={4}>
          
          <Box display="flex" flexDirection={{ xs: 'column', lg: 'row' }} gap={{ xs: 2, lg: 4 }} sx={{ minHeight: 400 }}>
            {/* CHART 1: Daily Check-in Performance Bar Chart */}
            <Box flex={1} minWidth={0}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }} color="primary.main">
                📅 Daily Check-in Performance
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Bar chart showing daily check-in counts over the last 7 days
              </Typography>
              <BarResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={dailyPerformanceData}
                  margin={{ left: 0, right: 10, top: 10, bottom: 10 }}
                >
                  <XAxis 
                    dataKey="name" 
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis domain={[0, 'dataMax']} />
                  <Bar dataKey="checkIns" fill={CHART_COLORS[0]} isAnimationActive={false}>
                    {dailyPerformanceData.map((entry, idx) => (
                      <BarCell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                  <BarTooltip formatter={(value) => [`${value} check-ins`, 'Daily Check-ins']} />
                </BarChart>
              </BarResponsiveContainer>
            </Box>

            {/* Vertical Divider */}
            <Divider
              orientation={{ xs: 'horizontal', lg: 'vertical' }}
              flexItem
              sx={{ 
                mx: { xs: 0, lg: 2 }, 
                my: { xs: 2, lg: 0 }, 
                display: 'block',
                borderColor: 'grey.300',
                borderWidth: '1px'
              }}
            />

            {/* CHART 2: Guest Status Distribution Pie Chart */}
            <Box flex={1} minWidth={0}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }} color="primary.main">
                👥 Guest Status Distribution
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Pie chart showing the breakdown of checked-in vs pending guests
              </Typography>
              
              {guestStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={guestStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      label={({ name, value }) => `${name}: ${value}`}
                      isAnimationActive={false}
                    >
                      {guestStatusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Guests']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: 300,
                  color: 'text.secondary'
                }}>
                  <Typography variant="body2">No guest data available</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* SECTION 4: Check-in Timeline */}
        {timelineData.length > 0 && (
          <Box mb={4}>
            <Typography variant="subtitle1" fontWeight={600} mb={2} color="primary.main">
              📈 Check-in Timeline (Last 7 Days)
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Line chart showing check-in patterns and gift distribution over time
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      value, 
                      name === 'checkIns' ? 'Check-ins' : 'Gifts Distributed'
                    ]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="checkIns" 
                    stroke={CHART_COLORS[0]} 
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS[0], strokeWidth: 2, r: 4 }}
                    name="Check-ins"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="giftsDistributed" 
                    stroke={CHART_COLORS[1]} 
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS[1], strokeWidth: 2, r: 4 }}
                    name="Gifts Distributed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default EventAnalytics; 