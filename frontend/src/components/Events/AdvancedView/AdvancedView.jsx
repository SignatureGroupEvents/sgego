import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Card, CardContent, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { CardGiftcard as GiftIcon, Event as EventIcon } from '@mui/icons-material';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import CheckedInGuestsChart from './CheckedInGuestChart';


const AdvancedView = ({ event, guests, secondaryEvents, inventory = [], onInventoryChange }) => {
    const [activeTab, setActiveTab] = useState(0);
    const theme = useTheme();
  
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

    return (
      <Box>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tab icon={<GiftIcon />} label="Gift Analytics" iconPosition="start" />
          <Tab icon={<EventIcon />} label="Event Analytics" iconPosition="start" />
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
        {activeTab === 1 && (
          <Box>
            <CheckedInGuestsChart guests={guests} />
          </Box>
        )}
      </Box>
    );
  };

  export default AdvancedView;