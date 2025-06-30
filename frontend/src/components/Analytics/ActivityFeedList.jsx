import React from 'react';
import { Box, Typography, CircularProgress, MenuItem, Select, InputLabel, FormControl, Paper, useTheme } from '@mui/material';
import ActivityFeedEntry from './ActivityFeedEntry';

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'checkin', label: 'Check-In' },
  { value: 'inventory_update', label: 'Inventory Update' },
  { value: 'allocation_update', label: 'Allocation Update' },
  { value: 'note', label: 'Note' },
  { value: 'event_create', label: 'Event Created' },
  { value: 'event_update', label: 'Event Updated' },
  { value: 'test', label: 'Test' },
  { value: 'other', label: 'Other' },
];

export default function ActivityFeedList({ logs, loading, filterType, onFilterTypeChange }) {
  const theme = useTheme();

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Filter Section */}
      <Paper 
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 3, 
          boxShadow: theme.shadows[1],
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            Activity Feed
          </Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Type</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => onFilterTypeChange(e.target.value)}
              label="Filter by Type"
              sx={{ borderRadius: 2 }}
            >
              {typeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty State */}
      {!loading && logs.length === 0 && (
        <Paper 
          sx={{ 
            p: 4, 
            textAlign: 'center', 
            borderRadius: 3,
            boxShadow: theme.shadows[1],
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <Typography variant="h6" sx={{ color: theme.palette.text.secondary, mb: 1 }}>
            No activity yet
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.disabled }}>
            Activity will appear here as users perform actions in the system
          </Typography>
        </Paper>
      )}

      {/* Activity Feed */}
      {!loading && logs.length > 0 && (
        <Box>
          <Typography 
            variant="body2" 
            sx={{ 
              color: theme.palette.text.secondary, 
              mb: 2, 
              textAlign: 'center',
              fontSize: '0.85rem'
            }}
          >
            Showing {logs.length} activity {logs.length === 1 ? 'item' : 'items'}
          </Typography>
          
          <Box>
            {logs.map((log, index) => (
              <ActivityFeedEntry key={log._id || index} log={log} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
} 