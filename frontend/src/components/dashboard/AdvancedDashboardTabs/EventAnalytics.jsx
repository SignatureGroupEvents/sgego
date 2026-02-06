import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
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
  TablePagination,
  Paper,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Grid,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Skeleton,
  useMediaQuery
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceDot } from 'recharts';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import Menu from '@mui/material/Menu';
import toast from 'react-hot-toast';
import { useAnalyticsApi } from '../../../contexts/AnalyticsApiContext';

const EMPTY_LABEL = '—';

// Normalize backend bucket date string to valid ISO for parsing (backend uses UTC)
function normalizeBucketToISO(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  const s = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(s)) return `${s}:00.000Z`;
  if (/^\d{4}-\d{2}-\d{2}T\d{1,2}$/.test(s)) return `${s}:00:00.000Z`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T12:00:00.000Z`;
  return s;
}

// Format peak bucket for display: day = date only (UTC), hour/minute = date + time (local)
function formatPeakPeriodLabel(rawDate, groupBy) {
  if (!rawDate) return '';
  const iso = normalizeBucketToISO(rawDate);
  const d = new Date(iso);
  if (isNaN(d.getTime())) return rawDate;
  if (groupBy === 'day') {
    return d.toLocaleDateString(undefined, { dateStyle: 'long', timeZone: 'UTC' });
  }
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' });
}

const EventAnalytics = ({ eventId, refreshKey = 0, isPortalView = false, allowCsvExport = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const getAnalytics = useAnalyticsApi();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timelineGroupBy, setTimelineGroupBy] = useState('hour');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTimeBucket, setSelectedTimeBucket] = useState(null);
  const [sortBy, setSortBy] = useState('checkedInAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [checkInPage, setCheckInPage] = useState(0);
  const [checkInRowsPerPage, setCheckInRowsPerPage] = useState(10);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const prevFiltersRef = useRef(null);
  const lastRefreshKeyRef = useRef(refreshKey);
  const isInitialMount = useRef(true);
  const canExport = !isPortalView || allowCsvExport;

  // API filters: date range (from calendar) + granularity
  const apiFilters = useMemo(() => {
    const start = dateRangeStart?.trim() || undefined;
    const end = dateRangeEnd?.trim() || undefined;
    return {
      startDate: start,
      endDate: end || start,
      timelineGroupBy: timelineGroupBy || 'hour'
    };
  }, [dateRangeStart, dateRangeEnd, timelineGroupBy]);

  const fetchAnalytics = useCallback(async () => {
    if (!eventId) {
      setError('No event ID provided');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await getAnalytics(eventId, apiFilters);
      setAnalytics(data);
    } catch (err) {
      console.error('❌ Error fetching event analytics:', err);
      setError('Failed to load event analytics data');
    } finally {
      setLoading(false);
    }
  }, [eventId, apiFilters, getAnalytics]);

  const fetchAnalyticsRef = useRef(fetchAnalytics);
  fetchAnalyticsRef.current = fetchAnalytics;

  // Listen for real-time analytics updates when someone checks in (gifts distributed, undo, etc.)
  useEffect(() => {
    if (!eventId) return;
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
      : 'http://localhost:3001';
    const socket = io(socketUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });
    const eventIdStr = String(eventId);
    socket.emit('join-event', eventIdStr);
    const onUpdate = (data) => {
      if (data?.eventId && String(data.eventId) === eventIdStr && fetchAnalyticsRef.current) {
        fetchAnalyticsRef.current();
      }
    };
    socket.on('analytics:update', onUpdate);
    return () => {
      socket.off('analytics:update', onUpdate);
      socket.emit('leave-event', eventIdStr);
      socket.disconnect();
    };
  }, [eventId]);

  useEffect(() => {
    const filtersString = JSON.stringify(apiFilters);
    const prevString = prevFiltersRef.current ? JSON.stringify(prevFiltersRef.current) : null;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevFiltersRef.current = { ...apiFilters };
      lastRefreshKeyRef.current = refreshKey;
      fetchAnalytics();
    } else if (filtersString !== prevString || refreshKey !== lastRefreshKeyRef.current) {
      prevFiltersRef.current = { ...apiFilters };
      lastRefreshKeyRef.current = refreshKey;
      fetchAnalytics();
    }

    // Auto-refresh every 30 seconds for near real-time check-in data (same as Gift Analytics)
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [apiFilters, refreshKey, fetchAnalytics]);

  useEffect(() => {
    setCheckInPage(0);
  }, [analytics?.detailedCheckIns?.length, apiFilters.startDate, apiFilters.endDate, statusFilter, searchQuery, selectedTimeBucket]);


  // Process check-in timeline data (minute / hour / day)
  const timelineData = useMemo(() => {
    if (!analytics?.checkInTimeline) return [];
    const groupBy = timelineGroupBy || 'hour';

    const formatTimelineLabel = (dateStr) => {
      if (!dateStr) return '';
      if (groupBy === 'minute' && dateStr.includes('T') && /^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(dateStr)) {
        const iso = `${dateStr}:00.000Z`;
        return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
      }
      if (groupBy === 'hour' && dateStr.includes('T') && /^\d{4}-\d{2}-\d{2}T\d{1,2}$/.test(dateStr)) {
        const iso = `${dateStr}:00:00.000Z`;
        return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
      }
      if (groupBy === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return new Date(dateStr + 'T12:00:00.000Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      }
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    };

    return analytics.checkInTimeline.map(item => ({
      date: item._id.date,
      rawDate: normalizeBucketToISO(item._id.date),
      checkIns: item.checkIns,
      formattedDate: formatTimelineLabel(item._id.date)
    }));
  }, [analytics?.checkInTimeline, timelineGroupBy]);

  const peakBucket = useMemo(() => {
    if (!timelineData.length) return null;
    const max = timelineData.reduce((acc, d) => (d.checkIns > (acc?.checkIns ?? 0) ? d : acc), null);
    return max;
  }, [timelineData]);


  // Avg check-ins per hour: total check-ins over the timeline span, with min 1 hour so short bursts don't inflate
  const avgCheckInsPerHour = useMemo(() => {
    if (!timelineData.length) return 0;
    const total = timelineData.reduce((a, b) => a + (b.checkIns || 0), 0);
    const first = new Date(timelineData[0].rawDate).getTime();
    const last = new Date(timelineData[timelineData.length - 1].rawDate).getTime();
    const spanHours = Math.max((last - first) / (1000 * 60 * 60), 1);
    return total / spanHours;
  }, [timelineData]);

  // Filter and sort table data (client-side)
  const rawCheckIns = analytics?.detailedCheckIns ?? [];
  const filteredAndSortedCheckIns = useMemo(() => {
    let list = [...(rawCheckIns || [])];
    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          (c.guestName || '').toLowerCase().includes(q) ||
          (c.guestEmail || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'checked_in') {
      list = list.filter((c) => c.checkedInAt);
    } else if (statusFilter === 'pending') {
      list = list.filter((c) => !c.checkedInAt);
    }
    if (selectedTimeBucket?.date) {
      const bucket = selectedTimeBucket.date;
      list = list.filter((c) => {
        if (!c.checkedInAt) return false;
        const at = new Date(c.checkedInAt);
        if (timelineGroupBy === 'minute' && /^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(bucket)) {
          const bucketStart = new Date(bucket + ':00.000Z');
          const bucketEnd = new Date(bucketStart.getTime() + 60 * 1000);
          return at >= bucketStart && at < bucketEnd;
        }
        if (timelineGroupBy === 'hour' && bucket.includes('T') && /^\d{4}-\d{2}-\d{2}T\d{1,2}$/.test(bucket)) {
          const bucketStart = new Date(bucket + ':00:00.000Z');
          const bucketEnd = new Date(bucketStart);
          bucketEnd.setHours(bucketEnd.getHours() + 1);
          return at >= bucketStart && at < bucketEnd;
        }
        const dayStr = at.toISOString().split('T')[0];
        return bucket === dayStr || bucket.startsWith(dayStr);
      });
    }
    list.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (sortBy === 'checkedInAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }
      if (sortOrder === 'desc') [aVal, bVal] = [bVal, aVal];
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    });
    return list;
  }, [rawCheckIns, searchQuery, statusFilter, selectedTimeBucket, sortBy, sortOrder, timelineGroupBy]);

  const paginatedCheckIns = useMemo(() => {
    const start = checkInPage * checkInRowsPerPage;
    return filteredAndSortedCheckIns.slice(start, start + checkInRowsPerPage);
  }, [filteredAndSortedCheckIns, checkInPage, checkInRowsPerPage]);

  const eventStats = analytics?.eventStats ?? { totalGuests: 0, checkedInGuests: 0, pendingGuests: 0, checkInPercentage: 0 };
  const detailedCheckIns = rawCheckIns;

  // Export functions
  const exportCheckInsToCSV = () => {
    if (!analytics) return;
    const sections = [];
    
    // Section 0: Export Information
    sections.push('=== EXPORT INFORMATION ===');
    sections.push(`Exported On,"${new Date().toLocaleString()}"`);
    sections.push(`Export Date,"${new Date().toLocaleDateString()}"`);
    sections.push(`Export Time,"${new Date().toLocaleTimeString()}"`);
    sections.push('');
    
    // Section 1: Filtered Dates (if any)
    if (apiFilters.startDate || apiFilters.endDate) {
      sections.push('=== FILTERED DATE RANGE ===');
      if (apiFilters.startDate) {
        sections.push(`Start Date,"${new Date(apiFilters.startDate).toLocaleDateString()}"`);
      }
      if (apiFilters.endDate) {
        sections.push(`End Date,"${new Date(apiFilters.endDate).toLocaleDateString()}"`);
      }
      sections.push('');
    }
    
    // Section 2: Quick Summary
    sections.push('=== QUICK SUMMARY ===');
    sections.push(`Total Guests,${eventStats.totalGuests || 0}`);
    sections.push(`Checked In,${eventStats.checkedInGuests || 0}`);
    sections.push(`Pending,${eventStats.pendingGuests || 0}`);
    sections.push(`Check-in Rate,${eventStats.checkInPercentage || 0}%`);
    sections.push('');
    
    // Section 3: Check-in Details (export uses current filtered list)
    sections.push('=== CHECK-IN DETAILS ===');
    const headers = ['Guest Name', 'Email', 'Checked In At', 'Checked In By', 'Gifts Count', 'Notes'];
    sections.push(headers.join(','));
    
    const rows = filteredAndSortedCheckIns.map(checkin => [
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
    toast.success('Check-ins exported to CSV');
  };

  const exportCheckInsToExcel = async () => {
    setExporting(true);
    try {
      if (!filteredAndSortedCheckIns?.length && !rawCheckIns?.length) {
        toast.error('No check-ins to export');
        return;
      }
      
      const sections = [];
      
      // Section 0: Export Information
      sections.push('=== EXPORT INFORMATION ===');
      sections.push(`Exported On\t${new Date().toLocaleString()}`);
      sections.push(`Export Date\t${new Date().toLocaleDateString()}`);
      sections.push(`Export Time\t${new Date().toLocaleTimeString()}`);
      sections.push('');
      
      // Section 1: Filtered Dates (if any)
      if (apiFilters.startDate || apiFilters.endDate) {
        sections.push('=== FILTERED DATE RANGE ===');
        if (apiFilters.startDate) {
          sections.push(`Start Date\t${new Date(apiFilters.startDate).toLocaleDateString()}`);
        }
        if (apiFilters.endDate) {
          sections.push(`End Date\t${new Date(apiFilters.endDate).toLocaleDateString()}`);
        }
        sections.push('');
      }
      
      // Section 2: Quick Summary
      sections.push('=== QUICK SUMMARY ===');
      sections.push(`Total Guests\t${eventStats.totalGuests || 0}`);
      sections.push(`Checked In\t${eventStats.checkedInGuests || 0}`);
      sections.push(`Pending\t${eventStats.pendingGuests || 0}`);
      sections.push(`Check-in Rate\t${eventStats.checkInPercentage || 0}%`);
      sections.push('');
      
      // Section 3: Check-in Details (current filtered list)
      sections.push('=== CHECK-IN DETAILS ===');
      const headers = ['Guest Name', 'Email', 'Checked In At', 'Checked In By', 'Gifts Count', 'Notes'];
      sections.push(headers.join('\t'));
      
      const rows = filteredAndSortedCheckIns.map(checkin => [
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
      toast.success('Check-ins exported to Excel');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportMenuAnchor(null);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'checkedInAt' ? 'desc' : 'asc');
    }
    setCheckInPage(0);
  };

  const chartColor = theme.palette.primary.main;

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
        {/* Page header: title + Export */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            pb: 3,
            mb: 3,
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ letterSpacing: '-0.02em', lineHeight: 1.3 }}>
              Event Analytics Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Track guest check-ins, event performance, and attendance patterns
            </Typography>
          </Box>
          {canExport && (
            <Button
              variant="contained"
              size="large"
              startIcon={<FileDownloadIcon />}
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              disabled={exporting || !analytics}
              sx={{ px: 3, py: 1.5 }}
            >
              Export
            </Button>
          )}
        </Box>

        {/* Error state */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
            <Button size="small" sx={{ ml: 1 }} onClick={() => { setError(null); fetchAnalytics(); }}>
              Retry
            </Button>
          </Alert>
        )}

        {canExport && (
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={() => setExportMenuAnchor(null)}
          >
            <MenuItem onClick={exportCheckInsToCSV} disabled={exporting}>
              Export as CSV
            </MenuItem>
            <MenuItem onClick={exportCheckInsToExcel} disabled={exporting}>
              Export as XLSX
            </MenuItem>
          </Menu>
        )}

        {/* Chart (left) + Granularity & KPI cards (right); on mobile/tablet: stacked, cards wrap */}
        <Box
          sx={{
            mb: 4,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
            alignItems: 'stretch'
          }}
        >
          {/* Check-in Timeline - left */}
          <Box sx={{ flex: { xs: '0 0 auto', md: '1 1 50%' }, minWidth: 0, width: '100%' }}>
            {/* Date Range - calendar pickers above chart */}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Date Range
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
              <TextField
                size="small"
                type="date"
                label="Start"
                value={dateRangeStart}
                onChange={(e) => { setDateRangeStart(e.target.value); setSelectedTimeBucket(null); }}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              <TextField
                size="small"
                type="date"
                label="End"
                value={dateRangeEnd}
                onChange={(e) => { setDateRangeEnd(e.target.value); setSelectedTimeBucket(null); }}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => { setDateRangeStart(''); setDateRangeEnd(''); setSelectedTimeBucket(null); }}
                disabled={!dateRangeStart && !dateRangeEnd}
              >
                Clear
              </Button>
            </Box>
            <Typography variant="h6" fontWeight={600} color="primary.main" sx={{ mb: 2 }}>
              Check-in Timeline
            </Typography>
            {loading ? (
              <Skeleton variant="rounded" height={280} sx={{ height: { xs: 240, sm: 280 } }} />
            ) : timelineData.length > 0 ? (
              <Card variant="outlined" sx={{ overflow: 'hidden', minHeight: { xs: 240, sm: 280 } }}>
                <CardContent sx={{ height: '100%', '&:last-child': { pb: 2 } }}>
                  <ResponsiveContainer width="100%" height={300} minHeight={240}>
                  <LineChart data={timelineData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="formattedDate" tick={{ fontSize: 12 }} stroke={theme.palette.text.secondary} />
                    <YAxis tick={{ fontSize: 12 }} stroke={theme.palette.text.secondary} allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0]?.payload;
                        return (
                          <Paper elevation={2} sx={{ px: 1.5, py: 1 }}>
                            <Typography variant="caption" display="block">{p?.rawDate ? new Date(p.rawDate).toLocaleString(undefined, { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' }) : label}</Typography>
                            <Typography variant="body2" fontWeight={600}>Check-ins: {p?.checkIns ?? 0}</Typography>
                            {peakBucket && p?.rawDate === peakBucket.rawDate && (
                              <Typography variant="caption" color="primary.main">Peak</Typography>
                            )}
                          </Paper>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="checkIns"
                      name="Check-ins"
                      stroke={chartColor}
                      strokeWidth={2}
                      dot={{ r: 4, fill: chartColor }}
                      activeDot={(props) => {
                        const { cx, cy, payload } = props;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill={chartColor}
                            stroke={theme.palette.background.paper}
                            strokeWidth={2}
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              if (payload) setSelectedTimeBucket(prev => (prev?.rawDate === payload.rawDate ? null : { date: payload.rawDate, label: payload.formattedDate }));
                            }}
                          />
                        );
                      }}
                    />
                    {peakBucket && (
                      <ReferenceDot
                        x={peakBucket.formattedDate}
                        y={peakBucket.checkIns}
                        r={6}
                        fill={theme.palette.warning.main}
                        stroke={theme.palette.background.paper}
                        strokeWidth={2}
                      />
                    )}
                  </LineChart>
                  </ResponsiveContainer>
                  {selectedTimeBucket && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Table filtered to: {selectedTimeBucket.label}. Click again to clear.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card variant="outlined"><CardContent><Typography variant="body2" color="text.secondary">No timeline data for the selected range.</Typography></CardContent></Card>
            )}
          </Box>

          {/* Right: Group by time + KPI cards, aligned with chart (below Date Range + title) */}
          <Box
            sx={{
              flex: { xs: '0 0 auto', md: '0 0 auto' },
              width: { xs: '100%', md: 340 },
              maxWidth: '100%',
              pt: { xs: 0, md: 15 },
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              alignItems: { xs: 'stretch', md: 'flex-start' }
            }}
          >
            <FormControl size="small" sx={{ minWidth: 180, width: '100%' }}>
              <InputLabel>Group by time</InputLabel>
              <Select
                value={timelineGroupBy}
                label="Group by time"
                onChange={(e) => setTimelineGroupBy(e.target.value)}
              >
                <MenuItem value="minute">By minute</MenuItem>
                <MenuItem value="hour">By hour</MenuItem>
                <MenuItem value="day">By day</MenuItem>
              </Select>
            </FormControl>
            {loading ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: '1fr' }, gap: 1.5 }}>
                <Skeleton variant="rounded" height={64} />
                <Skeleton variant="rounded" height={64} />
                <Skeleton variant="rounded" height={64} />
              </Box>
            ) : (
              <Card variant="outlined" sx={{ display: 'block', width: '100%', minWidth: 0 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: '1fr' },
                      gap: 1.5,
                      minWidth: 0
                    }}
                  >
                    <Card variant="outlined" sx={{ cursor: 'pointer', borderLeft: 3, borderLeftColor: 'primary.main', boxShadow: 'none', minWidth: 0 }} onClick={() => setStatusFilter('all')}>
                      <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                        <Typography variant="caption" color="text.secondary">Check-in Rate</Typography>
                        <Typography variant="body1" fontWeight={700} color="primary.main">{eventStats.checkInPercentage}%</Typography>
                      </CardContent>
                    </Card>
{peakBucket && (
                  <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'warning.main', boxShadow: 'none', minWidth: 0 }}>
                    <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                      <Typography variant="caption" color="text.secondary">Peak period</Typography>
                      <Typography variant="body2" fontWeight={600} color="warning.main" sx={{ wordBreak: 'break-word' }}>
                        {formatPeakPeriodLabel(peakBucket.rawDate, timelineGroupBy)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{peakBucket.checkIns} check-ins</Typography>
                    </CardContent>
                  </Card>
                )}
                    {timelineData.length > 0 && (
                      <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'info.main', boxShadow: 'none', minWidth: 0 }}>
                        <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                          <Typography variant="caption" color="text.secondary">Avg check-ins/hour</Typography>
                          <Typography variant="body1" fontWeight={700} color="info.main">
                            {Math.round(avgCheckInsPerHour)}
                          </Typography>
                        </CardContent>
                      </Card>
                    )}
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>

        {/* Check-in Details */}
        <Box sx={{ mt: 1, mb: 4 }}>
          <Typography variant="h6" fontWeight={600} color="primary.main" sx={{ mb: 2 }}>
            Check-in Details
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
            <Card
              variant="outlined"
              sx={{
                cursor: 'pointer',
                borderColor: statusFilter === 'all' ? 'primary.main' : 'divider',
                borderWidth: statusFilter === 'all' ? 2 : 1,
                bgcolor: statusFilter === 'all' ? 'action.selected' : 'background.paper',
                minWidth: 120
              }}
              onClick={() => setStatusFilter('all')}
            >
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">Total Guests</Typography>
                <Typography variant="h6" fontWeight={700}>{eventStats.totalGuests}</Typography>
              </CardContent>
            </Card>
            <Card
              variant="outlined"
              sx={{
                cursor: 'pointer',
                borderColor: statusFilter === 'checked_in' ? 'success.main' : 'divider',
                borderWidth: statusFilter === 'checked_in' ? 2 : 1,
                bgcolor: statusFilter === 'checked_in' ? 'action.selected' : 'background.paper',
                minWidth: 120
              }}
              onClick={() => setStatusFilter('checked_in')}
            >
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">Checked In</Typography>
                <Typography variant="h6" fontWeight={700} color="success.main">{eventStats.checkedInGuests}</Typography>
              </CardContent>
            </Card>
            <Card
              variant="outlined"
              sx={{
                cursor: 'pointer',
                borderColor: statusFilter === 'pending' ? 'warning.main' : 'divider',
                borderWidth: statusFilter === 'pending' ? 2 : 1,
                bgcolor: statusFilter === 'pending' ? 'action.selected' : 'background.paper',
                minWidth: 120
              }}
              onClick={() => setStatusFilter('pending')}
            >
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">Pending</Typography>
                <Typography variant="h6" fontWeight={700} color="warning.main">{eventStats.pendingGuests}</Typography>
              </CardContent>
            </Card>
            <TextField
            size="small"
            placeholder="Search guest name or email"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCheckInPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
            sx={{ ml: 'auto', minWidth: 320, width: 420 }}
            />
          </Box>
          {loading ? (
            <Skeleton variant="rounded" height={320} />
          ) : filteredAndSortedCheckIns.length === 0 ? (
            <Alert severity="info">
              No check-ins recorded yet.
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Showing {filteredAndSortedCheckIns.length} check-in(s).
                {selectedTimeBucket && ` Filtered to: ${selectedTimeBucket.label}.`}
              </Typography>
              {isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {paginatedCheckIns.map((checkin) => (
                    <Card key={checkin._id} variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'success.main' }}>
                      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="subtitle2" fontWeight={600} color="primary.main" sx={{ mb: 0.5 }}>
                          {checkin.guestName || EMPTY_LABEL}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {checkin.guestEmail || EMPTY_LABEL}
                        </Typography>
                        <Box sx={{ typography: 'body2', color: 'text.secondary', '& > span': { display: 'block' } }}>
                          <span>
                            Checked in: {checkin.checkedInAt
                              ? new Date(checkin.checkedInAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : EMPTY_LABEL}
                          </span>
                          {!isPortalView && (
                            <span>By: {checkin.checkedInBy || checkin.checkedInByUsername || EMPTY_LABEL}</span>
                          )}
                          <span>Gifts: {checkin.giftsCount > 0 ? <Typography component="span" variant="body2" color="success.main" fontWeight={600}>{checkin.giftsCount}</Typography> : '0'}</span>
                          {checkin.notes ? <span>Notes: {checkin.notes}</span> : null}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                  <TablePagination
                    component="div"
                    count={filteredAndSortedCheckIns.length}
                    page={checkInPage}
                    onPageChange={(_, newPage) => setCheckInPage(newPage)}
                    rowsPerPage={checkInRowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setCheckInRowsPerPage(parseInt(e.target.value, 10));
                      setCheckInPage(0);
                    }}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    labelRowsPerPage="Rows per page:"
                    sx={{ borderTop: 1, borderColor: 'divider' }}
                  />
                </Box>
              ) : (
                <>
                  <TableContainer component={Paper} elevation={1} sx={{ maxHeight: 440, overflowX: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default' }} onClick={() => handleSort('guestName')}>
                            Guest Name {sortBy === 'guestName' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default' }} onClick={() => handleSort('guestEmail')}>
                            Email {sortBy === 'guestEmail' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default' }} onClick={() => handleSort('checkedInAt')}>
                            Checked In At {sortBy === 'checkedInAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </TableCell>
                          {!isPortalView && (
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default' }}>Checked In By</TableCell>
                          )}
                          <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default' }} align="center">Gifts</TableCell>
                          <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default' }}>Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedCheckIns.map((checkin) => (
                          <TableRow key={checkin._id} hover>
                            <TableCell>{checkin.guestName || EMPTY_LABEL}</TableCell>
                            <TableCell>{checkin.guestEmail || EMPTY_LABEL}</TableCell>
                            <TableCell>
                              {checkin.checkedInAt
                                ? new Date(checkin.checkedInAt).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : EMPTY_LABEL
                              }
                            </TableCell>
                            {!isPortalView && (
                              <TableCell>{checkin.checkedInBy || checkin.checkedInByUsername || EMPTY_LABEL}</TableCell>
                            )}
                            <TableCell align="center">
                              {checkin.giftsCount > 0 ? (
                                <Typography variant="body2" color="success.main" fontWeight={600}>
                                  {checkin.giftsCount}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">0</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {checkin.notes || EMPTY_LABEL}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={filteredAndSortedCheckIns.length}
                    page={checkInPage}
                    onPageChange={(_, newPage) => setCheckInPage(newPage)}
                    rowsPerPage={checkInRowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setCheckInRowsPerPage(parseInt(e.target.value, 10));
                      setCheckInPage(0);
                    }}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    labelRowsPerPage="Rows per page:"
                    sx={{ borderTop: 1, borderColor: 'divider' }}
                  />
                </>
              )}
            </>
          )}
        </Box>

      </CardContent>
    </Card>
  );
};

export default EventAnalytics; 