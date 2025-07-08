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
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '@mui/material/styles';

const GiftAnalytics = ({ guests = [], inventory = [] }) => {
  const theme = useTheme();
  const [filterType, setFilterType] = useState('all');

  // 🔢 Count gifts by inventoryId from guest selections
  const giftCounts = useMemo(() => {
    const map = {};

    guests.forEach((guest) => {
      const id = guest?.giftSelection?.inventoryId;
      if (!id) return;
      map[id] = (map[id] || 0) + 1;
    });

  // Include all inventory, even if not selected
return inventory.map((inv) => {
  const inventoryId = inv._id;
  const count = map[inventoryId] || 0;

  return {
    inventoryId,
    type: inv?.type || 'Unknown',
    style: inv?.style || 'Unknown',
    size: inv?.size || '—',
    count,
    name: `${inv?.type || 'Unknown'} - ${inv?.style || 'Unknown'}`
  };
});

  }, [guests, inventory]);

  // 🧼 Filtered + grouped for pie chart
  const grouped = useMemo(() => {
    return giftCounts
      .filter((g) => filterType === 'all' || g.type === filterType)
      .map(({ name, count }) => ({ name, value: count }));
  }, [giftCounts, filterType]);

  // 📋 Table version
  const tableData = useMemo(() => {
    return giftCounts.filter((g) => filterType === 'all' || g.type === filterType);
  }, [giftCounts, filterType]);

  const pieColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'
  ];

  const uniqueTypes = Array.from(new Set(giftCounts.map(i => i.type).filter(Boolean)));

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" fontWeight={600}>
            Gift Selections Breakdown
          </Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Type</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Filter by Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              {uniqueTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* 🚫 Empty State */}
        {!giftCounts.length && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No gift selections found for this event yet.
          </Alert>
        )}

        {/* 📋 Table */}
        {giftCounts.length > 0 && (
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Gift Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Style</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Total Selected</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableData.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.style}</TableCell>
                    <TableCell>{row.size}</TableCell>
                    <TableCell align="right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* 📊 Pie Chart */}
        {grouped.length > 0 && (
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
        )}
      </CardContent>
    </Card>
  );
};

export default GiftAnalytics;
