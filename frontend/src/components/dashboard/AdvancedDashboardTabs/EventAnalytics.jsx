import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
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
import AnalyticsBarChart from '../../analytics/charts/AnalyticsBarChart';
import AnalyticsPieChart from '../../analytics/charts/AnalyticsPieChart';
import AnalyticsLineChart from '../../analytics/charts/AnalyticsLineChart';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import MuiTooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import { getAllEventAnalytics } from '../../../services/analytics';
import AnalyticsFilters from '../../analytics/AnalyticsFilters';

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
  const [filters, setFilters] = useState({});
  const prevFiltersRef = useRef(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [exporting, setExporting] = useState(false);
  
  // Memoize the filters change handler to prevent AnalyticsFilters from remounting
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  // Debug logging for data validation (commented out to reduce console noise)
  // console.log('📊 EventAnalytics Debug:', {
  //   eventId,
  //   hasAnalytics: !!analytics,
  //   loading,
  //   error
  // });

  // Track if this is the initial mount
  const isInitialMount = useRef(true);
  
  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!eventId) {
        setError('No event ID provided');
        setLoading(false);
        return;
      }

      // Compare filters to previous to prevent unnecessary fetches
      const filtersString = JSON.stringify(filters);
      const prevFiltersString = prevFiltersRef.current ? JSON.stringify(prevFiltersRef.current) : null;
      
      // On initial mount, fetch once with empty filters, then mark as not initial
      if (isInitialMount.current) {
        isInitialMount.current = false;
        prevFiltersRef.current = JSON.parse(JSON.stringify(filters));
        // Continue to fetch...
      } else if (filtersString === prevFiltersString) {
        // Skip fetch if filters haven't actually changed (after initial mount)
        return;
      }
      
      prevFiltersRef.current = JSON.parse(JSON.stringify(filters));

      try {
        setLoading(true);
        setError('');
        const data = await getAllEventAnalytics(eventId, filters);
        setAnalytics(data);
        
        // console.log('✅ Event analytics loaded successfully:', {
        //   eventStats: data.eventStats,
        //   timelineLength: data.checkInTimeline?.length || 0,
        //   hasGiftData: !!data.giftSummary
        // });
      } catch (err) {
        console.error('❌ Error fetching event analytics:', err);
        setError('Failed to load event analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [eventId, filters]);

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

    // console.log('📈 Timeline Data Processing:', {
    //   totalDays: processed.length,
    //   totalCheckIns: processed.reduce((sum, item) => sum + item.checkIns, 0),
    //   totalGifts: processed.reduce((sum, item) => sum + item.giftsDistributed, 0),
    //   dateRange: processed.length > 0 ? `${processed[0].date} to ${processed[processed.length - 1].date}` : 'No data'
    // });

    return processed;
  }, [analytics?.checkInTimeline]);

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

  const { eventStats, detailedCheckIns } = analytics;

  // Export functions
  const exportCheckInsToCSV = () => {
    if (!detailedCheckIns || detailedCheckIns.length === 0) return;
    
    const sections = [];
    
    // Section 0: Export Information
    sections.push('=== EXPORT INFORMATION ===');
    sections.push(`Exported On,"${new Date().toLocaleString()}"`);
    sections.push(`Export Date,"${new Date().toLocaleDateString()}"`);
    sections.push(`Export Time,"${new Date().toLocaleTimeString()}"`);
    sections.push('');
    
    // Section 1: Filtered Dates (if any)
    if (filters.startDate || filters.endDate) {
      sections.push('=== FILTERED DATE RANGE ===');
      if (filters.startDate) {
        sections.push(`Start Date,"${new Date(filters.startDate).toLocaleDateString()}"`);
      }
      if (filters.endDate) {
        sections.push(`End Date,"${new Date(filters.endDate).toLocaleDateString()}"`);
      }
      sections.push('');
    }
    
    // Section 2: Event Summary
    sections.push('=== EVENT SUMMARY ===');
    sections.push(`Event Name,"${(eventStats.eventName || 'N/A').replace(/"/g, '""')}"`);
    sections.push(`Contract Number,"${(eventStats.eventContractNumber || 'N/A').replace(/"/g, '""')}"`);
    sections.push(`Event Type,"${(eventStats.isMainEvent ? 'Main Event' : 'Secondary Event').replace(/"/g, '""')}"`);
    sections.push(`Total Guests,${eventStats.totalGuests || 0}`);
    sections.push(`Checked In,${eventStats.checkedInGuests || 0}`);
    sections.push(`Pending,${eventStats.pendingGuests || 0}`);
    sections.push(`Check-in Rate,${eventStats.checkInPercentage || 0}%`);
    sections.push('');
    
    // Section 3: Check-in Details
    sections.push('=== CHECK-IN DETAILS ===');
    const headers = ['Guest Name', 'Email', 'Checked In At', 'Checked In By', 'Gifts Count', 'Notes'];
    sections.push(headers.join(','));
    
    const rows = detailedCheckIns.map(checkin => [
      (checkin.guestName || '').replace(/"/g, '""'),
      (checkin.guestEmail || '').replace(/"/g, '""'),
      checkin.checkedInAt ? new Date(checkin.checkedInAt).toLocaleString().replace(/"/g, '""') : '',
      (checkin.checkedInBy || checkin.checkedInByUsername || 'Unknown').replace(/"/g, '""'),
      checkin.giftsCount || 0,
      (checkin.notes || '').replace(/"/g, '""') // Escape quotes in CSV
    ]);
    
    rows.forEach(row => {
      sections.push(row.map(cell => `"${cell}"`).join(','));
    });
    
    const csvContent = sections.join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `event_checkins_${eventId}_${date}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportMenuAnchor(null);
  };

  const exportCheckInsToExcel = async () => {
    setExporting(true);
    try {
      if (!detailedCheckIns || detailedCheckIns.length === 0) return;
      
      const sections = [];
      
      // Section 0: Export Information
      sections.push('=== EXPORT INFORMATION ===');
      sections.push(`Exported On\t${new Date().toLocaleString()}`);
      sections.push(`Export Date\t${new Date().toLocaleDateString()}`);
      sections.push(`Export Time\t${new Date().toLocaleTimeString()}`);
      sections.push('');
      
      // Section 1: Filtered Dates (if any)
      if (filters.startDate || filters.endDate) {
        sections.push('=== FILTERED DATE RANGE ===');
        if (filters.startDate) {
          sections.push(`Start Date\t${new Date(filters.startDate).toLocaleDateString()}`);
        }
        if (filters.endDate) {
          sections.push(`End Date\t${new Date(filters.endDate).toLocaleDateString()}`);
        }
        sections.push('');
      }
      
      // Section 2: Event Summary
      sections.push('=== EVENT SUMMARY ===');
      sections.push(`Event Name\t${eventStats.eventName || 'N/A'}`);
      sections.push(`Contract Number\t${eventStats.eventContractNumber || 'N/A'}`);
      sections.push(`Event Type\t${eventStats.isMainEvent ? 'Main Event' : 'Secondary Event'}`);
      sections.push(`Total Guests\t${eventStats.totalGuests || 0}`);
      sections.push(`Checked In\t${eventStats.checkedInGuests || 0}`);
      sections.push(`Pending\t${eventStats.pendingGuests || 0}`);
      sections.push(`Check-in Rate\t${eventStats.checkInPercentage || 0}%`);
      sections.push('');
      
      // Section 3: Check-in Details
      sections.push('=== CHECK-IN DETAILS ===');
      const headers = ['Guest Name', 'Email', 'Checked In At', 'Checked In By', 'Gifts Count', 'Notes'];
      sections.push(headers.join('\t'));
      
      const rows = detailedCheckIns.map(checkin => [
        checkin.guestName || '',
        checkin.guestEmail || '',
        checkin.checkedInAt ? new Date(checkin.checkedInAt).toLocaleString() : '',
        checkin.checkedInBy || checkin.checkedInByUsername || 'Unknown',
        checkin.giftsCount || 0,
        checkin.notes || ''
      ]);
      
      rows.forEach(row => {
        sections.push(row.join('\t'));
      });
      
      const excelContent = sections.join('\n');
      
      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `event_checkins_${eventId}_${date}.xls`);
      
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

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              Event Analytics Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track guest check-ins, event performance, and attendance patterns
            </Typography>
          </Box>
          <MuiTooltip title="Export Data">
            <IconButton
              size="small"
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              disabled={exporting || !analytics}
            >
              <FileDownloadIcon />
            </IconButton>
          </MuiTooltip>
        </Box>
        
        {/* Export Menu - placed outside Box for proper portal rendering */}
        <Menu
          anchorEl={exportMenuAnchor}
          open={Boolean(exportMenuAnchor)}
          onClose={() => setExportMenuAnchor(null)}
        >
          <MenuItem onClick={exportCheckInsToCSV} disabled={exporting || !detailedCheckIns?.length}>
            Export Check-ins as CSV
          </MenuItem>
          <MenuItem onClick={exportCheckInsToExcel} disabled={exporting || !detailedCheckIns?.length}>
            Export Check-ins as Excel
          </MenuItem>
        </Menu>

        {/* Analytics Filters */}
        <Box sx={{ mb: 3 }}>
          <AnalyticsFilters
            key={`analytics-filters-${eventId}`}
            initialEventId={eventId}
            showEventSelector={false}
            onFiltersChange={handleFiltersChange}
            autoApply={true}
            variant="compact"
          />
        </Box>

        {/* Event Summary - Combined with Event Details */}
        <Box mb={3} p={2} bgcolor="grey.50" borderRadius={2}>
          <Typography variant="subtitle2" fontWeight={600} mb={2} color="primary.main">
            📈 Event Summary
          </Typography>
          
          {/* Event Information */}
          <Box mb={2} pb={2} borderBottom="1px solid" borderColor="divider">
            <Box display="flex" gap={4} flexWrap="wrap">
              <Box>
                <Typography variant="caption" color="text.secondary">Event Name</Typography>
                <Typography variant="body1" fontWeight={600}>{eventStats.eventName || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Contract Number</Typography>
                <Typography variant="body1" fontWeight={600}>{eventStats.eventContractNumber || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Event Type</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {eventStats.isMainEvent ? 'Main Event' : 'Secondary Event'}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Statistics */}
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

        {/* SECTION 1.5: Detailed Check-in List */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} mb={2} color="primary.main">
            Check-in Details
          </Typography>
          {analytics.detailedCheckIns && Array.isArray(analytics.detailedCheckIns) && analytics.detailedCheckIns.length > 0 ? (
            <>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {filters.startDate || filters.endDate 
                  ? `Showing check-ins filtered by date range${filters.startDate ? ` from ${new Date(filters.startDate).toLocaleDateString()}` : ''}${filters.endDate ? ` to ${new Date(filters.endDate).toLocaleDateString()}` : ''}`
                  : 'All check-ins for this event'
                } ({analytics.detailedCheckIns.length} total)
              </Typography>
              <TableContainer component={Paper} elevation={1}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'background.default' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Guest Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Checked In At</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Checked In By</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="center">Gifts</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.detailedCheckIns.map((checkin) => (
                      <TableRow key={checkin._id} hover>
                        <TableCell>{checkin.guestName || 'N/A'}</TableCell>
                        <TableCell>{checkin.guestEmail || 'N/A'}</TableCell>
                        <TableCell>
                          {checkin.checkedInAt 
                            ? new Date(checkin.checkedInAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'
                          }
                        </TableCell>
                        <TableCell>{checkin.checkedInBy || checkin.checkedInByUsername || 'Unknown'}</TableCell>
                        <TableCell align="center">
                          {checkin.giftsCount > 0 ? (
                            <Typography variant="body2" color="success.main" fontWeight={600}>
                              {checkin.giftsCount}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              0
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ 
                            maxWidth: 200, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {checkin.notes || '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              {filters.startDate || filters.endDate
                ? 'No check-ins found for the selected date range.'
                : 'No check-ins have been recorded for this event yet.'}
            </Alert>
          )}
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

        {/* SECTION 3: Check-in Timeline */}
        {timelineData.length > 0 && (
          <Box mb={4}>
            <Typography variant="subtitle1" fontWeight={600} mb={2} color="primary.main">
              📈 Check-in Timeline (Last 7 Days)
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Line chart showing check-in patterns and gift distribution over time
            </Typography>
            <AnalyticsLineChart
              data={timelineData}
              lines={[
                { 
                  dataKey: 'checkIns', 
                  name: 'Check-ins', 
                  color: CHART_COLORS[0],
                  strokeWidth: 3
                },
                { 
                  dataKey: 'giftsDistributed', 
                  name: 'Gifts Distributed', 
                  color: CHART_COLORS[1],
                  strokeWidth: 3
                }
              ]}
              xAxisKey="formattedDate"
              height={300}
              loading={loading}
              showGrid={true}
            />
          </Box>
        )}

      </CardContent>
    </Card>
  );
};

export default EventAnalytics; 