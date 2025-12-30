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
  TableRow,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  Container
} from '@mui/material';
import { FileDownload as FileDownloadIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import AnalyticsBarChart from './charts/AnalyticsBarChart';
import AnalyticsPieChart from './charts/AnalyticsPieChart';
import AnalyticsLineChart from './charts/AnalyticsLineChart';
import { useTheme } from '@mui/material/styles';
import { getAllEventAnalytics } from '../../services/analytics';
import AnalyticsFilters from './AnalyticsFilters';
import { getEvent } from '../../services/events';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import EventHeader from '../Events/EventHeader';

const ComprehensiveAnalytics = ({ eventId: propEventId }) => {
  const { eventId: paramEventId } = useParams();
  const navigate = useNavigate();
  const eventId = propEventId || paramEventId;
  const theme = useTheme();
  
  // Debug logging
  useEffect(() => {
    console.log('ComprehensiveAnalytics mounted with eventId:', eventId);
  }, [eventId]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({});
  const prevFiltersRef = useRef(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [exporting, setExporting] = useState(false);
  
  // Event selection state
  const [event, setEvent] = useState(null);
  const [parentEvent, setParentEvent] = useState(null);
  const [secondaryEvents, setSecondaryEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(eventId); // 'combined' or specific eventId
  const [loadingEvent, setLoadingEvent] = useState(true);

  // Update selectedEventId when eventId changes (only if not already set)
  useEffect(() => {
    if (eventId && !selectedEventId) {
      setSelectedEventId(eventId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]); // Only run when eventId changes, not when selectedEventId changes

  // Fetch event and secondary events
  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) {
        console.warn('ComprehensiveAnalytics: No eventId provided');
        return;
      }
      
      console.log('ComprehensiveAnalytics: Fetching event data for:', eventId);
      setLoadingEvent(true);
      try {
        const eventData = await getEvent(eventId);
        console.log('ComprehensiveAnalytics: Event data fetched:', eventData);
        setEvent(eventData);
        
        let mainEvent = eventData;
        // If it's a secondary event, fetch the parent
        if (eventData.parentEventId) {
          const parent = await getEvent(eventData.parentEventId);
          setParentEvent(parent);
          mainEvent = parent;
        } else {
          setParentEvent(eventData);
        }
        
        // Fetch secondary events for the main event
        const response = await api.get(`/events?parentEventId=${mainEvent._id}`);
        const secondaries = response.data.events || response.data || [];
        console.log('ComprehensiveAnalytics: Secondary events:', secondaries);
        setSecondaryEvents(secondaries);
        
        // If there are secondary events, default to 'combined' view
        if (secondaries.length > 0) {
          // Only set to combined if we haven't explicitly selected something else
          if (selectedEventId === eventId || !selectedEventId) {
            setSelectedEventId('combined');
            console.log('ComprehensiveAnalytics: Setting to combined view (has secondary events)');
          }
        } else if (!selectedEventId) {
          // No secondary events, use the current event
          setSelectedEventId(eventId);
        }
      } catch (err) {
        console.error('ComprehensiveAnalytics: Error fetching event data:', err);
        setError(`Failed to load event: ${err.message || 'Unknown error'}`);
      } finally {
        setLoadingEvent(false);
      }
    };

    fetchEventData();
  }, [eventId]);

  // Fetch analytics based on selected event
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!eventId || !selectedEventId) {
        console.warn('ComprehensiveAnalytics: Missing eventId or selectedEventId', { eventId, selectedEventId });
        setLoading(false);
        return;
      }
      
      // Determine which event ID to use for analytics
      // If 'combined' is selected, use the main event ID (backend automatically includes secondary events)
      // If a specific event is selected, use that event ID
      let analyticsEventId;
      if (selectedEventId === 'combined') {
        // For combined view, use the main event ID (backend will auto-include secondary events)
        // The backend checks if event.isMainEvent and automatically includes secondary events
        const mainEventId = parentEvent?._id || (event?.isMainEvent ? event._id : null) || eventId;
        analyticsEventId = mainEventId;
        console.log('ComprehensiveAnalytics: Combined view - using main event ID:', analyticsEventId, {
          parentEventId: parentEvent?._id,
          eventIsMain: event?.isMainEvent,
          eventId: eventId
        });
      } else {
        analyticsEventId = selectedEventId;
        console.log('ComprehensiveAnalytics: Individual event view - using event ID:', analyticsEventId);
      }
      
      // Compare filters to previous to prevent unnecessary fetches
      const filtersString = JSON.stringify(filters);
      const prevFiltersString = prevFiltersRef.current ? JSON.stringify(prevFiltersRef.current) : null;
      
      // Skip fetch if filters and selectedEventId haven't changed (but always fetch on initial load)
      const currentKey = `${analyticsEventId}-${filtersString}`;
      const prevKey = prevFiltersRef.current ? `${prevFiltersRef.current.eventId}-${prevFiltersString}` : null;
      
      if (prevFiltersRef.current !== null && currentKey === prevKey) {
        console.log('ComprehensiveAnalytics: Skipping fetch - no changes');
        return;
      }

      prevFiltersRef.current = { eventId: analyticsEventId, ...filters };
      
      setLoading(true);
      setError('');
      
      try {
        const data = await getAllEventAnalytics(analyticsEventId, filters);
        console.log('ComprehensiveAnalytics: Analytics data fetched:', data);
        if (data) {
          setAnalytics(data);
        } else {
          setError('No analytics data returned from server');
        }
      } catch (err) {
        console.error('ComprehensiveAnalytics: Error fetching analytics:', err);
        setError(`Failed to load analytics data: ${err.message || 'Unknown error'}`);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if event data is loaded
    if (!loadingEvent) {
      fetchAnalytics();
    }
  }, [eventId, selectedEventId, filters, loadingEvent]);

  // Wrapper component for layout (only when used as standalone route)
  const LayoutWrapper = ({ children }) => {
    if (propEventId) {
      // Used as child component - no layout wrapper
      return <>{children}</>;
    }
    // Used as standalone route - wrap with layout
    return (
      <MainLayout 
        eventName={event?.eventName || 'Loading Event...'} 
        parentEventName={parentEvent && parentEvent._id !== event?._id ? parentEvent.eventName : null} 
        parentEventId={parentEvent && parentEvent._id !== event?._id ? parentEvent._id : null}
      >
        <EventHeader event={event} mainEvent={parentEvent} secondaryEvents={secondaryEvents} />
        {children}
      </MainLayout>
    );
  };

  // Show loading state while fetching event data
  if (loadingEvent) {
    return (
      <LayoutWrapper>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Loading event data...
            </Typography>
          </Box>
        </Container>
      </LayoutWrapper>
    );
  }

  // Show error state
  if (error) {
    return (
      <LayoutWrapper>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          {!propEventId && (
            <Button 
              onClick={() => navigate(`/events/${eventId}/dashboard/advanced`)}
              variant="outlined"
              color="primary"
              size="large"
              sx={{ 
                px: 3,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                },
                transition: 'all 0.2s ease'
              }}
              startIcon={<ArrowBackIcon />}
            >
              Back to Analytics Modules
            </Button>
          )}
        </Container>
      </LayoutWrapper>
    );
  }

  // Show loading state while fetching analytics
  if (loading || !analytics) {
    return (
      <LayoutWrapper>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {!propEventId && (
            <Button 
              onClick={() => navigate(`/events/${eventId}/dashboard/advanced`)}
              variant="outlined"
              color="primary"
              size="large"
              sx={{ 
                mb: 3,
                px: 3,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                },
                transition: 'all 0.2s ease'
              }}
              startIcon={<ArrowBackIcon />}
            >
              Back to Analytics Modules
            </Button>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Loading analytics data...
            </Typography>
          </Box>
        </Container>
      </LayoutWrapper>
    );
  }

  const { eventStats, giftSummary, inventorySummary, topGifts, categoryTotals, checkInTimeline } = analytics;

  // Prepare data for charts with safety checks
  const categoryData = categoryTotals && typeof categoryTotals === 'object' 
    ? Object.entries(categoryTotals)
        .filter(([name, value]) => name && (value !== null && value !== undefined) && !isNaN(Number(value)))
        .map(([name, value]) => ({ name: String(name || 'Unknown'), value: Number(value) || 0 }))
        .filter(entry => entry.name && entry.name !== 'Unknown' && entry.value >= 0)
    : [];
  const timelineData = Array.isArray(checkInTimeline)
    ? checkInTimeline
        .filter(item => item && (item._id || item.date))
        .map(item => {
          const date = item._id?.date || item.date || '';
          const checkIns = Number(item.checkIns) || 0;
          const giftsDistributed = Number(item.giftsDistributed) || 0;
          return {
            date: String(date),
            checkIns: checkIns >= 0 ? checkIns : 0,
            giftsDistributed: giftsDistributed >= 0 ? giftsDistributed : 0
          };
        })
        .filter(item => item.date)
    : [];
  const safeTopGifts = Array.isArray(topGifts)
    ? topGifts
        .filter(gift => gift && gift.name && gift.totalQuantity !== undefined && gift.totalQuantity !== null)
        .map(gift => ({
          name: String(gift.name || 'Unknown'),
          totalQuantity: Number(gift.totalQuantity) || 0,
          uniqueGuestCount: Number(gift.uniqueGuestCount) || 0
        }))
        .filter(gift => gift.name && gift.name !== 'Unknown' && gift.totalQuantity >= 0)
    : [];

  const pieColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'
  ];

  // Export functions
  const exportToCSV = () => {
    const { eventStats, giftSummary, topGifts, categoryTotals, checkInTimeline } = analytics;
    
    // Create comprehensive export with multiple sheets worth of data
    const sections = [];
    
    // Section 1: Event Statistics
    sections.push('=== EVENT STATISTICS ===');
    sections.push('Metric,Value');
    sections.push(`Total Guests,${eventStats.totalGuests}`);
    sections.push(`Checked In Guests,${eventStats.checkedInGuests}`);
    sections.push(`Pending Guests,${eventStats.pendingGuests}`);
    sections.push(`Check-in Percentage,${eventStats.checkInPercentage}%`);
    sections.push('');
    
    // Section 2: Gift Summary
    sections.push('=== GIFT SUMMARY ===');
    sections.push('Metric,Value');
    sections.push(`Total Gifts Distributed,${giftSummary.totalGiftsDistributed}`);
    sections.push(`Unique Items Distributed,${giftSummary.uniqueItemsDistributed}`);
    sections.push(`Average Gifts Per Guest,${giftSummary.averageGiftsPerGuest}`);
    sections.push('');
    
    // Section 3: Top Gifts
    sections.push('=== TOP GIFTS ===');
    sections.push('Name,Type,Style,Size,Total Quantity,Distributed Count,Unique Guest Count');
    topGifts.forEach(gift => {
      sections.push(`"${gift.name}",${gift.type || ''},${gift.style || ''},${gift.size || ''},${gift.totalQuantity},${gift.distributedCount},${gift.uniqueGuestCount}`);
    });
    sections.push('');
    
    // Section 4: Category Totals
    sections.push('=== CATEGORY TOTALS ===');
    sections.push('Category,Total Quantity');
    Object.entries(categoryTotals).forEach(([category, total]) => {
      sections.push(`"${category}",${total}`);
    });
    sections.push('');
    
    // Section 5: Check-in Timeline
    sections.push('=== CHECK-IN TIMELINE ===');
    sections.push('Date,Check-ins,Gifts Distributed');
    checkInTimeline.forEach(item => {
      sections.push(`${item._id.date},${item.checkIns},${item.giftsDistributed}`);
    });
    
    const csvContent = sections.join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const date = new Date().toISOString().split('T')[0];
    const exportEventId = selectedEventId === 'combined' ? eventId : selectedEventId;
    link.setAttribute('download', `comprehensive_analytics_${exportEventId}_${date}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportMenuAnchor(null);
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const { eventStats, giftSummary, topGifts, categoryTotals, checkInTimeline } = analytics;
      
      const sections = [];
      
      sections.push('=== EVENT STATISTICS ===');
      sections.push('Metric\tValue');
      sections.push(`Total Guests\t${eventStats.totalGuests}`);
      sections.push(`Checked In Guests\t${eventStats.checkedInGuests}`);
      sections.push(`Pending Guests\t${eventStats.pendingGuests}`);
      sections.push(`Check-in Percentage\t${eventStats.checkInPercentage}%`);
      sections.push('');
      
      sections.push('=== GIFT SUMMARY ===');
      sections.push('Metric\tValue');
      sections.push(`Total Gifts Distributed\t${giftSummary.totalGiftsDistributed}`);
      sections.push(`Unique Items Distributed\t${giftSummary.uniqueItemsDistributed}`);
      sections.push(`Average Gifts Per Guest\t${giftSummary.averageGiftsPerGuest}`);
      sections.push('');
      
      sections.push('=== TOP GIFTS ===');
      sections.push('Name\tType\tStyle\tSize\tTotal Quantity\tDistributed Count\tUnique Guest Count');
      topGifts.forEach(gift => {
        sections.push(`${gift.name}\t${gift.type || ''}\t${gift.style || ''}\t${gift.size || ''}\t${gift.totalQuantity}\t${gift.distributedCount}\t${gift.uniqueGuestCount}`);
      });
      sections.push('');
      
      sections.push('=== CATEGORY TOTALS ===');
      sections.push('Category\tTotal Quantity');
      Object.entries(categoryTotals).forEach(([category, total]) => {
        sections.push(`${category}\t${total}`);
      });
      sections.push('');
      
      sections.push('=== CHECK-IN TIMELINE ===');
      sections.push('Date\tCheck-ins\tGifts Distributed');
      checkInTimeline.forEach(item => {
        sections.push(`${item._id.date}\t${item.checkIns}\t${item.giftsDistributed}`);
      });
      
      const excelContent = sections.join('\n');
      
      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const date = new Date().toISOString().split('T')[0];
      const exportEventId = selectedEventId === 'combined' ? eventId : selectedEventId;
      link.setAttribute('download', `comprehensive_analytics_${exportEventId}_${date}.xls`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      setExporting(false);
      setExportMenuAnchor(null);
    }
  };

  // Build event options for dropdown
  const eventOptions = [];
  const mainEvent = parentEvent || (event?.isMainEvent ? event : null);
  
  // Only show dropdown if there are secondary events
  if (mainEvent && secondaryEvents.length > 0) {
    // Always show "Combined" option when there are secondary events
    eventOptions.push({ value: 'combined', label: 'All Events (Combined)' });
    
    // Add main event option
    if (mainEvent._id) {
      eventOptions.push({ value: mainEvent._id, label: `${mainEvent.eventName} (Main)` });
    }
    
    // Add secondary events
    secondaryEvents.forEach(sec => {
      if (sec._id && sec._id !== mainEvent._id) {
        eventOptions.push({ value: sec._id, label: sec.eventName });
      }
    });
  }

  return (
    <LayoutWrapper>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Back Button - only shown when used as standalone route */}
        {!propEventId && (
          <Button 
            onClick={() => navigate(`/events/${eventId}/dashboard/advanced`)}
            variant="outlined"
            color="primary"
            size="large"
            sx={{ 
              mb: 3,
              px: 3,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              borderWidth: 2,
              '&:hover': {
                borderWidth: 2,
                transform: 'translateY(-2px)',
                boxShadow: 3
              },
              transition: 'all 0.2s ease'
            }}
            startIcon={<ArrowBackIcon />}
          >
            Back to Analytics Modules
          </Button>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
          Comprehensive Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Event Selector - Only show if there are multiple events */}
          {eventOptions.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 250 }}>
              <InputLabel>View Event</InputLabel>
              <Select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                label="View Event"
              >
                {eventOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Tooltip title="Export Data">
            <IconButton
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              disabled={exporting || !analytics}
            >
              <FileDownloadIcon />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={() => setExportMenuAnchor(null)}
          >
            <MenuItem onClick={exportToCSV} disabled={exporting}>
              Export as CSV
            </MenuItem>
            <MenuItem onClick={exportToExcel} disabled={exporting}>
              Export as Excel
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Analytics Filters */}
      <AnalyticsFilters
        initialEventId={selectedEventId === 'combined' 
          ? (parentEvent?._id || (event?.isMainEvent ? event._id : null) || eventId)
          : selectedEventId}
        showEventSelector={false}
        onFiltersChange={setFilters}
        autoApply={true}
        variant="full"
      />
      
      {/* Event Statistics */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 3 }}>
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
        
        <Grid size={{ xs: 12, md: 3 }}>
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
        
        <Grid size={{ xs: 12, md: 3 }}>
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
        
        <Grid size={{ xs: 12, md: 3 }}>
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
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Top Distributed Gifts
              </Typography>
              <AnalyticsBarChart
                data={safeTopGifts}
                dataKey="totalQuantity"
                nameKey="name"
                yAxisLabel="Quantity"
                height={300}
                colors={pieColors}
                loading={loading}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Gift Categories Pie Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Gift Distribution by Category
              </Typography>
              <AnalyticsPieChart
                data={categoryData}
                dataKey="value"
                nameKey="name"
                height={300}
                colors={pieColors}
                outerRadius={100}
                loading={loading}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Check-in Timeline */}
        <Grid size={{ xs: 12 }}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Check-in Timeline (Last 7 Days)
              </Typography>
              <AnalyticsLineChart
                data={timelineData}
                lines={[
                  { 
                    dataKey: 'checkIns', 
                    name: 'Check-ins', 
                    color: theme.palette.primary.main,
                    strokeWidth: 3
                  },
                  { 
                    dataKey: 'giftsDistributed', 
                    name: 'Gifts Distributed', 
                    color: theme.palette.success.main,
                    strokeWidth: 3
                  }
                ]}
                xAxisKey="date"
                height={300}
                loading={loading}
                showGrid={true}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Tables */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Top Gifts Table */}
        <Grid size={{ xs: 12, md: 6 }}>
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
                    {safeTopGifts.slice(0, 5).map((gift, idx) => (
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
        <Grid size={{ xs: 12, md: 6 }}>
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
      </Container>
    </LayoutWrapper>
  );
};

export default ComprehensiveAnalytics; 