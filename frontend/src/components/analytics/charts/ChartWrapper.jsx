import React from 'react';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { ResponsiveContainer } from 'recharts';

/**
 * ChartWrapper - Common wrapper for all analytics charts
 * Provides consistent loading, error, and empty states
 */
const ChartWrapper = ({ 
  children, 
  loading = false, 
  error = null, 
  empty = false, 
  emptyMessage = 'No data available',
  height = 300,
  minHeight = 200
}) => {
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height,
          minHeight
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (empty) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height,
          minHeight,
          color: 'text.secondary'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height} minHeight={minHeight}>
      {children}
    </ResponsiveContainer>
  );
};

export default ChartWrapper;

