import React, { useMemo, useState, useEffect, useRef } from 'react';
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
  Divider,
  Chip,
  Collapse,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import AnalyticsPieChart from '../../analytics/charts/AnalyticsPieChart';
import { useAnalyticsApi } from '../../../contexts/AnalyticsApiContext';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import ClearIcon from '@mui/icons-material/Clear';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import Menu from '@mui/material/Menu';

// Centralized fallback label
const UNKNOWN_LABEL = 'Unlabeled';

// Stable color for category chip (same category = same color)
const CATEGORY_CHIP_COLORS = [
  '#00B2C0', '#31365E', '#CB1033', '#FAA951', '#00838F', '#4DD0E1', '#FFD166', '#F67280',
  '#6C5B7B', '#355C7D', '#B5EAD7', '#FFB7B2', '#B2C2FF', '#F6D186', '#C06C84', '#F8B195',
];
function getCategoryChipColor(categoryName) {
  if (!categoryName) return CATEGORY_CHIP_COLORS[0];
  let hash = 0;
  const s = String(categoryName);
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash) + s.charCodeAt(i);
  return CATEGORY_CHIP_COLORS[Math.abs(hash) % CATEGORY_CHIP_COLORS.length];
}

const GiftAnalytics = ({ event, guests = [], inventory = [], refreshKey = 0, allowCsvExport = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const getAnalytics = useAnalyticsApi();
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(null);

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
  const [groupBy] = useState('style');
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [confirmExportOpen, setConfirmExportOpen] = useState(false);
  const [confirmExportFormat, setConfirmExportFormat] = useState(null); // 'csv' | 'xlsx'
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedSegments, setSelectedSegments] = useState([]); // Track selected pie chart segments (array for multi-select)
  const [chartExpanded, setChartExpanded] = useState(true);
  // Pie chart specific grouping and filters - default to 'category' to show chart automatically
  const [pieChartGroupBy, setPieChartGroupBy] = useState('category'); // 'none', 'category', 'brand', 'product'
  const [pieChartSelectedType, setPieChartSelectedType] = useState('');
  const [pieChartSelectedStyle, setPieChartSelectedStyle] = useState('');
  const [pieChartSelectedProduct, setPieChartSelectedProduct] = useState('');
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const canExport = allowCsvExport;

  // Fetch analytics data for realtime gift distribution
  const fetchAnalyticsRef = useRef(null);
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
    fetchAnalyticsRef.current = fetchAnalytics;
    fetchAnalytics();

    // Refresh every 30 seconds for live updates
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [event?._id, getAnalytics, refreshKey]);

  // Listen for real-time analytics updates when someone checks in and gifts are distributed
  useEffect(() => {
    if (!event?._id) return;
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
      : 'http://localhost:3001';
    const socket = io(socketUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });
    const eventIdStr = String(event._id);
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
  }, [event?._id]);

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
    return processedData;
  }, [guests, inventory]);

  // Single source of truth: map inventoryId -> totalQuantity from analytics (Distribution chart + Inventory Summary table)
  const analyticsCountByInventoryId = useMemo(() => {
    const map = new Map();
    let sourceData = analytics?.rawGiftDistribution;
    if (!sourceData || sourceData.length === 0) {
      if (analytics?.giftDistribution && Object.keys(analytics.giftDistribution).length > 0) {
        sourceData = Object.values(analytics.giftDistribution);
      } else {
        return map;
      }
    }
    sourceData.forEach((item) => {
      const id = item.inventoryId != null ? String(item.inventoryId) : null;
      if (id) {
        const qty = item.totalQuantity ?? 0;
        map.set(id, (map.get(id) || 0) + qty);
      }
    });
    return map;
  }, [analytics]);

  // Use analytics.inventory when present so table/chart match same event(s) as rawGiftDistribution (main + secondaries when main)
  const effectiveInventory = useMemo(() => {
    if (analytics?.inventory && Array.isArray(analytics.inventory) && analytics.inventory.length > 0) {
      return analytics.inventory;
    }
    return inventory;
  }, [analytics?.inventory, inventory]);

  // Inventory Summary Table: aligned with Inventory page (Item = Category/Brand/Product, Size, Gender, Color, Qty Before Event, Distributed, Post Event Count). Event column removed — table shows inventory for current context (main or secondary).
  const inventorySummaryTableData = useMemo(() => {
    const hasAnalytics = analyticsCountByInventoryId.size > 0;
    return effectiveInventory.map((inv) => {
      const count = hasAnalytics
        ? (analyticsCountByInventoryId.get(inv._id?.toString()) ?? 0)
        : (giftCounts.find((r) => r.inventoryId?.toString() === inv._id?.toString())?.count ?? 0);
      const type = inv.type || UNKNOWN_LABEL;
      const style = inv.style || UNKNOWN_LABEL;
      const product = inv.product || UNKNOWN_LABEL;
      const itemLabel = product && product !== UNKNOWN_LABEL
        ? `${type} — ${style} (${product})`
        : `${type} — ${style}`;
      return {
        inventoryId: inv._id,
        itemLabel: itemLabel.trim() || UNKNOWN_LABEL,
        size: inv.size || '—',
        gender: inv.gender || '—',
        color: inv.color || '—',
        quantityBeforeEvent: inv.qtyOnSite != null ? inv.qtyOnSite : (inv.qtyBeforeEvent != null ? inv.qtyBeforeEvent : '—'),
        distributed: count,
        postEventCount: inv.postEventCount ?? '—',
        type,
        style,
        product
      };
    });
  }, [effectiveInventory, giftCounts, analyticsCountByInventoryId]);

  const filteredGiftCounts = useMemo(() => {
    if (!tableSearchQuery.trim()) return inventorySummaryTableData;
    const q = tableSearchQuery.trim().toLowerCase();
    return inventorySummaryTableData.filter((row) => {
      const itemLabel = (row.itemLabel || '').toLowerCase();
      const size = String(row.size || '').toLowerCase();
      const gender = String(row.gender || '').toLowerCase();
      const color = String(row.color || '').toLowerCase();
      const qtyBefore = String(row.quantityBeforeEvent ?? '').toLowerCase();
      const distributed = String(row.distributed ?? '').toLowerCase();
      const postEvent = String(row.postEventCount ?? '').toLowerCase();
      return itemLabel.includes(q) || size.includes(q) || gender.includes(q) ||
        color.includes(q) || qtyBefore.includes(q) || distributed.includes(q) || postEvent.includes(q);
    });
  }, [inventorySummaryTableData, tableSearchQuery]);

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
    return chartDataResult;
  }, [giftCounts, groupBy]);

  // Prepare inventory utilization data (same scope as table when analytics.inventory is present)
  const utilizationData = useMemo(() => {
    const distributedMap = new Map();
    const hasAnalytics = analyticsCountByInventoryId.size > 0;
    if (hasAnalytics) {
      analyticsCountByInventoryId.forEach((qty, invId) => {
        if (qty > 0) distributedMap.set(invId, qty);
      });
    } else {
      giftCounts.forEach(item => {
        if (item.inventoryId && item.count > 0) {
          const invId = item.inventoryId.toString();
          distributedMap.set(invId, (distributedMap.get(invId) || 0) + item.count);
        }
      });
    }

    return effectiveInventory
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
  }, [effectiveInventory, giftCounts, analyticsCountByInventoryId]);

  // Get all available filter options from both inventory and analytics data
  const pieChartFilterOptions = useMemo(() => {
    const types = new Set();
    const styles = new Set();
    const products = new Set();
    
    // Add options from inventory (same scope as analytics when analytics.inventory is present)
    effectiveInventory.forEach(item => {
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
  }, [effectiveInventory, giftCounts, analytics]);

  // Get available brands based on selected category (cascading filter)
  const availableBrands = useMemo(() => {
    if (!pieChartSelectedType) return pieChartFilterOptions.styles;
    
    const brands = new Set();
    
    // From inventory (same scope as analytics when analytics.inventory is present)
    effectiveInventory
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
  }, [pieChartSelectedType, effectiveInventory, giftCounts, analytics, pieChartFilterOptions.styles]);

  // Get available products based on selected category and brand (cascading filter)
  const availableProducts = useMemo(() => {
    if (!pieChartSelectedType && !pieChartSelectedStyle) {
      return pieChartFilterOptions.products;
    }
    
    const products = new Set();
    
    // From inventory (same scope as analytics when analytics.inventory is present)
    effectiveInventory
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
  }, [pieChartSelectedType, pieChartSelectedStyle, effectiveInventory, giftCounts, analytics, pieChartFilterOptions.products]);

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

  // Prepare distribution data for pie chart based on pieChartGroupBy using realtime analytics (single source of truth)
  const pieChartDistributionData = useMemo(() => {
    // All Items: one slice per inventory item; counts from analytics (same source as By Category/Brand/Product)
    if (pieChartGroupBy === 'none') {
      const hasAnalytics = analyticsCountByInventoryId.size > 0;
      let items = effectiveInventory;
      if (pieChartSelectedType) items = items.filter((inv) => (inv.type || UNKNOWN_LABEL) === pieChartSelectedType);
      if (pieChartSelectedStyle) items = items.filter((inv) => (inv.style || UNKNOWN_LABEL) === pieChartSelectedStyle);
      if (pieChartSelectedProduct) {
        const p = (pieChartSelectedProduct || '').trim();
        items = items.filter((inv) => (inv.product || '').trim() === p);
      }
      return items.map((inv) => {
        const count = hasAnalytics
          ? (analyticsCountByInventoryId.get(inv._id?.toString()) ?? 0)
          : (giftCounts.find((r) => r.inventoryId?.toString() === inv._id?.toString())?.count ?? 0);
        const type = inv.type || UNKNOWN_LABEL;
        const style = inv.style || UNKNOWN_LABEL;
        const product = inv.product || UNKNOWN_LABEL;
        const name = product && product !== UNKNOWN_LABEL
          ? `${type} — ${style} (${product})`
          : `${type} — ${style}`;
        return {
          name: name.trim() || UNKNOWN_LABEL,
          value: count > 0 ? count : 0.5, // 0.5 so zero-count slice still renders
          realValue: count
        };
      }).sort((a, b) => b.realValue - a.realValue);
    }

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
  }, [pieChartFilteredGiftData, pieChartGroupBy, giftCounts, effectiveInventory, analyticsCountByInventoryId, pieChartSelectedType, pieChartSelectedStyle, pieChartSelectedProduct]);

  // For "All Items", pass gray for zero-count segments so they appear grayed out
  const pieChartColorsForAllItems = useMemo(() => {
    if (pieChartGroupBy !== 'none') return null;
    return pieChartDistributionData.map((d, i) =>
      (d.realValue !== undefined && d.realValue === 0) ? '#bdbdbd' : PIE_COLORS[i % PIE_COLORS.length]
    );
  }, [pieChartGroupBy, pieChartDistributionData, PIE_COLORS]);

  // Export functions
  const exportGiftDataToCSV = () => {
    if (!inventorySummaryTableData || inventorySummaryTableData.length === 0) return;

    const sections = [];
    
    // Section 0: Export Information
    sections.push('=== EXPORT INFORMATION ===');
    sections.push(`Exported On,"${new Date().toLocaleString()}"`);
    sections.push(`Export Date,"${new Date().toLocaleDateString()}"`);
    sections.push(`Export Time,"${new Date().toLocaleTimeString()}"`);
    sections.push('');
    
    // Section 1: Gift Summary
    sections.push('=== GIFT SUMMARY ===');
    sections.push(`Total Gift Items,${effectiveInventory.length}`);
    sections.push(`Total Guests,${guests.length}`);
    sections.push(`Gifts Selected,${guests.filter(g => g?.giftSelection?.inventoryId).length}`);
    const selectionRate = guests.length > 0 
      ? Math.round((guests.filter(g => g?.giftSelection?.inventoryId).length / guests.length) * 100)
      : 0;
    sections.push(`Selection Rate,${selectionRate}%`);
    sections.push(`Grouped By,"${groupBy === 'style' ? 'Style' : 'Gift Type'}"`);
    sections.push('');
    
    // Section 2: Gift Inventory Summary (aligned with table)
    sections.push('=== GIFT INVENTORY SUMMARY ===');
    const headers = ['Gift', 'Size', 'Gender', 'Color', 'Quantity Before Event', 'Distributed', 'Post Event Count'];
    sections.push(headers.join(','));
    
    const rows = inventorySummaryTableData.map(item => [
      (item.itemLabel || '').replace(/"/g, '""'),
      (item.size || '').replace(/"/g, '""'),
      (item.gender || '').replace(/"/g, '""'),
      (item.color || '').replace(/"/g, '""'),
      item.quantityBeforeEvent !== '—' ? item.quantityBeforeEvent : '',
      item.distributed ?? 0,
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
      if (!inventorySummaryTableData || inventorySummaryTableData.length === 0) return;

      const sections = [];
      
      // Section 0: Export Information
      sections.push('=== EXPORT INFORMATION ===');
      sections.push(`Exported On\t${new Date().toLocaleString()}`);
      sections.push(`Export Date\t${new Date().toLocaleDateString()}`);
      sections.push(`Export Time\t${new Date().toLocaleTimeString()}`);
      sections.push('');
      
      // Section 1: Gift Summary
      sections.push('=== GIFT SUMMARY ===');
      sections.push(`Total Gift Items\t${effectiveInventory.length}`);
      sections.push(`Total Guests\t${guests.length}`);
      sections.push(`Gifts Selected\t${guests.filter(g => g?.giftSelection?.inventoryId).length}`);
      const selectionRate = guests.length > 0 
        ? Math.round((guests.filter(g => g?.giftSelection?.inventoryId).length / guests.length) * 100)
        : 0;
      sections.push(`Selection Rate\t${selectionRate}%`);
      sections.push(`Grouped By\t${groupBy === 'style' ? 'Style' : 'Gift Type'}`);
      sections.push('');
      
      // Section 2: Gift Inventory Summary (aligned with table)
      sections.push('=== GIFT INVENTORY SUMMARY ===');
      const headers = ['Gift', 'Size', 'Gender', 'Color', 'Quantity Before Event', 'Distributed', 'Post Event Count'];
      sections.push(headers.join('\t'));
      
      const rows = inventorySummaryTableData.map(item => [
        item.itemLabel || '',
        item.size || '',
        item.gender || '',
        item.color || '',
        item.quantityBeforeEvent !== '—' ? item.quantityBeforeEvent : '',
        item.distributed ?? 0,
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
      <CardContent sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
        {/* Page header: title + Export (match Event Analytics) */}
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
              Gift Analytics Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Track gift distribution, inventory levels, and guest preferences across all events
            </Typography>
          </Box>
          {canExport && (
            <Button
              variant="contained"
              size="large"
              startIcon={<FileDownloadIcon />}
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              disabled={exporting || !inventorySummaryTableData?.length}
              sx={{ px: 3, py: 1.5 }}
            >
              Export
            </Button>
          )}
        </Box>

        {/* Export Menu - placed outside Box for proper portal rendering */}
        {canExport && (
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={() => setExportMenuAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                setExportMenuAnchor(null);
                setConfirmExportFormat('csv');
                setConfirmExportOpen(true);
              }}
              disabled={exporting || !inventorySummaryTableData?.length}
            >
              Export as CSV
            </MenuItem>
            <MenuItem
              onClick={() => {
                setExportMenuAnchor(null);
                setConfirmExportFormat('xlsx');
                setConfirmExportOpen(true);
              }}
              disabled={exporting || !inventorySummaryTableData?.length}
            >
              Export as XLSX
            </MenuItem>
          </Menu>
        )}
        <Dialog open={confirmExportOpen} onClose={() => { setConfirmExportOpen(false); setConfirmExportFormat(null); }}>
          <DialogTitle>Confirm export</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Export gift analytics ({inventorySummaryTableData?.length ?? 0} inventory {inventorySummaryTableData?.length === 1 ? 'item' : 'items'}) as {confirmExportFormat === 'xlsx' ? 'Excel (XLSX)' : 'CSV'}? A file will be downloaded.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setConfirmExportOpen(false); setConfirmExportFormat(null); }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                if (confirmExportFormat === 'csv') exportGiftDataToCSV();
                else if (confirmExportFormat === 'xlsx') exportGiftDataToExcel();
                setConfirmExportOpen(false);
                setConfirmExportFormat(null);
              }}
            >
              Export
            </Button>
          </DialogActions>
        </Dialog>

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
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={600} color="primary.main" sx={{ mb: 2 }}>
                Quick Summary
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                  gap: 1.5,
                  minWidth: 0,
                  maxWidth: 520
                }}
              >
                <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'primary.main', boxShadow: 'none', minWidth: 0 }}>
                  <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" color="text.secondary">Total Gift Items</Typography>
                    <Typography variant="body1" fontWeight={700} color="primary.main">{effectiveInventory.length}</Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'secondary.main', boxShadow: 'none', minWidth: 0 }}>
                  <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" color="text.secondary">Total Guests</Typography>
                    <Typography variant="body1" fontWeight={700} color="secondary.main">{totalGuests}</Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'success.main', boxShadow: 'none', minWidth: 0 }}>
                  <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" color="text.secondary">Gifts Selected</Typography>
                    <Typography variant="body1" fontWeight={700} color="success.main">{guestsWithGifts}</Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'info.main', boxShadow: 'none', minWidth: 0 }}>
                  <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" color="text.secondary">Selection Rate</Typography>
                    <Typography variant="body1" fontWeight={700} color="info.main">{selectionRate}%</Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          );
        })()}

        {/* SECTION 1: Distribution Chart - chart left, dropdowns right, chips below */}
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 1.5,
              px: 0,
              borderBottom: 1,
              borderColor: 'divider',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' }
            }}
            onClick={() => setChartExpanded(!chartExpanded)}
          >
            <Typography variant="h6" fontWeight={600} color="primary.main">
              Distribution Chart
            </Typography>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setChartExpanded(!chartExpanded); }} aria-label={chartExpanded ? 'Collapse' : 'Expand'}>
              {chartExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          <Collapse in={chartExpanded}>
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'flex-start', mb: 2 }}>
                {/* Left: Chart */}
                <Box sx={{ flex: { xs: '0 0 auto', md: '1 1 50%' }, minWidth: 0, width: '100%' }}>
                  {pieChartDistributionData.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        {pieChartGroupBy === 'none'
                          ? 'No gift items in inventory yet.'
                          : 'No gifts have been distributed yet for the selected grouping and filters.'}
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      {pieChartGroupBy === 'none' && pieChartDistributionData.length > 12 && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Many items — switch to By Category or By Product for a clearer view.
                        </Typography>
                      )}
                      <AnalyticsPieChart
                        data={pieChartDistributionData}
                        dataKey="value"
                        nameKey="name"
                        height={300}
                        innerRadius={60}
                        outerRadius={90}
                        loading={false}
                        showLabel={true}
                        showLegend={pieChartDistributionData.length <= 12}
                        colors={pieChartColorsForAllItems ?? PIE_COLORS}
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
                    </>
                  )}
                </Box>
                {/* Right: Dropdowns aligned right */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: { xs: '0 0 auto', md: '1 1 45%' }, maxWidth: { md: 420 }, minWidth: 0, alignItems: { xs: 'stretch', md: 'flex-start' }, flexShrink: 0 }}>
                  <FormControl size="small" sx={{ minWidth: 260, width: { xs: '100%', md: '100%' }, maxWidth: { md: 320 } }}>
                    <InputLabel>Distribution By</InputLabel>
                    <Select
                      value={pieChartGroupBy}
                      onChange={(e) => {
                        setPieChartGroupBy(e.target.value);
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
                  {pieChartGroupBy !== 'category' && (
                    <FormControl size="small" sx={{ minWidth: 260, width: { xs: '100%', md: '100%' }, maxWidth: { md: 320 } }}>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={pieChartSelectedType}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setPieChartSelectedType(newType);
                          if (newType !== pieChartSelectedType) {
                            setPieChartSelectedStyle('');
                            setPieChartSelectedProduct('');
                          }
                        }}
                        label="Category"
                      >
                        <MenuItem value=""><em>All Categories</em></MenuItem>
                        {pieChartFilterOptions.types.map(type => (
                          <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  {pieChartGroupBy !== 'brand' && (
                    <FormControl size="small" sx={{ minWidth: 260, width: { xs: '100%', md: '100%' }, maxWidth: { md: 320 } }}>
                      <InputLabel>Brand</InputLabel>
                      <Select
                        value={pieChartSelectedStyle}
                        onChange={(e) => {
                          setPieChartSelectedStyle(e.target.value);
                          if (e.target.value !== pieChartSelectedStyle) setPieChartSelectedProduct('');
                        }}
                        label="Brand"
                      >
                        <MenuItem value=""><em>All Brands</em></MenuItem>
                        {Array.from(new Set([
                          ...giftCounts.filter(item => !pieChartSelectedType || item.type === pieChartSelectedType).map(item => item.style),
                          ...(pieChartFilteredGiftData || []).filter(item => !pieChartSelectedType || item.type === pieChartSelectedType).map(item => item.style)
                        ].filter(Boolean))).sort().map(style => (
                          <MenuItem key={style} value={style}>{style}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  {pieChartGroupBy !== 'product' && (
                    <FormControl size="small" sx={{ minWidth: 260, width: { xs: '100%', md: '100%' }, maxWidth: { md: 320 } }}>
                      <InputLabel>Product</InputLabel>
                      <Select
                        value={pieChartSelectedProduct}
                        onChange={(e) => setPieChartSelectedProduct(e.target.value)}
                        label="Product"
                      >
                        <MenuItem value=""><em>All Products</em></MenuItem>
                        {availableProducts.map(product => (
                          <MenuItem key={product} value={product}>{product}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Box>
              </Box>
              {/* Filters below: segment chips */}
              {pieChartDistributionData.length > 0 && (
                <Box sx={{ mt: 2, maxHeight: 72, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 1, alignContent: 'flex-start' }}>
                  <Chip
                    label="Clear All"
                    size="small"
                    onClick={() => setSelectedSegments([])}
                    color={selectedSegments.length === 0 ? 'primary' : 'default'}
                    sx={{ fontSize: '0.7rem', cursor: 'pointer', fontWeight: selectedSegments.length === 0 ? 600 : 400 }}
                  />
                  {pieChartDistributionData.map((item, idx) => {
                    const isSelected = selectedSegments.includes(item.name);
                    const displayValue = item.realValue !== undefined ? item.realValue : item.value;
                    return (
                      <Chip
                        key={idx}
                        label={`${item.name}: ${displayValue}`}
                        size="small"
                        onClick={() => {
                          setSelectedSegments(prev =>
                            prev.includes(item.name) ? prev.filter(name => name !== item.name) : [...prev, item.name]
                          );
                        }}
                        color={isSelected ? 'primary' : 'default'}
                        sx={{ fontSize: '0.7rem', cursor: 'pointer', fontWeight: isSelected ? 600 : 400, opacity: selectedSegments.length === 0 || isSelected ? 1 : 0.5 }}
                      />
                    );
                  })}
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>

        {/* SECTION 2: Inventory Summary Table */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} color="primary.main" sx={{ mb: 2 }}>
            Inventory Summary Table
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center', justifyContent: 'flex-start' }}>
            <TextField
              size="small"
              placeholder="Search by item, event, size, gender, color..."
              value={tableSearchQuery}
              onChange={(e) => { setTableSearchQuery(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
              sx={{ minWidth: { xs: '100%', sm: 320 }, width: { xs: '100%', sm: 420 } }}
            />
          </Box>
          {isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {filteredGiftCounts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No items match your search.</Typography>
              ) : (
                filteredGiftCounts
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, idx) => (
                    <Card key={row.inventoryId || idx} variant="outlined" sx={{ borderLeft: 3, borderLeftColor: row.distributed > 0 ? 'success.main' : 'divider' }}>
                      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 0.5 }}>
                          <Chip
                            label={row.type}
                            size="small"
                            sx={{
                              alignSelf: 'flex-start',
                              bgcolor: getCategoryChipColor(row.type),
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.75rem'
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                            {row.style}
                          </Typography>
                          {row.product && row.product !== UNKNOWN_LABEL && (
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {row.product}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, typography: 'body2', color: 'text.secondary' }}>
                          <span>Size: {row.size}</span>
                          <span>Gender: {row.gender}</span>
                          <span>Color: {row.color}</span>
                          <span>Qty Before Event: {row.quantityBeforeEvent}</span>
                          <span>Distributed: <strong style={{ color: row.distributed > 0 ? undefined : 'inherit' }}>{row.distributed}</strong></span>
                          <span>Post event: {row.postEventCount}</span>
                        </Box>
                      </CardContent>
                    </Card>
                  ))
              )}
              <TablePagination
                component="div"
                count={filteredGiftCounts.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Rows per page:"
                sx={{ borderTop: 1, borderColor: 'divider' }}
              />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined" sx={{ minWidth: 600, overflowX: 'auto', maxHeight: 440 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider', py: 1.5 }}>Gift</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider', py: 1.5 }}>Size</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider', py: 1.5 }}>Gender</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider', py: 1.5 }}>Color</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider', py: 1.5 }}>Quantity Before Event</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider', py: 1.5 }}>Distributed</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider', py: 1.5 }}>Post Event Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredGiftCounts
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((row, idx) => (
                        <TableRow
                          key={row.inventoryId || idx}
                          hover
                          sx={{
                            '&:nth-of-type(even)': { bgcolor: 'action.hover' },
                            '&:hover': { bgcolor: 'action.selected' }
                          }}
                        >
                          <TableCell sx={{ py: 1.25 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                              <Chip
                                label={row.type}
                                size="small"
                                sx={{
                                  alignSelf: 'flex-start',
                                  bgcolor: getCategoryChipColor(row.type),
                                  color: 'white',
                                  fontWeight: 600,
                                  fontSize: '0.75rem'
                                }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                                {row.style}
                              </Typography>
                              {row.product && row.product !== UNKNOWN_LABEL && (
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {row.product}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 1.25 }}>{row.size}</TableCell>
                          <TableCell sx={{ py: 1.25 }}>{row.gender}</TableCell>
                          <TableCell sx={{ py: 1.25 }}>{row.color}</TableCell>
                          <TableCell sx={{ py: 1.25 }}>{row.quantityBeforeEvent}</TableCell>
                          <TableCell sx={{ py: 1.25, fontWeight: row.distributed > 0 ? 600 : 400, color: row.distributed > 0 ? 'success.main' : 'text.primary' }}>{row.distributed}</TableCell>
                          <TableCell sx={{ py: 1.25 }}>{row.postEventCount}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filteredGiftCounts.length}
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
            </>
          )}
        </Box>

      </CardContent>
    </Card>
  );
};

export default GiftAnalytics;