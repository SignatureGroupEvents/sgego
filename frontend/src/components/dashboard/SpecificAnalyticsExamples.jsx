import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { getAllEventAnalytics } from '../../services/analytics';

const SpecificAnalyticsExamples = ({ eventId: propEventId }) => {
  const { eventId: paramEventId } = useParams();
  const eventId = propEventId || paramEventId;
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!eventId) return;
      
      setLoading(true);
      setError('');
      
      try {
        const data = await getAllEventAnalytics(eventId);
        setAnalytics(data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [eventId]);

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

  // Extract specific data points
  const {
    eventStats,
    giftSummary,
    inventorySummary,
    topGifts,
    categoryTotals,
    checkInTimeline
  } = analytics;

  // Get specific metrics
  const topGift = topGifts[0];
  const topCategory = Object.entries(categoryTotals)
    .sort(([,a], [,b]) => b - a)[0];
  
  const today = new Date().toISOString().split('T')[0];
  const todayData = checkInTimeline.find(item => item._id.date === today);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
        Specific Analytics Data Examples
      </Typography>

      {/* Event Statistics - Specific Data Points */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            1. Event Statistics - Specific Data Points
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary">Total Guests</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {eventStats.totalGuests}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary">Checked In</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                {eventStats.checkedInGuests}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary">Pending</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {eventStats.pendingGuests}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary">Check-in Rate</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                {eventStats.checkInPercentage}%
              </Typography>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Event: {eventStats.eventName} ({eventStats.eventContractNumber})
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Gift Analytics - Specific Data Points */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            2. Gift Analytics - Specific Data Points
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="text.secondary">Total Gifts Distributed</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {giftSummary.totalGiftsDistributed}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="text.secondary">Average per Guest</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                {giftSummary.averageGiftsPerGuest}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="text.secondary">Unique Items</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {giftSummary.uniqueItemsDistributed}
              </Typography>
            </Grid>
          </Grid>
          
          {/* Top Gift Details */}
          {topGift && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Top Performing Gift:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">Name</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {topGift.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">Type</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {topGift.type}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">Quantity</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {topGift.totalQuantity}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">Unique Guests</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {topGift.uniqueGuestCount}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Category Breakdown */}
          {topCategory && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Most Popular Category:
              </Typography>
              <Chip 
                label={`${topCategory[0]} (${topCategory[1]} items)`}
                color="primary"
                size="large"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Inventory Analytics - Specific Data Points */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            3. Inventory Analytics - Specific Data Points
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="text.secondary">Total Inventory Items</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {inventorySummary.totalInventoryItems}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="text.secondary">Utilization Rate</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                {inventorySummary.averageUtilizationRate}%
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="text.secondary">Low Stock Items</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {inventorySummary.lowStockItems}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Timeline Analytics - Specific Data Points */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            4. Timeline Analytics - Specific Data Points
          </Typography>
          
          {/* Today's Data */}
          {todayData && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Today's Activity ({today}):
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Check-ins</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {todayData.checkIns}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Gifts Distributed</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
                    {todayData.giftsDistributed}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Last 3 Days Summary */}
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Last 3 Days Summary:
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Check-ins</TableCell>
                    <TableCell align="right">Gifts Distributed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {checkInTimeline.slice(-3).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item._id.date}</TableCell>
                      <TableCell align="right">{item.checkIns}</TableCell>
                      <TableCell align="right">{item.giftsDistributed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Performance Alerts */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            5. Performance Alerts - Based on Specific Data
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Low check-in rate alert */}
            {eventStats.checkInPercentage < 70 && (
              <Alert severity="warning">
                Check-in rate is below 70% ({eventStats.checkInPercentage}%)
              </Alert>
            )}

            {/* Low stock alert */}
            {inventorySummary.lowStockItems > 0 && (
              <Alert severity="error">
                {inventorySummary.lowStockItems} inventory items are low on stock
              </Alert>
            )}

            {/* High utilization alert */}
            {inventorySummary.averageUtilizationRate > 90 && (
              <Alert severity="info">
                Inventory utilization is very high ({inventorySummary.averageUtilizationRate}%)
              </Alert>
            )}

            {/* Good performance alert */}
            {eventStats.checkInPercentage >= 80 && inventorySummary.lowStockItems === 0 && (
              <Alert severity="success">
                Excellent performance! High check-in rate and good inventory levels
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Data Access Examples */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            6. Code Examples - How to Access This Data
          </Typography>
          
          <Box sx={{ backgroundColor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.9rem' }}>
            <Typography variant="body2" gutterBottom>
              {/* Access specific event data */}
              const totalGuests = analytics.eventStats.totalGuests;
              const checkInRate = analytics.eventStats.checkInPercentage;
            </Typography>
            <Typography variant="body2" gutterBottom>
              {/* Access top gift data */}
              const topGift = analytics.topGifts[0];
              const topGiftName = topGift.name;
              const topGiftQuantity = topGift.totalQuantity;
            </Typography>
            <Typography variant="body2" gutterBottom>
              {/* Access category data */}
              const categories = Object.keys(analytics.categoryTotals);
              const topCategory = Object.entries(analytics.categoryTotals)
                .sort(([,a], [,b]) =&gt; b - a)[0];
            </Typography>
            <Typography variant="body2" gutterBottom>
              {/* Access inventory data */}
              const lowStockCount = analytics.inventorySummary.lowStockItems;
              const utilizationRate = analytics.inventorySummary.averageUtilizationRate;
            </Typography>
            <Typography variant="body2">
              {/* Access timeline data */}
              const todayData = analytics.checkInTimeline.find(item =&gt; 
                item._id.date === new Date().toISOString().split('T')[0]
              );
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SpecificAnalyticsExamples; 