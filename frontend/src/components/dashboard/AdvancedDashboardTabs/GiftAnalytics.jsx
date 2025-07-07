import React, { useMemo, useState } from 'react';
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
  MenuItem
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '@mui/material/styles';

const GiftAnalytics = ({ inventory = [] }) => {
  const theme = useTheme();
  const [filterType, setFilterType] = useState('all');

  // 🎯 Group by type+style with counts
  const grouped = useMemo(() => {
    const map = {};
    for (const item of inventory) {
      if (!item.type || !item.style) continue;
      if (filterType !== 'all' && item.type !== filterType) continue;

      const key = `${item.type} - ${item.style}`;
      map[key] = (map[key] || 0) + (item.currentInventory || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [inventory, filterType]);

  // 🎯 Raw table version
  const tableData = useMemo(() => {
    return inventory
      .filter(item => item.type && item.style)
      .filter(item => filterType === 'all' || item.type === filterType)
      .map(item => ({
        type: item.type,
        style: item.style,
        quantity: item.currentInventory || 0
      }));
  }, [inventory, filterType]);

  const pieColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'
  ];

  const uniqueTypes = Array.from(new Set(inventory.map(i => i.type).filter(Boolean)));

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" fontWeight={600}>
            Gift Selection Breakdown
          </Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Type</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Filter by Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              {uniqueTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* 📋 Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Gift Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Style</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableData.map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{row.style}</TableCell>
                  <TableCell align="right">{row.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 📊 Pie Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={grouped}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {grouped.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default GiftAnalytics;
