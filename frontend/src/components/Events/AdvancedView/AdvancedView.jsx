import React from 'react';
import { Box, Typography, Tabs, Tab, Card, CardContent, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { getEventActivityFeed } from '../../../services/api';
import { CardGiftcard as GiftIcon, Inventory as InventoryIcon, Info as InfoIcon } from '@mui/icons-material';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import FulfillmentInventoryTable from './FulfillmentInventoryTable';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import CheckedInGuestsChart from './CheckedInGuestChart';       // This is the new checked in guests chart that is now in the AdvancedView component  // REMOVE THIS LATER  //
import GiftStyleBreakdownTable from './GiftStyleBreakdownTable';


const AdvancedView = ({ event, guests, secondaryEvents, inventory = [], onInventoryChange }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [feedLogs, setFeedLogs] = useState([]);
    const [feedLoading, setFeedLoading] = useState(false);
    const [feedType, setFeedType] = useState('');
    const theme = useTheme();
    const { eventId } = event || {};
  
    // Fetch activity feed logs for this event
    const fetchFeed = async () => {
      if (!event?._id) return;
      setFeedLoading(true);
      try {
        const res = await getEventActivityFeed(event._id, feedType ? { type: feedType } : {});
        // Event feed logs loaded
        setFeedLogs(res.data.logs || []);
      } catch (err) {
        console.error('Error loading event feed:', err);
        setFeedLogs([]);
      } finally {
        setFeedLoading(false);
      }
    };
  
    useEffect(() => {
      fetchFeed();
    }, [event?._id, feedType]);
  
    // Refresh activity feed when inventory changes
    useEffect(() => {
      if (activeTab === 2) { // Only refresh if on activity feed tab
        fetchFeed();
      }
    }, [inventory, activeTab]); // Refresh when inventory or active tab changes
  
    // Group inventory by type+style for analytics
    const groupedByTypeStyle = inventory.reduce((acc, item) => {
      if (!item.type || !item.style) return acc;
      const key = `${item.type} - ${item.style}`;
      if (!acc[key]) acc[key] = 0;
      acc[key] += item.currentInventory || 0;
      return acc;
    }, {});
  
    // For PieChart: [{ name, value }]
    const giftSelectionData = Object.entries(groupedByTypeStyle).map(([name, value]) => ({ name, value }));
  
    // For GiftStyleBreakdownTable: [{ type, style, quantity }]
    const giftStyleBreakdown = inventory.filter(item => item.type && item.style).map(item => ({
      type: item.type,
      style: item.style,
      quantity: item.currentInventory || 0,
      status: 'Active', // You can add real status if available
    }));
  
    // Use theme palette for pie chart colors
    const pieColors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      theme.palette.error.main,
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'
    ];
  
    // Calculate stats using eventCheckins as source of truth
    const totalGuests = guests.length;
    const checkedInGuests = guests.filter(g => 
      g.eventCheckins && g.eventCheckins.length > 0 && 
      g.eventCheckins.some(ec => ec.checkedIn === true)
    ).length;
    const pendingGuests = totalGuests - checkedInGuests;
    const checkInPercentage = totalGuests > 0 ? Math.round((checkedInGuests / totalGuests) * 100) : 0;
  
    // Handler to update notes
    const handleNoteUpdate = async (inventoryId, newNote) => {
      try {
        await api.put(`/inventory/${inventoryId}`, { notes: newNote });
        if (onInventoryChange) onInventoryChange();
        // Refresh activity feed after note update
        fetchFeed();
      } catch (err) {
        alert('Failed to update note.');
      }
    };
  
    return (
      <Box>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tab icon={<GiftIcon />} label="Gift Analytics" iconPosition="start" />
          <Tab icon={<InventoryIcon />} label="Inventory & Fulfillment" iconPosition="start" />
          <Tab icon={<InfoIcon />} label="Feed" iconPosition="start" />
        </Tabs>
        {activeTab === 0 && (
          <Box>
            {/* Gift Style Breakdown Table and PieChart */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Gift Selections by Style
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Gift Type</TableCell>
                        <TableCell>Style</TableCell>
                        <TableCell align="right">Quantity Remaining</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {giftStyleBreakdown.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{row.type}</TableCell>
                          <TableCell>{row.style}</TableCell>
                          <TableCell align="right">{row.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={giftSelectionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {giftSelectionData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Box>
        )}
        {activeTab === 1 && <FulfillmentInventoryTable inventory={inventory} />}
        {activeTab === 2 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Event Activity Feed</Typography>
              <Tooltip title="Refresh Activity Feed">
                <IconButton onClick={fetchFeed} disabled={feedLoading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  export default AdvancedView;