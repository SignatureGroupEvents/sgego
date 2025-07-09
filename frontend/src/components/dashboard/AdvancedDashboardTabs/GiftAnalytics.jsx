import React, { useMemo, useState } from 'react';
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
  Divider
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, Tooltip as BarTooltip, ResponsiveContainer as BarResponsiveContainer, Cell as BarCell } from 'recharts';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import MuiTooltip from '@mui/material/Tooltip';

// Centralized fallback label
const UNKNOWN_LABEL = 'Unlabeled';

const GiftAnalytics = ({ guests = [], inventory = [] }) => {
  const theme = useTheme();
  
  // Debug logging for data validation
  console.log('🎁 GiftAnalytics Debug:', {
    guestCount: guests.length,
    inventoryCount: inventory.length,
    hasGuestData: guests.length > 0,
    hasInventoryData: inventory.length > 0,
    sampleGuest: guests[0] || 'No guests',
    sampleInventory: inventory[0] || 'No inventory'
  });

  // Error handling for missing data
  if (!guests || !inventory) {
    console.error('❌ GiftAnalytics Error: Missing required data props');
    return (
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" color="error" gutterBottom>
            ⚠️ Data Loading Error
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Unable to load gift analytics data. Please refresh the page or contact support.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Use theme palette colors for the pie/bar chart
  const PIE_COLORS = useMemo(() => [
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
  const [groupBy, setGroupBy] = useState('style');
  const [activeFilter, setActiveFilter] = useState(null);
  const [hiddenCategories, setHiddenCategories] = useState([]);

  const giftCounts = useMemo(() => {
    const countMap = {};
    guests.forEach((guest) => {
      const id = guest?.giftSelection?.inventoryId;
      if (!id) return;
      countMap[id] = (countMap[id] || 0) + 1;
    });

    const processedData = inventory.map((inv) => {
      const inventoryId = inv._id;
      const count = countMap[inventoryId] || 0;
      return {
        inventoryId,
        type: inv.type || UNKNOWN_LABEL,
        style: inv.style || UNKNOWN_LABEL,
        size: inv.size || '—',
        gender: inv.gender || '—',
        currentInventory: inv.currentInventory ?? '—',
        postEventCount: inv.postEventCount ?? '—',
        count,
      };
    });

    // Debug logging for data processing
    console.log('📊 Gift Counts Processing:', {
      totalGifts: processedData.length,
      giftsWithSelections: processedData.filter(item => item.count > 0).length,
      totalSelections: processedData.reduce((sum, item) => sum + item.count, 0),
      topGift: processedData.reduce((max, item) => item.count > max.count ? item : max, { count: 0 })
    });

    return processedData;
  }, [guests, inventory]);

  const chartData = useMemo(() => {
    const groupMap = {};
    giftCounts.forEach((item) => {
      const key = item[groupBy] || UNKNOWN_LABEL;
      if (!groupMap[key]) groupMap[key] = 0;
      groupMap[key] += item.count;
    });

    if (Object.keys(groupMap).length === 0) {
      giftCounts.forEach((item) => {
        const key = item[groupBy] || UNKNOWN_LABEL;
        if (!groupMap[key]) groupMap[key] = 0;
      });
    }

    const chartDataResult = Object.entries(groupMap).map(([name, value]) => ({
      name,
      value
    }));

    // Debug logging for chart data
    console.log('📈 Chart Data Processing:', {
      groupBy,
      totalCategories: chartDataResult.length,
      totalValue: chartDataResult.reduce((sum, item) => sum + item.value, 0),
      categories: chartDataResult.map(item => ({ name: item.name, value: item.value }))
    });

    return chartDataResult;
  }, [giftCounts, groupBy]);

  const allZero = useMemo(() => {
    return chartData.every((entry) => entry.value === 0);
  }, [chartData]);

  const displayChartData = allZero
    ? chartData.map(d => ({ ...d, value: 1, realValue: 0 }))
    : chartData.map(d => ({ ...d, realValue: d.value }));

  const filteredChartData = displayChartData.filter(d => !hiddenCategories.includes(d.name));

  const handlePieClick = (data, index) => {
    const clicked = displayChartData[index]?.name;
    if (!clicked) return;
    setActiveFilter(prev => (prev === clicked ? null : clicked));
    
    // Debug logging for user interactions
    console.log('🖱️ Pie Chart Click:', {
      clickedCategory: clicked,
      previousFilter: activeFilter,
      newFilter: activeFilter === clicked ? null : clicked
    });
  };

  const renderLegend = () => (
    <Box display="flex" alignItems="center" gap={2} mb={3} flexWrap="wrap">
      {displayChartData.map((entry, idx) => {
        const isHidden = hiddenCategories.includes(entry.name);
        return (
          <Box
            key={entry.name}
            aria-label={`Toggle ${entry.name}`}
            onClick={() => {
              setHiddenCategories(prev =>
                isHidden ? prev.filter(n => n !== entry.name) : [...prev, entry.name]
              );
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              opacity: isHidden ? 0.4 : 1,
              textDecoration: isHidden ? 'line-through' : 'none',
              mr: 2,
              userSelect: 'none',
            }}
          >
            <Box
              sx={{
                width: 16,
                height: 16,
                backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                borderRadius: '50%',
                display: 'inline-block',
                mr: 1,
                border: '1px solid #ccc',
              }}
            />
            <Typography variant="body1">{entry.name}</Typography>
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} mb={1} color="primary.main">
          Gift Inventory Analytics Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Track gift distribution, inventory levels, and guest preferences across all events
        </Typography>

        {/* Quick Summary Stats */}
        <Box mb={3} p={2} bgcolor="grey.50" borderRadius={2}>
          <Typography variant="subtitle2" fontWeight={600} mb={1} color="primary.main">
            📈 Quick Summary
          </Typography>
          <Box display="flex" gap={3} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary">Total Gift Items</Typography>
              <Typography variant="h6" fontWeight={700}>{inventory.length}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Total Guests</Typography>
              <Typography variant="h6" fontWeight={700}>{guests.length}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Gifts Selected</Typography>
              <Typography variant="h6" fontWeight={700}>
                {guests.filter(g => g?.giftSelection?.inventoryId).length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Selection Rate</Typography>
              <Typography variant="h6" fontWeight={700}>
                {guests.length > 0 ? `${Math.round((guests.filter(g => g?.giftSelection?.inventoryId).length / guests.length) * 100)}%` : '0%'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* SECTION 1: Detailed Inventory Table - Shows all gift items with selection counts */}
        <Box mb={4}>
          <Typography variant="subtitle1" fontWeight={600} mb={2} color="primary.main">
            📋 Inventory Summary Table
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Complete overview of all gift items, their current inventory levels, and how many times each item was selected by guests
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ minWidth: 600, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Gift Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Style</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Gender</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Current Inventory</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Selected Gifts</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Post Event Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {giftCounts.map((row, idx) => (
                  <TableRow key={row.inventoryId || idx} hover>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.style}</TableCell>
                    <TableCell>{row.size}</TableCell>
                    <TableCell>{row.gender}</TableCell>
                    <TableCell>{row.currentInventory}</TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell>{row.postEventCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        {/* SECTION 2: Chart Controls */}
        <Box mb={2} pb={2} display="flex" alignItems="center" justifyContent="space-between">
          <ButtonGroup variant="outlined" size="small">
            <Button
              variant={groupBy === 'style' ? 'contained' : 'outlined'}
              onClick={() => setGroupBy('style')}
            >
              Group by Style
            </Button>
            <Button
              variant={groupBy === 'type' ? 'contained' : 'outlined'}
              onClick={() => setGroupBy('type')}
            >
              Group by Gift Type
            </Button>
          </ButtonGroup>
          <MuiTooltip title="Reset Chart">
            <IconButton
              color="secondary"
              onClick={() => {
                setActiveFilter(null);
                setHiddenCategories([]);
              }}
              aria-label="Reset Chart"
            >
              <RefreshIcon />
            </IconButton>
          </MuiTooltip>
        </Box>
        {/* SECTION 3: Data Visualization Charts */}
        <Box mb={4}>
          <Box display="flex" flexDirection={{ xs: 'column', lg: 'row' }} gap={{ xs: 2, lg: 4 }} sx={{ minHeight: 400 }}>
            {/* CHART 1: Top Gifts Bar Chart - Shows most popular gifts */}
            <Box flex={1} minWidth={0}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }} color="primary.main">
                🏆 Top 5 Most Popular Gifts
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Horizontal bar chart showing the most frequently selected gifts by guests
              </Typography>
              <BarResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={(() => {
                    // Group and sort top 5 by groupBy
                    const groupMap = {};
                    giftCounts.forEach(item => {
                      const key = item[groupBy] || UNKNOWN_LABEL;
                      groupMap[key] = (groupMap[key] || 0) + item.count;
                    });
                    return Object.entries(groupMap)
                      .map(([name, value]) => ({ name, value }))
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 5);
                  })()}
                  layout="vertical"
                  margin={{ left: 0, right: 10, top: 10, bottom: 10 }}
                >
                  <XAxis type="number" hide domain={[0, 'dataMax']} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    interval={0}
                    tick={({ x, y, payload }) => {
                      const label = payload.value;
                      // Wrap at space or ellipsize if too long
                      let display = label;
                      if (label.length > 16) {
                        const idx = label.indexOf(' ', 10);
                        if (idx > 0) {
                          display = label.slice(0, idx) + '\n' + label.slice(idx + 1);
                        } else {
                          display = label.slice(0, 16) + '…';
                        }
                      }
                      return (
                        <text x={x} y={y} dy={4} fontSize={13} textAnchor="end">
                          {display.split('\n').map((line, i) => (
                            <tspan x={x} dy={i === 0 ? 0 : 14} key={i}>{line}</tspan>
                          ))}
                        </text>
                      );
                    }}
                  />
                  <Bar dataKey="value" fill={PIE_COLORS[0]} isAnimationActive={false} label={{ position: 'right', fill: '#333', fontWeight: 600 }}>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <BarCell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                  <BarTooltip formatter={v => v} />
                </BarChart>
              </BarResponsiveContainer>
            </Box>
            {/* Vertical Divider always visible (mobile: horizontal, desktop: vertical) */}
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
            {/* CHART 2: Distribution Pie Chart - Shows gift distribution by category */}
            <Box flex={1} minWidth={0}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }} color="primary.main">
                🥧 Gift Distribution by Category
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Pie chart showing how gifts are distributed across different categories (Style or Type)
              </Typography>
              {renderLegend()}
              <Box
                sx={{
                  '& svg': {
                    outline: 'none !important'
                  },
                  '& path': {
                    outline: 'none !important'
                  },
                  '& *': {
                    outline: 'none !important'
                  }
                }}
              >
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={filteredChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      label={({ name, realValue }) => `${name}: ${realValue}`}
                      isAnimationActive={false}
                    >
                      {filteredChartData.map((entry, idx) => (
                        <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(_, __, props) => props.payload.realValue ?? 0} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default GiftAnalytics;