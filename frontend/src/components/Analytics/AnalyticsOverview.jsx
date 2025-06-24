import React from 'react';
import { Box } from '@mui/material';
import MainNavigation from '../MainNavigation';
import AnalyticsDashboard from './AnalyticsDashboard';

const AnalyticsOverview = () => {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainNavigation />
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <AnalyticsDashboard />
      </Box>
    </Box>
  );
};

export default AnalyticsOverview; 