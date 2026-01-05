import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
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
  TablePagination,
  Grid,
  IconButton,
  Tooltip,
  Menu
} from '@mui/material';
import { FileDownload as FileDownloadIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { getAllEventAnalytics } from '../../services/analytics';

const GiftAnalyticsPreview = ({ event, inventory = [] }) => {
  const theme = useTheme();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states - simplified: groupBy replaces viewMode, filters are contextual
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'category', 'brand', 'product'
  const [selectedType, setSelectedType] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [chartExpanded, setChartExpanded] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedSegments, setSelectedSegments] = useState([]); // Track selected pie chart segments (array for multi-select)

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!event?._id) return;
      
      setLoading(true);
      setError('');
      try {
        const data = await getAllEventAnalytics(event._id);
        console.log('📊 GiftAnalyticsPreview: Received analytics data', {
          allKeys: Object.keys(data),
          hasRawGiftDistribution: !!data.rawGiftDistribution,
          rawGiftDistributionLength: data.rawGiftDistribution?.length || 0,
          sampleItem: data.rawGiftDistribution?.[0],
          hasGiftDistribution: !!data.giftDistribution,
          giftDistributionType: data.giftDistribution ? typeof data.giftDistribution : null,
          giftDistributionKeys: data.giftDistribution ? Object.keys(data.giftDistribution) : null,
          giftDistributionLength: data.giftDistribution ? Object.keys(data.giftDistribution).length : 0,
          giftSummary: data.giftSummary,
          sampleGiftDistribution: data.giftDistribution ? Object.values(data.giftDistribution)[0] : null,
          fullData: data // Log full data to see structure
        });
        setAnalytics(data);
      } catch (err) {
        console.error('Error fetching gift analytics:', err);
        setError('Failed to load gift analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    
    // Refresh every 30 seconds for live updates
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [event?._id]);

  // Also refresh when inventory changes (in case new items are added)
  useEffect(() => {
    if (analytics && inventory.length > 0) {
      // Trigger a refresh to get updated data
      const fetchAnalytics = async () => {
        if (!event?._id) return;
        try {
          const data = await getAllEventAnalytics(event._id);
          setAnalytics(data);
        } catch (err) {
          console.error('Error refreshing gift analytics:', err);
        }
      };
      fetchAnalytics();
    }
  }, [inventory.length, event?._id]); // Only trigger on inventory count change to avoid loops

  // Get unique filter options from both inventory and distributed gifts
  const filterOptions = useMemo(() => {
    const types = new Set();
    const styles = new Set();
    const products = new Set();
    
    // Add options from inventory
    inventory.forEach(item => {
      if (item.type) types.add(item.type);
      if (item.style) styles.add(item.style);
      if (item.product) products.add(item.product);
    });
    
    // Add options from distributed gifts (actual data we're displaying)
    // Try rawGiftDistribution first, then fallback to giftDistribution
    if (analytics?.rawGiftDistribution && analytics.rawGiftDistribution.length > 0) {
      analytics.rawGiftDistribution.forEach(item => {
        if (item.type) types.add(item.type);
        if (item.style) styles.add(item.style);
        if (item.product) products.add(item.product);
      });
    } else if (analytics?.giftDistribution && Object.keys(analytics.giftDistribution).length > 0) {
      // Fallback: use giftDistribution object
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
  }, [inventory, analytics]);

  // Calculate remaining quantities from inventory
  const inventoryRemainingMap = useMemo(() => {
    const map = new Map();
    inventory.forEach(item => {
      if (item._id) {
        const remaining = item.currentInventory || 0;
        map.set(item._id.toString(), remaining);
      }
    });
    return map;
  }, [inventory]);

  // Get filtered gift distribution data with remaining quantities
  // Show items that match category/brand even if product doesn't match exactly
  const filteredGiftData = useMemo(() => {
    // Try rawGiftDistribution first, then fallback to giftDistribution
    let sourceData = analytics?.rawGiftDistribution;
    
    if (!sourceData || sourceData.length === 0) {
      // Fallback: convert giftDistribution object to array
      if (analytics?.giftDistribution && Object.keys(analytics.giftDistribution).length > 0) {
        console.log('📊 GiftAnalyticsPreview: Using giftDistribution as fallback for filtering', {
          giftDistributionKeys: Object.keys(analytics.giftDistribution),
          sampleItem: Object.values(analytics.giftDistribution)[0]
        });
        sourceData = Object.values(analytics.giftDistribution).map(item => ({
          type: item.type,
          style: item.style,
          product: item.product || '',
          size: item.size,
          totalQuantity: item.totalQuantity || 0,
          inventoryId: item.inventoryId
        }));
      } else {
        console.log('📊 GiftAnalyticsPreview: No gift distribution data available', {
          hasRawGiftDistribution: !!analytics?.rawGiftDistribution,
          rawGiftDistributionIsArray: Array.isArray(analytics?.rawGiftDistribution),
          rawGiftDistributionLength: analytics?.rawGiftDistribution?.length || 0,
          hasGiftDistribution: !!analytics?.giftDistribution,
          giftDistributionType: analytics?.giftDistribution ? typeof analytics.giftDistribution : null,
          giftDistributionIsObject: analytics?.giftDistribution ? typeof analytics.giftDistribution === 'object' : false,
          giftDistributionKeys: analytics?.giftDistribution ? Object.keys(analytics.giftDistribution) : null,
          analyticsKeys: analytics ? Object.keys(analytics) : [],
          giftSummary: analytics?.giftSummary
        });
        return [];
      }
    }
    
    console.log('📊 GiftAnalyticsPreview: Filtering data', {
      totalItems: sourceData.length,
      selectedType,
      selectedStyle,
      selectedProduct,
      sampleItem: sourceData[0],
      dataSource: analytics?.rawGiftDistribution ? 'rawGiftDistribution' : 'giftDistribution'
    });
    
    let filtered = [...sourceData];
    
    // Apply filters (more inclusive - show all items in category/brand even if product doesn't match)
    if (selectedType) {
      filtered = filtered.filter(item => item.type === selectedType);
      console.log(`📊 After type filter (${selectedType}):`, filtered.length);
    }
    if (selectedStyle) {
      filtered = filtered.filter(item => item.style === selectedStyle);
      console.log(`📊 After style filter (${selectedStyle}):`, filtered.length);
    }
    // Only filter by product if explicitly selected, otherwise show all products in that category/brand
    if (selectedProduct) {
      filtered = filtered.filter(item => {
        const itemProduct = (item.product || '').trim();
        const selectedProductTrimmed = selectedProduct.trim();
        // Match if product matches exactly, or if product is empty and we're looking for empty
        return itemProduct === selectedProductTrimmed || 
               (itemProduct === '' && selectedProductTrimmed === '');
      });
      console.log(`📊 After product filter (${selectedProduct}):`, filtered.length);
    }
    
    // Add remaining quantity from inventory
    filtered = filtered.map(item => {
      const inventoryId = item.inventoryId?.toString();
      const remaining = inventoryId ? (inventoryRemainingMap.get(inventoryId) || 0) : 0;
      return {
        ...item,
        remainingQuantity: remaining
      };
    });
    
    // Sort by quantity descending
    const sorted = filtered.sort((a, b) => (b.totalQuantity || 0) - (a.totalQuantity || 0));
    console.log('📊 Final filtered data:', sorted.length, 'items');
    return sorted;
  }, [analytics, selectedType, selectedStyle, selectedProduct, inventoryRemainingMap]);

  // Get aggregated data based on groupBy with remaining quantities
  const aggregatedData = useMemo(() => {
    if (!filteredGiftData || filteredGiftData.length === 0) return [];

    if (groupBy === 'none') {
      return filteredGiftData;
    }

    // Aggregate based on groupBy and sum remaining quantities
    const aggregated = {};

    filteredGiftData.forEach(item => {
      let key;
      if (groupBy === 'category') {
        key = item.type || 'Uncategorized';
      } else if (groupBy === 'brand') {
        key = item.style || 'Unbranded';
      } else if (groupBy === 'product') {
        key = item.product || 'No Product';
      }

      if (!aggregated[key]) {
        aggregated[key] = {
          key,
          type: groupBy === 'category' ? key : item.type || '-',
          style: groupBy === 'brand' ? key : item.style || '-',
          product: groupBy === 'product' ? key : item.product || '-',
          totalQuantity: 0,
          remainingQuantity: 0,
          itemCount: 0
        };
      }

      aggregated[key].totalQuantity += item.totalQuantity || 0;
      aggregated[key].remainingQuantity += item.remainingQuantity || 0;
      aggregated[key].itemCount += 1;
    });

    return Object.values(aggregated).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [filteredGiftData, groupBy]);

  // Calculate totals
  const totalDistributed = useMemo(() => {
    return filteredGiftData.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
  }, [filteredGiftData]);

  const uniqueItems = groupBy === 'none' ? filteredGiftData.length : aggregatedData.length;

  // Handle filter changes
  const handleTypeChange = (e) => {
    setSelectedType(e.target.value);
    // Reset dependent filters
    if (e.target.value !== selectedType) {
      setSelectedStyle('');
      setSelectedProduct('');
    }
  };

  const handleStyleChange = (e) => {
    setSelectedStyle(e.target.value);
    // Reset product filter if style changes
    if (e.target.value !== selectedStyle) {
      setSelectedProduct('');
    }
  };

  const handleProductChange = (e) => {
    setSelectedProduct(e.target.value);
  };

  const handleClearFilters = () => {
    setSelectedType('');
    setSelectedStyle('');
    setSelectedProduct('');
    setGroupBy('none');
  };

  // Determine which filters to show based on groupBy
  const showTypeFilter = groupBy !== 'category';
  const showStyleFilter = groupBy !== 'brand';
  const showProductFilter = groupBy !== 'product';

  // Export functions
  const exportToCSV = () => {
    const displayData = groupBy === 'none' ? filteredGiftData : aggregatedData;
    const isGrouped = groupBy !== 'none';
    
    const sections = [];
    
    // Section 0: Export Information
    sections.push('=== EXPORT INFORMATION ===');
    sections.push(`Exported On,"${new Date().toLocaleString()}"`);
    sections.push(`Export Date,"${new Date().toLocaleDateString()}"`);
    sections.push(`Export Time,"${new Date().toLocaleTimeString()}"`);
    sections.push('');
    
    // Section 1: Program Info (Event Summary)
    sections.push('=== PROGRAM INFORMATION ===');
    sections.push(`Event Name,"${(event?.eventName || 'N/A').replace(/"/g, '""')}"`);
    sections.push(`Contract Number,"${(event?.eventContractNumber || 'N/A').replace(/"/g, '""')}"`);
    sections.push(`Event Type,"${(event?.isMainEvent ? 'Main Event' : 'Secondary Event').replace(/"/g, '""')}"`);
    if (analytics?.eventStats) {
      sections.push(`Total Guests,${analytics.eventStats.totalGuests || 0}`);
      sections.push(`Checked In Guests,${analytics.eventStats.checkedInGuests || 0}`);
      sections.push(`Check-in Rate,${analytics.eventStats.checkInPercentage || 0}%`);
    }
    sections.push('');
    
    // Section 2: Gift Summary
    if (analytics?.giftSummary) {
      sections.push('=== GIFT SUMMARY ===');
      sections.push(`Total Gifts Distributed,${analytics.giftSummary.totalGiftsDistributed || 0}`);
      sections.push(`Unique Items Distributed,${analytics.giftSummary.uniqueItemsDistributed || 0}`);
      sections.push(`Average Gifts Per Guest,${analytics.giftSummary.averageGiftsPerGuest || 0}`);
      sections.push('');
    }
    
    // Section 3: Applied Filters
    sections.push('=== APPLIED FILTERS ===');
    sections.push(`Group By,"${groupBy === 'none' ? 'All Items' : groupBy === 'category' ? 'Category' : groupBy === 'brand' ? 'Brand' : 'Product'}"`);
    if (selectedType) {
      sections.push(`Type Filter,"${selectedType.replace(/"/g, '""')}"`);
    }
    if (selectedStyle) {
      sections.push(`Style Filter,"${selectedStyle.replace(/"/g, '""')}"`);
    }
    if (selectedProduct) {
      sections.push(`Product Filter,"${selectedProduct.replace(/"/g, '""')}"`);
    }
    if (!selectedType && !selectedStyle && !selectedProduct) {
      sections.push('Filters,None (All items shown)');
    }
    sections.push('');
    
    // Section 4: Gift Data Table
    sections.push('=== GIFT DISTRIBUTION DATA ===');
    let headers, rows;
    
    if (isGrouped) {
      if (groupBy === 'category') {
        headers = ['Category', 'Total Qty', 'Qty Remaining', 'Items'];
        rows = displayData.map(item => [
          (item.key || '').replace(/"/g, '""'),
          item.totalQuantity || 0,
          item.remainingQuantity || 0,
          item.itemCount || 0
        ]);
      } else if (groupBy === 'brand') {
        headers = ['Brand', 'Total Qty', 'Qty Remaining', 'Items'];
        rows = displayData.map(item => [
          (item.key || '').replace(/"/g, '""'),
          item.totalQuantity || 0,
          item.remainingQuantity || 0,
          item.itemCount || 0
        ]);
      } else if (groupBy === 'product') {
        headers = ['Product', 'Total Qty', 'Qty Remaining', 'Items'];
        rows = displayData.map(item => [
          (item.key || '').replace(/"/g, '""'),
          item.totalQuantity || 0,
          item.remainingQuantity || 0,
          item.itemCount || 0
        ]);
      }
    } else {
      headers = ['Type', 'Style', 'Product', 'Qty', 'Qty Remaining'];
      rows = displayData.map(item => [
        (item.type || '').replace(/"/g, '""'),
        (item.style || '').replace(/"/g, '""'),
        (item.product || '').replace(/"/g, '""'),
        item.totalQuantity || 0,
        item.remainingQuantity || 0
      ]);
    }
    
    sections.push(headers.join(','));
    rows.forEach(row => {
      sections.push(row.map(cell => `"${cell}"`).join(','));
    });
    
    // Create CSV content
    const csvContent = sections.join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const date = new Date().toISOString().split('T')[0];
    const eventName = event?.eventName || 'event';
    const groupByText = groupBy === 'none' ? 'all' : groupBy;
    link.setAttribute('download', `gift_analytics_${eventName}_${groupByText}_${date}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setExportMenuAnchor(null);
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const displayData = groupBy === 'none' ? filteredGiftData : aggregatedData;
      const isGrouped = groupBy !== 'none';
      
      const sections = [];
      
      // Section 0: Export Information
      sections.push('=== EXPORT INFORMATION ===');
      sections.push(`Exported On\t${new Date().toLocaleString()}`);
      sections.push(`Export Date\t${new Date().toLocaleDateString()}`);
      sections.push(`Export Time\t${new Date().toLocaleTimeString()}`);
      sections.push('');
      
      // Section 1: Program Info (Event Summary)
      sections.push('=== PROGRAM INFORMATION ===');
      sections.push(`Event Name\t${event?.eventName || 'N/A'}`);
      sections.push(`Contract Number\t${event?.eventContractNumber || 'N/A'}`);
      sections.push(`Event Type\t${event?.isMainEvent ? 'Main Event' : 'Secondary Event'}`);
      if (analytics?.eventStats) {
        sections.push(`Total Guests\t${analytics.eventStats.totalGuests || 0}`);
        sections.push(`Checked In Guests\t${analytics.eventStats.checkedInGuests || 0}`);
        sections.push(`Check-in Rate\t${analytics.eventStats.checkInPercentage || 0}%`);
      }
      sections.push('');
      
      // Section 2: Gift Summary
      if (analytics?.giftSummary) {
        sections.push('=== GIFT SUMMARY ===');
        sections.push(`Total Gifts Distributed\t${analytics.giftSummary.totalGiftsDistributed || 0}`);
        sections.push(`Unique Items Distributed\t${analytics.giftSummary.uniqueItemsDistributed || 0}`);
        sections.push(`Average Gifts Per Guest\t${analytics.giftSummary.averageGiftsPerGuest || 0}`);
        sections.push('');
      }
      
      // Section 3: Applied Filters
      sections.push('=== APPLIED FILTERS ===');
      sections.push(`Group By\t${groupBy === 'none' ? 'All Items' : groupBy === 'category' ? 'Category' : groupBy === 'brand' ? 'Brand' : 'Product'}`);
      if (selectedType) {
        sections.push(`Type Filter\t${selectedType}`);
      }
      if (selectedStyle) {
        sections.push(`Style Filter\t${selectedStyle}`);
      }
      if (selectedProduct) {
        sections.push(`Product Filter\t${selectedProduct}`);
      }
      if (!selectedType && !selectedStyle && !selectedProduct) {
        sections.push('Filters\tNone (All items shown)');
      }
      sections.push('');
      
      // Section 4: Gift Data Table
      sections.push('=== GIFT DISTRIBUTION DATA ===');
      let headers, rows;
      
      if (isGrouped) {
        if (groupBy === 'category') {
          headers = ['Category', 'Total Qty', 'Qty Remaining', 'Items'];
          rows = displayData.map(item => [
            item.key || '',
            item.totalQuantity || 0,
            item.remainingQuantity || 0,
            item.itemCount || 0
          ]);
        } else if (groupBy === 'brand') {
          headers = ['Brand', 'Total Qty', 'Qty Remaining', 'Items'];
          rows = displayData.map(item => [
            item.key || '',
            item.totalQuantity || 0,
            item.remainingQuantity || 0,
            item.itemCount || 0
          ]);
        } else if (groupBy === 'product') {
          headers = ['Product', 'Total Qty', 'Qty Remaining', 'Items'];
          rows = displayData.map(item => [
            item.key || '',
            item.totalQuantity || 0,
            item.remainingQuantity || 0,
            item.itemCount || 0
          ]);
        }
      } else {
        headers = ['Type', 'Style', 'Product', 'Qty', 'Qty Remaining'];
        rows = displayData.map(item => [
          item.type || '',
          item.style || '',
          item.product || '',
          item.totalQuantity || 0,
          item.remainingQuantity || 0
        ]);
      }
      
      sections.push(headers.join('\t'));
      rows.forEach(row => {
        sections.push(row.join('\t'));
      });
      
      // Create tab-separated content (Excel-friendly)
      const excelContent = sections.join('\n');
      
      // Create and download file
      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const date = new Date().toISOString().split('T')[0];
      const eventName = event?.eventName || 'event';
      const groupByText = groupBy === 'none' ? 'all' : groupBy;
      link.setAttribute('download', `gift_analytics_${eventName}_${groupByText}_${date}.xls`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setError('Failed to export to Excel');
    } finally {
      setExporting(false);
      setExportMenuAnchor(null);
    }
  };

  // Get available styles/products based on selected filters from distributed gifts
  const availableStyles = useMemo(() => {
    if (!selectedType) return filterOptions.styles;
    const styles = new Set();
    
    // Get styles from distributed gifts that match the selected type
    // Try rawGiftDistribution first, then fallback to giftDistribution
    let sourceData = analytics?.rawGiftDistribution;
    if (!sourceData || sourceData.length === 0) {
      if (analytics?.giftDistribution && Object.keys(analytics.giftDistribution).length > 0) {
        sourceData = Object.values(analytics.giftDistribution);
      }
    }
    
    if (sourceData && sourceData.length > 0) {
      sourceData
        .filter(item => item.type === selectedType)
        .forEach(item => {
          if (item.style) styles.add(item.style);
        });
    }
    
    // Also include styles from inventory for completeness
    inventory
      .filter(item => item.type === selectedType)
      .forEach(item => {
        if (item.style) styles.add(item.style);
      });
    
    return Array.from(styles).sort();
  }, [selectedType, inventory, filterOptions.styles, analytics]);

  const availableProducts = useMemo(() => {
    if (!selectedType && !selectedStyle) return filterOptions.products;
    const products = new Set();
    
    // Get products from distributed gifts that match the selected filters
    // Try rawGiftDistribution first, then fallback to giftDistribution
    let sourceData = analytics?.rawGiftDistribution;
    if (!sourceData || sourceData.length === 0) {
      if (analytics?.giftDistribution && Object.keys(analytics.giftDistribution).length > 0) {
        sourceData = Object.values(analytics.giftDistribution);
      }
    }
    
    if (sourceData && sourceData.length > 0) {
      sourceData
        .filter(item => {
          if (selectedType && item.type !== selectedType) return false;
          if (selectedStyle && item.style !== selectedStyle) return false;
          return true;
        })
        .forEach(item => {
          if (item.product) products.add(item.product);
        });
    }
    
    // Also include products from inventory for completeness
    inventory
      .filter(item => {
        if (selectedType && item.type !== selectedType) return false;
        if (selectedStyle && item.style !== selectedStyle) return false;
        return true;
      })
      .forEach(item => {
        if (item.product) products.add(item.product);
      });
    
    return Array.from(products).sort();
  }, [selectedType, selectedStyle, inventory, filterOptions.products, analytics]);

  if (loading && !analytics) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          minHeight: { xs: 'auto', sm: 260 },
          width: { xs: '100%', sm: 'auto' },
          minWidth: { xs: 'unset', sm: 400 },
          flex: { xs: '1 1 100%', sm: '1 1 500px' },
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <CircularProgress size={40} />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          minHeight: { xs: 'auto', sm: 260 },
          width: { xs: '100%', sm: 'auto' },
          minWidth: { xs: 'unset', sm: 400 },
          flex: { xs: '1 1 100%', sm: '1 1 500px' }
        }}
      >
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 3,
        minHeight: { xs: 'auto', sm: 200 },
        width: { xs: '100%', sm: 'auto' },
        minWidth: { xs: 'unset', sm: 400 },
        flex: { xs: '1 1 100%', sm: '1 1 500px' },
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 2,
        gap: { xs: 1, sm: 0 }
      }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          Gift Distribution
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {(selectedType || selectedStyle || selectedProduct || groupBy !== 'none') && (
            <Chip
              label="Clear All"
              onClick={handleClearFilters}
              size="small"
              color="secondary"
              sx={{ cursor: 'pointer' }}
            />
          )}
          <Tooltip title="Export Data">
            <IconButton
              size="small"
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

      {/* Controls Row - Compact */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {/* Group By Dropdown */}
        <Grid size={{ xs: 12, sm: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Group By</InputLabel>
            <Select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              label="Group By"
            >
              <MenuItem value="none">All Items</MenuItem>
              <MenuItem value="category">By Category</MenuItem>
              <MenuItem value="brand">By Brand</MenuItem>
              <MenuItem value="product">By Product</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        {/* Contextual Filters - Only show when not grouped by that field */}
        {showTypeFilter && (
          <Grid size={{ xs: 12, sm: groupBy === 'none' ? 3 : 4.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedType}
                onChange={handleTypeChange}
                label="Category"
              >
                <MenuItem value="">
                  <em>All Categories</em>
                </MenuItem>
                {filterOptions.types.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}
        {showStyleFilter && (
          <Grid size={{ xs: 12, sm: groupBy === 'none' ? 3 : 4.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Brand</InputLabel>
              <Select
                value={selectedStyle}
                onChange={handleStyleChange}
                label="Brand"
              >
                <MenuItem value="">
                  <em>All Brands</em>
                </MenuItem>
                {availableStyles.map(style => (
                  <MenuItem key={style} value={style}>{style}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}
        {showProductFilter && (
          <Grid size={{ xs: 12, sm: groupBy === 'none' ? 3 : 4.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Product</InputLabel>
              <Select
                value={selectedProduct}
                onChange={handleProductChange}
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

      {/* Summary Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Chip
          label={`Total: ${totalDistributed}`}
          color="primary"
          sx={{ fontWeight: 600 }}
        />
        <Chip
          label={`Items: ${uniqueItems}`}
          color="secondary"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      {/* Gift Distribution Table - Always show if we have data, even if filtered is empty */}
      {(() => {
        // Check if we have any gift data from either source
        const hasRawData = analytics?.rawGiftDistribution && Array.isArray(analytics.rawGiftDistribution) && analytics.rawGiftDistribution.length > 0;
        const hasGiftDistData = analytics?.giftDistribution && typeof analytics.giftDistribution === 'object' && Object.keys(analytics.giftDistribution).length > 0;
        const hasAnyData = hasRawData || hasGiftDistData;
        
        if (!hasAnyData) {
          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 150 }}>
              <Typography variant="body2" color="text.secondary">
                No gifts distributed yet
              </Typography>
            </Box>
          );
        }
        
        if (filteredGiftData.length === 0) {
          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 150 }}>
              <Typography variant="body2" color="text.secondary">
                No gifts match the selected filters
              </Typography>
            </Box>
          );
        }
        
        // Determine which data to show based on groupBy
        const displayData = groupBy === 'none' ? filteredGiftData : aggregatedData;
        const isGrouped = groupBy !== 'none';
        
        return (
          <>
            <TableContainer 
              sx={{ 
                maxHeight: { xs: 300, sm: 200 }, 
                flex: 1,
                overflowX: 'auto',
                '& .MuiTable-root': {
                  minWidth: { xs: 500, sm: 'auto' }
                }
              }}
            >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {isGrouped && groupBy === 'category' ? (
                  <>
                    <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total Qty</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Qty Remaining</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Items</TableCell>
                  </>
                ) : isGrouped && groupBy === 'brand' ? (
                  <>
                    <TableCell sx={{ fontWeight: 600 }}>Brand</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total Qty</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Qty Remaining</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Items</TableCell>
                  </>
                ) : isGrouped && groupBy === 'product' ? (
                  <>
                    <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total Qty</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Qty Remaining</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Items</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Style</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Qty Remaining</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item, index) => {
                // Create a unique key from the item properties
                const uniqueKey = isGrouped
                  ? `${groupBy}-${item.key}-${index}`
                  : `${item.inventoryId || index}-${item.type || ''}-${item.style || ''}-${item.product || ''}-${item.size || ''}`;
                
                if (isGrouped) {
                  return (
                    <TableRow key={uniqueKey} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{item.key}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {item.totalQuantity || 0}
                      </TableCell>
                      <TableCell align="right" sx={{ 
                        fontWeight: 600, 
                        color: (item.remainingQuantity || 0) <= 10 ? 'error.main' : 'success.main' 
                      }}>
                        {item.remainingQuantity || 0}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                        {item.itemCount || 0}
                      </TableCell>
                    </TableRow>
                  );
                }
                
                return (
                  <TableRow key={uniqueKey} hover>
                    <TableCell>{item.type || '-'}</TableCell>
                    <TableCell>{item.style || '-'}</TableCell>
                    <TableCell>{item.product || '-'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {item.totalQuantity || 0}
                    </TableCell>
                    <TableCell align="right" sx={{ 
                      fontWeight: 600, 
                      color: (item.remainingQuantity || 0) < 10 ? 'warning.main' : 'success.main' 
                    }}>
                      {item.remainingQuantity || 0}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
            </TableContainer>
            {(() => {
              const displayData = groupBy === 'none' ? filteredGiftData : aggregatedData;
              return (
                <TablePagination
                  component="div"
                  count={displayData.length}
                  page={page}
                  onPageChange={(event, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(event) => {
                    setRowsPerPage(parseInt(event.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  labelRowsPerPage="Rows per page:"
                />
              );
            })()}
          </>
        );
      })()}
    </Paper>
  );
};

export default GiftAnalyticsPreview;
