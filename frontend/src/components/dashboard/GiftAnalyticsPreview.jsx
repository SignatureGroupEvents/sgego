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
  Grid
} from '@mui/material';
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

  // Get filtered gift distribution data
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
    
    // Sort by quantity descending
    const sorted = filtered.sort((a, b) => (b.totalQuantity || 0) - (a.totalQuantity || 0));
    console.log('📊 Final filtered data:', sorted.length, 'items');
    return sorted;
  }, [analytics, selectedType, selectedStyle, selectedProduct]);

  // Get aggregated data based on groupBy
  const aggregatedData = useMemo(() => {
    if (!filteredGiftData || filteredGiftData.length === 0) return [];

    if (groupBy === 'none') {
      return filteredGiftData;
    }

    // Aggregate based on groupBy
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
          size: '-',
          totalQuantity: 0,
          itemCount: 0
        };
      }

      aggregated[key].totalQuantity += item.totalQuantity || 0;
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
          p: 3,
          borderRadius: 3,
          minHeight: 260,
          minWidth: 400,
          flex: '1 1 500px',
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
          p: 3,
          borderRadius: 3,
          minHeight: 260,
          minWidth: 400,
          flex: '1 1 500px'
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
        p: 3,
        borderRadius: 3,
        minHeight: 200,
        minWidth: 400,
        flex: '1 1 500px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Gift Distribution
        </Typography>
        {(selectedType || selectedStyle || selectedProduct || groupBy !== 'none') && (
          <Chip
            label="Clear All"
            onClick={handleClearFilters}
            size="small"
            color="secondary"
            sx={{ cursor: 'pointer' }}
          />
        )}
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
        <TableContainer sx={{ maxHeight: 200, flex: 1 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {isGrouped && groupBy === 'category' ? (
                  <>
                    <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total Qty</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Items</TableCell>
                  </>
                ) : isGrouped && groupBy === 'brand' ? (
                  <>
                    <TableCell sx={{ fontWeight: 600 }}>Brand</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total Qty</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Items</TableCell>
                  </>
                ) : isGrouped && groupBy === 'product' ? (
                  <>
                    <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total Qty</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Items</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Style</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Size</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayData.slice(0, 15).map((item, index) => {
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
                    <TableCell align="right">{item.size || '-'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {item.totalQuantity || 0}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        );
      })()}
      
      {(() => {
        const displayData = groupBy === 'none' ? filteredGiftData : aggregatedData;
        const label = groupBy === 'none' ? 'items' : groupBy === 'category' ? 'categories' : groupBy === 'brand' ? 'brands' : 'products';
        if (displayData.length > 15) {
          return (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'right' }}>
              Showing top 15 of {displayData.length} {label}
            </Typography>
          );
        }
        return null;
      })()}
    </Paper>
  );
};

export default GiftAnalyticsPreview;
