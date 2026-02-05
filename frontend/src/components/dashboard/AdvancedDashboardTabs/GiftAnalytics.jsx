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
  TablePagination,
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
  Chip,
  Collapse,
  CircularProgress,
  Alert
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, Tooltip as BarTooltip, ResponsiveContainer as BarResponsiveContainer, Cell as BarCell } from 'recharts';
import AnalyticsPieChart from '../../analytics/charts/AnalyticsPieChart';
import AnalyticsBarChart from '../../analytics/charts/AnalyticsBarChart';
import { useAnalyticsApi } from '../../../contexts/AnalyticsApiContext';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import MuiTooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';

// Centralized fallback label
const UNKNOWN_LABEL = 'Unlabeled';

const GiftAnalytics = ({ event, guests = [], inventory = [] }) => {
  const theme = useTheme();
  const getAnalytics = useAnalyticsApi();
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(null);
  
  // Debug logging for data validation (commented out to reduce console noise)
  // console.log('🎁 GiftAnalytics Debug:', {
  //   guestCount: guests.length,
  //   inventoryCount: inventory.length,
  //   hasGuestData: guests.length > 0,
  //   hasInventoryData: inventory.length > 0,
  //   sampleGuest: guests[0] || 'No guests',
  //   sampleInventory: inventory[0] || 'No inventory'
  // });

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
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedSegments, setSelectedSegments] = useState([]); // Track selected pie chart segments (array for multi-select)
  const [chartExpanded, setChartExpanded] = useState(true);
  // Pie chart specific grouping and filters - default to 'category' to show chart automatically
  const [pieChartGroupBy, setPieChartGroupBy] = useState('category'); // 'none', 'category', 'brand', 'product'
  const [pieChartSelectedType, setPieChartSelectedType] = useState('');
  const [pieChartSelectedStyle, setPieChartSelectedStyle] = useState('');
  const [pieChartSelectedProduct, setPieChartSelectedProduct] = useState('');

  // Fetch analytics data for realtime gift distribution
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!event?._id) return;
      
      setAnalyticsLoading(true);
      try {
        const data = await getAnalytics(event._id);
        setAnalytics(data);
      } catch (err) {
        console.error('Error fetching gift analytics:', err);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
    
    // Refresh every 30 seconds for live updates
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [event?._id, getAnalytics]);

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
        product: inv.product || UNKNOWN_LABEL,
        size: inv.size || '—',
        gender: inv.gender || '—',
        currentInventory: inv.currentInventory ?? '—',
        postEventCount: inv.postEventCount ?? '—',
        count,
      };
    });

    // Debug logging for data processing (commented out to reduce console noise)
    // console.log('📊 Gift Counts Processing:', {
    //   totalGifts: processedData.length,
    //   giftsWithSelections: processedData.filter(item => item.count > 0).length,
    //   totalSelections: processedData.reduce((sum, item) => sum + item.count, 0),
    //   topGift: processedData.reduce((max, item) => item.count > max.count ? item : max, { count: 0 })
    // });

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

    // Debug logging for chart data (commented out to reduce console noise)
    // console.log('📈 Chart Data Processing:', {
    //   groupBy,
    //   totalCategories: chartDataResult.length,
    //   totalValue: chartDataResult.reduce((sum, item) => sum + item.value, 0),
    //   categories: chartDataResult.map(item => ({ name: item.name, value: item.value }))
    // });

    return chartDataResult;
  }, [giftCounts, groupBy]);

  const allZero = useMemo(() => {
    return chartData.every((entry) => entry.value === 0);
  }, [chartData]);

  // Prepare inventory utilization data
  const utilizationData = useMemo(() => {
    const distributedMap = new Map();
    giftCounts.forEach(item => {
      if (item.inventoryId && item.count > 0) {
        const invId = item.inventoryId.toString();
        distributedMap.set(invId, (distributedMap.get(invId) || 0) + item.count);
      }
    });

    return inventory
      .map(item => {
        const invId = item._id?.toString();
        const distributed = distributedMap.get(invId) || 0;
        const currentInventory = typeof item.currentInventory === 'number' ? item.currentInventory : 0;
        const total = distributed + currentInventory;
        const utilizationRate = total > 0 ? (distributed / total) * 100 : 0;

        return {
          name: `${item.style || 'N/A'} ${item.product ? `- ${item.product}` : ''}`.trim(),
          distributed,
          remaining: currentInventory,
          total,
          utilizationRate: Math.round(utilizationRate * 100) / 100
        };
      })
      .filter(item => item.total > 0)
      .sort((a, b) => b.utilizationRate - a.utilizationRate)
      .slice(0, 10); // Top 10 by utilization
  }, [inventory, giftCounts]);

  const displayChartData = allZero
    ? chartData.map(d => ({ ...d, value: 1, realValue: 0 }))
    : chartData.map(d => ({ ...d, realValue: d.value }));

  const filteredChartData = displayChartData.filter(d => !hiddenCategories.includes(d.name));

  // Get all available filter options from both inventory and analytics data
  const pieChartFilterOptions = useMemo(() => {
    const types = new Set();
    const styles = new Set();
    const products = new Set();
    
    // Add options from inventory
    inventory.forEach(item => {
      if (item.type) types.add(item.type);
      if (item.style) styles.add(item.style);
      if (item.product) products.add(item.product);
    });
    
    // Add options from giftCounts (guest selections)
    giftCounts.forEach(item => {
      if (item.type) types.add(item.type);
      if (item.style) styles.add(item.style);
      if (item.product) products.add(item.product);
    });
    
    // Add options from analytics (realtime distributed gifts)
    if (analytics?.rawGiftDistribution && analytics.rawGiftDistribution.length > 0) {
      analytics.rawGiftDistribution.forEach(item => {
        if (item.type) types.add(item.type);
        if (item.style) styles.add(item.style);
        if (item.product) products.add(item.product);
      });
    } else if (analytics?.giftDistribution && Object.keys(analytics.giftDistribution).length > 0) {
      Object.values(analytics.giftDistribution).forEach(item => {
        if (item.type) types.add(item.type);
        if (item.style) styles.add(item.style);
        if (item.product) products.add(item.product);
      });
    }
    
    return {
      types: Array.from(types).sort(),
      styles: Array.from(styles).sort(),
      products: Array.from(products).sort()
    };
  }, [inventory, giftCounts, analytics]);

  // Get available brands based on selected category (cascading filter)
  const availableBrands = useMemo(() => {
    if (!pieChartSelectedType) return pieChartFilterOptions.styles;
    
    const brands = new Set();
    
    // From inventory
    inventory
      .filter(item => item.type === pieChartSelectedType)
      .forEach(item => {
        if (item.style) brands.add(item.style);
      });
    
    // From giftCounts
    giftCounts
      .filter(item => item.type === pieChartSelectedType)
      .forEach(item => {
        if (item.style) brands.add(item.style);
      });
    
    // From analytics
    let sourceData = analytics?.rawGiftDistribution;
    if (!sourceData || sourceData.length === 0) {
      if (analytics?.giftDistribution && Object.keys(analytics.giftDistribution).length > 0) {
        sourceData = Object.values(analytics.giftDistribution);
      }
    }
    
    if (sourceData && sourceData.length > 0) {
      sourceData
        .filter(item => item.type === pieChartSelectedType)
        .forEach(item => {
          if (item.style) brands.add(item.style);
        });
    }
    
    return Array.from(brands).sort();
  }, [pieChartSelectedType, inventory, giftCounts, analytics, pieChartFilterOptions.styles]);

  // Get available products based on selected category and brand (cascading filter)
  const availableProducts = useMemo(() => {
    if (!pieChartSelectedType && !pieChartSelectedStyle) {
      return pieChartFilterOptions.products;
    }
    
    const products = new Set();
    
    // From inventory
    inventory
      .filter(item => {
        if (pieChartSelectedType && item.type !== pieChartSelectedType) return false;
        if (pieChartSelectedStyle && item.style !== pieChartSelectedStyle) return false;
        return true;
      })
      .forEach(item => {
        if (item.product) products.add(item.product);
      });
    
    // From giftCounts
    giftCounts
      .filter(item => {
        if (pieChartSelectedType && item.type !== pieChartSelectedType) return false;
        if (pieChartSelectedStyle && item.style !== pieChartSelectedStyle) return false;
        return true;
      })
      .forEach(item => {
        if (item.product) products.add(item.product);
      });
    
    // From analytics
    let sourceData = analytics?.rawGiftDistribution;
    if (!sourceData || sourceData.length === 0) {
      if (analytics?.giftDistribution && Object.keys(analytics.giftDistribution).length > 0) {
        sourceData = Object.values(analytics.giftDistribution);
      }
    }
    
    if (sourceData && sourceData.length > 0) {
      sourceData
        .filter(item => {
          if (pieChartSelectedType && item.type !== pieChartSelectedType) return false;
          if (pieChartSelectedStyle && item.style !== pieChartSelectedStyle) return false;
          return true;
        })
        .forEach(item => {
          if (item.product) products.add(item.product);
        });
    }
    
    return Array.from(products).sort();
  }, [pieChartSelectedType, pieChartSelectedStyle, inventory, giftCounts, analytics, pieChartFilterOptions.products]);

  // Get filtered gift distribution data from analytics (realtime data)
  const pieChartFilteredGiftData = useMemo(() => {
    // Try rawGiftDistribution first, then fallback to giftDistribution
    let sourceData = analytics?.rawGiftDistribution;
    
    if (!sourceData || sourceData.length === 0) {
      // Fallback: convert giftDistribution object to array
      if (analytics?.giftDistribution && Object.keys(analytics.giftDistribution).length > 0) {
        sourceData = Object.values(analytics.giftDistribution).map(item => ({
          type: item.type,
          style: item.style,
          product: item.product || '',
          totalQuantity: item.totalQuantity || 0
        }));
      } else {
        return [];
      }
    }

    let filtered = [...sourceData];
    
    // Apply filters
    if (pieChartSelectedType) {
      filtered = filtered.filter(item => item.type === pieChartSelectedType);
    }
    if (pieChartSelectedStyle) {
      filtered = filtered.filter(item => item.style === pieChartSelectedStyle);
    }
    if (pieChartSelectedProduct) {
      filtered = filtered.filter(item => {
        const itemProduct = (item.product || '').trim();
        const selectedProductTrimmed = pieChartSelectedProduct.trim();
        return itemProduct === selectedProductTrimmed || 
               (itemProduct === '' && selectedProductTrimmed === '');
      });
    }
    
    return filtered;
  }, [analytics, pieChartSelectedType, pieChartSelectedStyle, pieChartSelectedProduct]);

  // Prepare distribution data for pie chart based on pieChartGroupBy using realtime analytics
  const pieChartDistributionData = useMemo(() => {
    if (pieChartGroupBy === 'none') return [];

    const groupMap = {};
    pieChartFilteredGiftData.forEach((item) => {
      let key;
      if (pieChartGroupBy === 'category') {
        key = item.type || UNKNOWN_LABEL;
      } else if (pieChartGroupBy === 'brand') {
        key = item.style || UNKNOWN_LABEL;
      } else if (pieChartGroupBy === 'product') {
        key = item.product || UNKNOWN_LABEL;
      } else {
        return;
      }
      if (!groupMap[key]) groupMap[key] = 0;
      groupMap[key] += item.totalQuantity || 0;
    });

    const rawData = Object.entries(groupMap)
      .map(([name, value]) => ({
        name,
        value: value || 0
      }))
      .sort((a, b) => b.value - a.value);

    // Check if all values are zero
    const pieChartAllZero = rawData.length > 0 && rawData.every(item => item.value === 0);

    // If allZero, show all items with value: 1 for visualization, otherwise only show positive values
    if (pieChartAllZero) {
      return rawData.map(item => ({
        name: item.name,
        value: 1, // Equal slices for visualization
        realValue: 0 // Track the actual zero value
      }));
    } else {
      return rawData
        .filter(item => item.value > 0) // Only show items with positive values
        .map(item => ({
          name: item.name,
          value: item.value,
          realValue: item.value
        }));
    }
  }, [pieChartFilteredGiftData, pieChartGroupBy]);

  const handlePieClick = (data, index) => {
    const clicked = displayChartData[index]?.name;
    if (!clicked) return;
    setActiveFilter(prev => (prev === clicked ? null : clicked));
    
    // Debug logging for user interactions (commented out to reduce console noise)
    // console.log('🖱️ Pie Chart Click:', {
    //   clickedCategory: clicked,
    //   previousFilter: activeFilter,
    //   newFilter: activeFilter === clicked ? null : clicked
    // });
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

  // Export functions
  const exportGiftDataToCSV = () => {
    if (!giftCounts || giftCounts.length === 0) return;

    const sections = [];
    
    // Section 0: Export Information
    sections.push('=== EXPORT INFORMATION ===');
    sections.push(`Exported On,"${new Date().toLocaleString()}"`);
    sections.push(`Export Date,"${new Date().toLocaleDateString()}"`);
    sections.push(`Export Time,"${new Date().toLocaleTimeString()}"`);
    sections.push('');
    
    // Section 1: Gift Summary
    sections.push('=== GIFT SUMMARY ===');
    sections.push(`Total Gift Items,${inventory.length}`);
    sections.push(`Total Guests,${guests.length}`);
    sections.push(`Gifts Selected,${guests.filter(g => g?.giftSelection?.inventoryId).length}`);
    const selectionRate = guests.length > 0 
      ? Math.round((guests.filter(g => g?.giftSelection?.inventoryId).length / guests.length) * 100)
      : 0;
    sections.push(`Selection Rate,${selectionRate}%`);
    sections.push(`Grouped By,"${groupBy === 'style' ? 'Style' : 'Gift Type'}"`);
    sections.push('');
    
    // Section 2: Gift Inventory Summary
    sections.push('=== GIFT INVENTORY SUMMARY ===');
    const headers = ['Gift Type', 'Style', 'Size', 'Gender', 'Current Inventory', 'Selected Gifts', 'Post Event Count'];
    sections.push(headers.join(','));
    
    const rows = giftCounts.map(item => [
      (item.type || '').replace(/"/g, '""'),
      (item.style || '').replace(/"/g, '""'),
      (item.size || '').replace(/"/g, '""'),
      (item.gender || '').replace(/"/g, '""'),
      item.currentInventory !== '—' ? item.currentInventory : '',
      item.count || 0,
      item.postEventCount !== '—' ? item.postEventCount : ''
    ]);
    
    rows.forEach(row => {
      sections.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    });
    sections.push('');
    
    // Section 3: Gift Distribution
    sections.push(`=== GIFT DISTRIBUTION BY ${groupBy.toUpperCase()} ===`);
    sections.push('Category,Count');
    chartData.forEach(item => {
      sections.push(`"${(item.name || '').replace(/"/g, '""')}",${item.value || 0}`);
    });

    const csvContent = sections.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gift_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportMenuAnchor(null);
  };

  const exportGiftDataToExcel = async () => {
    setExporting(true);
    try {
      if (!giftCounts || giftCounts.length === 0) return;

      const sections = [];
      
      // Section 0: Export Information
      sections.push('=== EXPORT INFORMATION ===');
      sections.push(`Exported On\t${new Date().toLocaleString()}`);
      sections.push(`Export Date\t${new Date().toLocaleDateString()}`);
      sections.push(`Export Time\t${new Date().toLocaleTimeString()}`);
      sections.push('');
      
      // Section 1: Gift Summary
      sections.push('=== GIFT SUMMARY ===');
      sections.push(`Total Gift Items\t${inventory.length}`);
      sections.push(`Total Guests\t${guests.length}`);
      sections.push(`Gifts Selected\t${guests.filter(g => g?.giftSelection?.inventoryId).length}`);
      const selectionRate = guests.length > 0 
        ? Math.round((guests.filter(g => g?.giftSelection?.inventoryId).length / guests.length) * 100)
        : 0;
      sections.push(`Selection Rate\t${selectionRate}%`);
      sections.push(`Grouped By\t${groupBy === 'style' ? 'Style' : 'Gift Type'}`);
      sections.push('');
      
      // Section 2: Gift Inventory Summary
      sections.push('=== GIFT INVENTORY SUMMARY ===');
      const headers = ['Gift Type', 'Style', 'Size', 'Gender', 'Current Inventory', 'Selected Gifts', 'Post Event Count'];
      sections.push(headers.join('\t'));
      
      const rows = giftCounts.map(item => [
        item.type || '',
        item.style || '',
        item.size || '',
        item.gender || '',
        item.currentInventory !== '—' ? item.currentInventory : '',
        item.count || 0,
        item.postEventCount !== '—' ? item.postEventCount : ''
      ]);
      
      rows.forEach(row => {
        sections.push(row.join('\t'));
      });
      sections.push('');
      
      // Section 3: Gift Distribution
      sections.push(`=== GIFT DISTRIBUTION BY ${groupBy.toUpperCase()} ===`);
      sections.push('Category\tCount');
      chartData.forEach(item => {
        sections.push(`${item.name || ''}\t${item.value || 0}`);
      });

      const excelContent = sections.join('\n');

      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `gift_analytics_${new Date().toISOString().split('T')[0]}.xls`);
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

  // Show loading state while analytics are being fetched initially
  if (analyticsLoading && !analytics) {
    return (
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={60} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading Gift Analytics...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight={700} mb={1} color="primary.main">
              Gift Inventory Analytics Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track gift distribution, inventory levels, and guest preferences across all events
            </Typography>
          </Box>
          <MuiTooltip title="Export Gift Analytics">
            <IconButton
              color="primary"
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              disabled={exporting || !giftCounts || giftCounts.length === 0}
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
          <MenuItem onClick={exportGiftDataToCSV} disabled={exporting || !giftCounts?.length}>
            Export Gift Data as CSV
          </MenuItem>
          <MenuItem onClick={exportGiftDataToExcel} disabled={exporting || !giftCounts?.length}>
            Export Gift Data as Excel
          </MenuItem>
        </Menu>

        {/* Analytics Error Alert */}
        {analyticsError && (
          <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setAnalyticsError(null)}>
            {analyticsError}
          </Alert>
        )}

        {/* Quick Summary Stats */}
        {(() => {
          // Calculate from analytics data (realtime) - prioritize analytics over guests prop
          // Use the same logic as the Gift Selection Rate Visualization section for consistency
          let totalGuests = guests.length;
          let guestsWithGifts = 0;
          
          // Calculate from analytics distributed gifts data (realtime)
          if (analytics) {
            // Get total guests from analytics if available
            if (analytics.guestStats?.totalGuests) {
              totalGuests = analytics.guestStats.totalGuests;
            } else if (analytics.eventStats?.totalGuests) {
              totalGuests = analytics.eventStats.totalGuests;
            } else if (analytics.giftSummary?.totalGuests) {
              totalGuests = analytics.giftSummary.totalGuests;
            }
            
            // Calculate guests with gifts from distributed gifts data
            // This is the most reliable source for realtime data
            if (analytics.rawGiftDistribution && analytics.rawGiftDistribution.length > 0) {
              // Count total distributed gifts
              const totalDistributed = analytics.rawGiftDistribution.reduce(
                (sum, item) => sum + (item.totalQuantity || 0), 
                0
              );
              
              // If we have distributed gifts, we know at least some guests selected
              if (totalDistributed > 0) {
                // Try to get exact count from analytics first
                if (analytics.guestStats?.guestsWithGifts !== undefined) {
                  guestsWithGifts = analytics.guestStats.guestsWithGifts;
                } else if (analytics.eventStats?.guestsWithGifts !== undefined) {
                  guestsWithGifts = analytics.eventStats.guestsWithGifts;
                } else if (analytics.giftSummary?.guestsWithGifts !== undefined) {
                  guestsWithGifts = analytics.giftSummary.guestsWithGifts;
                } else {
                  // Fallback: use guests prop if it has data
                  const guestsFromProps = guests.filter(g => g?.giftSelection?.inventoryId).length;
                  // If guests prop shows 0 but we have distributed gifts, use distributed count as minimum
                  // (This handles the case where guests prop hasn't updated yet)
                  guestsWithGifts = guestsFromProps > 0 ? guestsFromProps : totalDistributed;
                }
              }
            } else if (analytics.giftDistribution && Object.keys(analytics.giftDistribution).length > 0) {
              // Fallback to giftDistribution object
              const totalDistributed = Object.values(analytics.giftDistribution).reduce(
                (sum, item) => sum + (item.totalQuantity || 0), 
                0
              );
              if (totalDistributed > 0) {
                const guestsFromProps = guests.filter(g => g?.giftSelection?.inventoryId).length;
                guestsWithGifts = guestsFromProps > 0 ? guestsFromProps : totalDistributed;
              }
            }
          }
          
          // If still 0, try guests prop as final fallback
          if (guestsWithGifts === 0) {
            guestsWithGifts = guests.filter(g => g?.giftSelection?.inventoryId).length;
          }
          
          const selectionRate = totalGuests > 0 
            ? Math.round((guestsWithGifts / totalGuests) * 100)
            : 0;
          
          return (
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
                  <Typography variant="h6" fontWeight={700}>{totalGuests}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Gifts Selected</Typography>
                  <Typography variant="h6" fontWeight={700}>{guestsWithGifts}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Selection Rate</Typography>
                  <Typography variant="h6" fontWeight={700}>{selectionRate}%</Typography>
                </Box>
              </Box>
            </Box>
          );
        })()}

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
                {giftCounts
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, idx) => (
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
            <TablePagination
              component="div"
              count={giftCounts.length}
              page={page}
              onPageChange={(event, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              labelRowsPerPage="Rows per page:"
            />
          </TableContainer>
        </Box>
        {/* SECTION 2: Distribution Pie Chart with Filters */}
        <Box mb={4}>
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 2,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'grey.100' }
            }}
            onClick={() => setChartExpanded(!chartExpanded)}
          >
            <Typography variant="subtitle1" fontWeight={600} color="primary.main">
              🥧 Distribution Chart
            </Typography>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setChartExpanded(!chartExpanded); }}>
              {chartExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          <Collapse in={chartExpanded}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, mt: 1 }}>
              {/* Distribution By Selector and Filters */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {/* Distribution By Dropdown */}
                <Grid size={{ xs: 12, sm: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Distribution By</InputLabel>
                    <Select
                      value={pieChartGroupBy}
                      onChange={(e) => {
                        setPieChartGroupBy(e.target.value);
                        // Reset filters when changing groupBy
                        setPieChartSelectedType('');
                        setPieChartSelectedStyle('');
                        setPieChartSelectedProduct('');
                        setSelectedSegments([]);
                      }}
                      label="Distribution By"
                    >
                      <MenuItem value="none">All Items</MenuItem>
                      <MenuItem value="category">By Category</MenuItem>
                      <MenuItem value="brand">By Brand</MenuItem>
                      <MenuItem value="product">By Product</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Contextual Filters - Only show when not grouped by that field */}
                {pieChartGroupBy !== 'category' && (
                  <Grid size={{ xs: 12, sm: pieChartGroupBy === 'none' ? 3 : 4.5 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={pieChartSelectedType}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setPieChartSelectedType(newType);
                          // Reset dependent filters when category changes
                          if (newType !== pieChartSelectedType) {
                            setPieChartSelectedStyle('');
                            setPieChartSelectedProduct('');
                          }
                        }}
                        label="Category"
                      >
                        <MenuItem value="">
                          <em>All Categories</em>
                        </MenuItem>
                        {pieChartFilterOptions.types.map(type => (
                          <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {pieChartGroupBy !== 'brand' && (
                  <Grid size={{ xs: 12, sm: pieChartGroupBy === 'none' ? 3 : 4.5 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Brand</InputLabel>
                      <Select
                        value={pieChartSelectedStyle}
                        onChange={(e) => {
                          setPieChartSelectedStyle(e.target.value);
                          if (e.target.value !== pieChartSelectedStyle) {
                            setPieChartSelectedProduct('');
                          }
                        }}
                        label="Brand"
                      >
                        <MenuItem value="">
                          <em>All Brands</em>
                        </MenuItem>
                        {Array.from(new Set([
                          ...giftCounts
                            .filter(item => !pieChartSelectedType || item.type === pieChartSelectedType)
                            .map(item => item.style),
                          ...(pieChartFilteredGiftData || [])
                            .filter(item => !pieChartSelectedType || item.type === pieChartSelectedType)
                            .map(item => item.style)
                        ].filter(Boolean))).sort().map(style => (
                          <MenuItem key={style} value={style}>{style}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {pieChartGroupBy !== 'product' && (
                  <Grid size={{ xs: 12, sm: pieChartGroupBy === 'none' ? 3 : 4.5 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Product</InputLabel>
                      <Select
                        value={pieChartSelectedProduct}
                        onChange={(e) => setPieChartSelectedProduct(e.target.value)}
                        label="Product"
                      >
                        <MenuItem value="">
                          <em>All Products</em>
                        </MenuItem>
                        {availableProducts.map(product => (
                          <MenuItem key={product} value={product}>{product}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>

              {/* Pie Chart */}
              {pieChartGroupBy === 'none' ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Select a grouping option to view the distribution chart.
                  </Typography>
                </Box>
              ) : pieChartDistributionData.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No gifts have been distributed yet for the selected grouping and filters.
                  </Typography>
                </Box>
              ) : (
                <>
                  <AnalyticsPieChart
                    data={pieChartDistributionData}
                    dataKey="value"
                    nameKey="name"
                    height={300}
                    innerRadius={60}
                    outerRadius={90}
                    loading={false}
                    showLabel={true}
                    showLegend={true}
                    colors={PIE_COLORS}
                    selectedSegments={selectedSegments}
                    onSegmentClick={(data) => {
                      if (data && data.name) {
                        setSelectedSegments(prev => {
                          if (prev.includes(data.name)) {
                            return prev.filter(name => name !== data.name);
                          } else {
                            return [...prev, data.name];
                          }
                        });
                      }
                    }}
                  />
                  {/* Full names list below chart for reference with selection indicator */}
                  <Box sx={{ mt: 2, maxHeight: 120, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip
                      label="Clear All"
                      size="small"
                      onClick={() => setSelectedSegments([])}
                      color={selectedSegments.length === 0 ? 'primary' : 'default'}
                      sx={{ 
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        fontWeight: selectedSegments.length === 0 ? 600 : 400
                      }}
                    />
                      {pieChartDistributionData.map((item, idx) => {
                        const isSelected = selectedSegments.includes(item.name);
                        // Show realValue in chip if available, otherwise show value
                        const displayValue = item.realValue !== undefined ? item.realValue : item.value;
                        return (
                          <Chip
                            key={idx}
                            label={`${item.name}: ${displayValue}`}
                            size="small"
                            onClick={() => {
                              setSelectedSegments(prev => {
                                if (prev.includes(item.name)) {
                                  return prev.filter(name => name !== item.name);
                                } else {
                                  return [...prev, item.name];
                                }
                              });
                            }}
                            color={isSelected ? 'primary' : 'default'}
                            sx={{ 
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              fontWeight: isSelected ? 600 : 400,
                              opacity: selectedSegments.length === 0 || isSelected ? 1 : 0.5
                            }}
                          />
                        );
                      })}
                  </Box>
                </>
              )}
            </Box>
          </Collapse>
        </Box>

        {/* SECTION 4: Gift Selection Rate Visualization */}
        {(() => {
          // Calculate from analytics data (realtime) - prioritize analytics over guests prop
          let totalGuests = guests.length;
          let guestsWithGifts = 0;
          
          // Calculate from analytics distributed gifts data (realtime)
          if (analytics) {
            // Get total guests from analytics if available
            if (analytics.guestStats?.totalGuests) {
              totalGuests = analytics.guestStats.totalGuests;
            } else if (analytics.eventStats?.totalGuests) {
              totalGuests = analytics.eventStats.totalGuests;
            } else if (analytics.giftSummary?.totalGuests) {
              totalGuests = analytics.giftSummary.totalGuests;
            }
            
            // Calculate guests with gifts from distributed gifts data
            // This is the most reliable source for realtime data
            if (analytics.rawGiftDistribution && analytics.rawGiftDistribution.length > 0) {
              // Count total distributed gifts
              const totalDistributed = analytics.rawGiftDistribution.reduce(
                (sum, item) => sum + (item.totalQuantity || 0), 
                0
              );
              
              // If we have distributed gifts, we know at least some guests selected
              if (totalDistributed > 0) {
                // Try to get exact count from analytics first
                if (analytics.guestStats?.guestsWithGifts !== undefined) {
                  guestsWithGifts = analytics.guestStats.guestsWithGifts;
                } else if (analytics.eventStats?.guestsWithGifts !== undefined) {
                  guestsWithGifts = analytics.eventStats.guestsWithGifts;
                } else if (analytics.giftSummary?.guestsWithGifts !== undefined) {
                  guestsWithGifts = analytics.giftSummary.guestsWithGifts;
                } else {
                  // Fallback: use guests prop if it has data
                  const guestsFromProps = guests.filter(g => g?.giftSelection?.inventoryId).length;
                  // If guests prop shows 0 but we have distributed gifts, use distributed count as minimum
                  // (This handles the case where guests prop hasn't updated yet)
                  guestsWithGifts = guestsFromProps > 0 ? guestsFromProps : totalDistributed;
                }
              }
            } else if (analytics.giftDistribution && Object.keys(analytics.giftDistribution).length > 0) {
              // Fallback to giftDistribution object
              const totalDistributed = Object.values(analytics.giftDistribution).reduce(
                (sum, item) => sum + (item.totalQuantity || 0), 
                0
              );
              if (totalDistributed > 0) {
                const guestsFromProps = guests.filter(g => g?.giftSelection?.inventoryId).length;
                guestsWithGifts = guestsFromProps > 0 ? guestsFromProps : totalDistributed;
              }
            }
          }
          
          // If still 0, try guests prop as final fallback
          if (guestsWithGifts === 0) {
            guestsWithGifts = guests.filter(g => g?.giftSelection?.inventoryId).length;
          }
          
          const selectionRate = totalGuests > 0 
            ? Math.round((guestsWithGifts / totalGuests) * 100)
            : 0;

          if (totalGuests === 0) return null;

          return (
            <Box mb={4}>
              <Typography variant="subtitle1" fontWeight={600} mb={2} color="primary.main">
                📊 Gift Selection Rate
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Percentage of guests who have selected gifts
              </Typography>
              <Box sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <Typography variant="h2" sx={{ fontWeight: 700, color: selectionRate >= 50 ? 'success.main' : selectionRate >= 25 ? 'warning.main' : 'error.main' }}>
                    {selectionRate}%
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Chip 
                    label={`${guestsWithGifts} of ${totalGuests} guests selected gifts`}
                    color={selectionRate >= 50 ? 'success' : selectionRate >= 25 ? 'warning' : 'default'}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
                {/* Progress bar visualization */}
                <Box sx={{ mt: 2, width: '100%', height: 24, bgcolor: 'grey.300', borderRadius: 12, overflow: 'hidden' }}>
                  <Box 
                    sx={{ 
                      height: '100%', 
                      width: `${selectionRate}%`, 
                      bgcolor: selectionRate >= 50 ? 'success.main' : selectionRate >= 25 ? 'warning.main' : 'error.main',
                      transition: 'width 0.5s ease'
                    }} 
                  />
                </Box>
              </Box>
            </Box>
          );
        })()}

      </CardContent>
    </Card>
  );
};

export default GiftAnalytics;