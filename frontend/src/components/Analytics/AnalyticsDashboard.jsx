import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Checkbox,
  ListItemText,
  OutlinedInput,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip as RechartsTooltip,
//   Legend,
//   ResponsiveContainer,
//   PieChart,
//   Pie,
//   Cell,
//   LineChart,
//   Line
// } from 'recharts';
import {
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Category as CategoryIcon,
  ExpandMore as ExpandMoreIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { getOverviewAnalytics, exportAnalytics } from '../../services/analytics';

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    eventType: '',
    giftTypes: [],
    giftStyles: [],
    groupBy: 'month'
  });
  const [availableTypes, setAvailableTypes] = useState([]);
  const [availableStyles, setAvailableStyles] = useState([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Generate years for filter (current year + 5 years back)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    fetchAnalytics();
  }, [filters]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getOverviewAnalytics(filters);
      setAnalytics(response.analytics);
      
      // Extract unique types and styles for filters
      const types = [...new Set(response.analytics.giftDistribution.map(item => item.type))];
      const styles = [...new Set(response.analytics.giftDistribution.map(item => item.style))];
      setAvailableTypes(types);
      setAvailableStyles(styles);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      await exportAnalytics(filters, format);
    } catch (err) {
      setError('Failed to export analytics');
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (event) => {
    const value = event.target.value;
    setFilters(prev => ({ ...prev, giftTypes: typeof value === 'string' ? value.split(',') : value }));
  };

  const handleStyleChange = (event) => {
    const value = event.target.value;
    setFilters(prev => ({ ...prev, giftStyles: typeof value === 'string' ? value.split(',') : value }));
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (num) => {
    return `${Math.round(num * 100) / 100}%`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Alert severity="info">
        No analytics data available. Please ensure you have events with check-ins.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ color: '#1a1a1a', mb: 1 }}>
            Analytics Overview
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Comprehensive insights across all events and gift performance
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Export CSV">
            <IconButton onClick={() => handleExport('csv')} color="primary">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Excel">
            <IconButton onClick={() => handleExport('excel')} color="primary">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchAnalytics} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Enhanced Filters */}
      <Accordion defaultExpanded sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon /> Advanced Filters
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Year</InputLabel>
                <Select
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  label="Year"
                >
                  {years.map(year => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={filters.eventType}
                  onChange={(e) => handleFilterChange('eventType', e.target.value)}
                  label="Event Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="corporate">Corporate</MenuItem>
                  <MenuItem value="wedding">Wedding</MenuItem>
                  <MenuItem value="birthday">Birthday</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Gift Types</InputLabel>
                <Select
                  multiple
                  value={filters.giftTypes}
                  onChange={handleTypeChange}
                  input={<OutlinedInput label="Gift Types" />}
                  renderValue={(selected) => selected.join(', ')}
                >
                  {availableTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      <Checkbox checked={filters.giftTypes.indexOf(type) > -1} />
                      <ListItemText primary={type} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Gift Styles</InputLabel>
                <Select
                  multiple
                  value={filters.giftStyles}
                  onChange={handleStyleChange}
                  input={<OutlinedInput label="Gift Styles" />}
                  renderValue={(selected) => selected.join(', ')}
                >
                  {availableStyles.map((style) => (
                    <MenuItem key={style} value={style}>
                      <Checkbox checked={filters.giftStyles.indexOf(style) > -1} />
                      <ListItemText primary={style} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Overall Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h4" color="primary" fontWeight={700}>
              {formatNumber(analytics.overallStats.totalEvents)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total Events
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h4" color="success.main" fontWeight={700}>
              {formatNumber(analytics.overallStats.totalGiftsDistributed)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Gifts Distributed
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h4" color="info.main" fontWeight={700}>
              {formatNumber(analytics.overallStats.uniqueGiftTypes)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Unique Gift Types
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h4" color="warning.main" fontWeight={700}>
              {Math.round(analytics.overallStats.avgGiftsPerGuest * 100) / 100}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Avg Gifts/Guest
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Top Performing Gifts" icon={<AssessmentIcon />} />
          <Tab label="Highest Check-in Events" icon={<EventIcon />} />
          <Tab label="Category Analysis" icon={<CategoryIcon />} />
          <Tab label="Trends" icon={<TrendingUpIcon />} />
        </Tabs>
      </Card>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Top Performing Gift Items
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Style</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Gender</TableCell>
                  <TableCell align="right">Total Distributed</TableCell>
                  <TableCell align="right">Events</TableCell>
                  <TableCell align="right">Unique Guests</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analytics.topPerformers.slice(0, 10).map((item, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>{item.style}</TableCell>
                    <TableCell>{item.size}</TableCell>
                    <TableCell>{item.gender}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main" fontWeight={600}>
                        {formatNumber(item.totalDistributed)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{item.eventCount}</TableCell>
                    <TableCell align="right">{item.uniqueGuestCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Gift Distribution Chart - Temporarily commented out */}
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Gift Distribution by Type (Charts temporarily disabled)
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Charts are temporarily disabled to resolve rendering issues.
            </Typography>
          </Card>
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Events with Highest Check-in Rates
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Event Name</TableCell>
                  <TableCell>Contract #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Total Guests</TableCell>
                  <TableCell align="right">Checked In</TableCell>
                  <TableCell align="right">Check-in Rate</TableCell>
                  <TableCell align="right">Gifts Distributed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analytics.eventPerformance
                  .sort((a, b) => (b.checkedInGuests / b.totalGuests) - (a.checkedInGuests / a.totalGuests))
                  .slice(0, 10)
                  .map((event, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{event.eventName}</TableCell>
                    <TableCell>{event.eventContractNumber}</TableCell>
                    <TableCell>
                      {new Date(event.eventDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">{event.totalGuests}</TableCell>
                    <TableCell align="right">{event.checkedInGuests}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${Math.round((event.checkedInGuests / event.totalGuests) * 100)}%`}
                        color={event.checkedInGuests / event.totalGuests > 0.8 ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main" fontWeight={600}>
                        {formatNumber(event.totalGiftsDistributed)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Category Performance Summary
          </Typography>
          <Grid container spacing={3}>
            {Object.entries(analytics.categorySummary).map(([category, data], index) => (
              <Grid item xs={12} md={6} key={category}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {category}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="textSecondary">
                        Total Distributed
                      </Typography>
                      <Typography variant="h5" color="primary" fontWeight={600}>
                        {formatNumber(data.totalDistributed)}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="textSecondary">
                        Unique Items
                      </Typography>
                      <Typography variant="h5" color="info.main" fontWeight={600}>
                        {data.uniqueItems}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="textSecondary">
                        Avg per Item
                      </Typography>
                      <Typography variant="h5" color="success.main" fontWeight={600}>
                        {Math.round(data.avgDistributionPerItem * 100) / 100}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="textSecondary">
                        Top Item
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {data.topItems[0]?.style || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Category Pie Chart - Temporarily commented out */}
          <Card sx={{ p: 2, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Distribution by Category (Charts temporarily disabled)
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Charts are temporarily disabled to resolve rendering issues.
            </Typography>
          </Card>
        </Box>
      )}

      {activeTab === 3 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Distribution Trends Over Time (Charts temporarily disabled)
          </Typography>
          <Card sx={{ p: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Charts are temporarily disabled to resolve rendering issues.
            </Typography>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default AnalyticsDashboard; 