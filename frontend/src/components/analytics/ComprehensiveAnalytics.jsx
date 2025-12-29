import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { getAllEventAnalytics } from '../../services/analytics';
import AnalyticsFilters from './AnalyticsFilters';

const ComprehensiveAnalytics = ({ eventId: propEventId }) => {
  const { eventId: paramEventId } = useParams();
  const eventId = propEventId || paramEventId;
  const theme = useTheme();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({});
  const prevFiltersRef = useRef(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!eventId) return;
      
      // Compare filters to previous to prevent unnecessary fetches
      const filtersString = JSON.stringify(filters);
      const prevFiltersString = prevFiltersRef.current ? JSON.stringify(prevFiltersRef.current) : null;
      
      // Skip fetch if filters haven't actually changed (but always fetch on initial load)
      if (prevFiltersRef.current !== null && filtersString === prevFiltersString) {
        return;
      }

      prevFiltersRef.current = filters;
      
      setLoading(true);
      setError('');
      
      try {
        const data = await getAllEventAnalytics(eventId, filters);
        setAnalytics(data);
      } catch (err) {
        console.error('Error fetching comprehensive analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [eventId, filters]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !analytics) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error || 'No analytics data available'}</Alert>
      </Box>
    );
  }

  const { eventStats, giftSummary, inventorySummary, topGifts, categoryTotals, checkInTimeline } = analytics;

  // Prepare data for charts
  const categoryData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  const timelineData = checkInTimeline.map(item => ({
    date: item._id.date,
    checkIns: item.checkIns,
    giftsDistributed: item.giftsDistributed
  }));

  const pieColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
        Comprehensive Analytics Dashboard
      </Typography>

      {/* Analytics Filters */}
      <AnalyticsFilters
        initialEventId={eventId}
        showEventSelector={false}
        onFiltersChange={setFilters}
        autoApply={true}
        variant="full"
      />
      
      {/* Event Statistics */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {eventStats.totalGuests}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Total Guests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main' }}>
                {eventStats.checkedInGuests}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Checked In
              </Typography>
              <Chip 
                label={`${eventStats.checkInPercentage}%`} 
                color="success" 
                size="small" 
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {giftSummary.totalGiftsDistributed}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Gifts Distributed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'info.main' }}>
                {giftSummary.averageGiftsPerGuest}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Avg per Guest
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Top Gifts Bar Chart */}
        <Grid xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Top Distributed Gifts
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topGifts}>
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => [`Quantity: ${value}`]} />
                  <Bar 
                    dataKey="totalQuantity" 
                    fill={theme.palette.primary.main}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Gift Categories Pie Chart */}
        <Grid xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Gift Distribution by Category
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {categoryData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Check-in Timeline */}
        <Grid xs={12}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Check-in Timeline (Last 7 Days)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="checkIns" 
                    stroke={theme.palette.primary.main} 
                    strokeWidth={3}
                    name="Check-ins"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="giftsDistributed" 
                    stroke={theme.palette.success.main} 
                    strokeWidth={3}
                    name="Gifts Distributed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Tables */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Top Gifts Table */}
        <Grid xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Top Performing Gifts
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Gift</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Guests</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topGifts.slice(0, 5).map((gift, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{gift.name}</TableCell>
                        <TableCell align="right">{gift.totalQuantity}</TableCell>
                        <TableCell align="right">{gift.uniqueGuestCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Inventory Summary */}
        <Grid xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Inventory Summary
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Total Items:</Typography>
                  <Typography fontWeight={600}>{inventorySummary.totalInventoryItems}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Utilization Rate:</Typography>
                  <Typography fontWeight={600}>{inventorySummary.averageUtilizationRate}%</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Low Stock Items:</Typography>
                  <Typography fontWeight={600} color="warning.main">
                    {inventorySummary.lowStockItems}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ComprehensiveAnalytics; 