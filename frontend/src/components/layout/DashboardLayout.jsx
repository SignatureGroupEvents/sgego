import React, { useState } from 'react';
import Box from '@mui/material/Box';
import MainNavigation from './MainNavigation';
import Dashboard from '../dashboard/Dashboard';

const DashboardLayout = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainNavigation />
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Dashboard selectedEvent={selectedEvent} />
      </Box>
    </Box>
  );
};

export default DashboardLayout; 