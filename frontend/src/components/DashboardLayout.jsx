import React, { useState } from 'react';
import Box from '@mui/material/Box';
import SidebarEventsList from './Events/SidebarEventsList';
import Dashboard from './Dashboard';

const DashboardLayout = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <SidebarEventsList onSelectEvent={setSelectedEvent} />
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Dashboard selectedEvent={selectedEvent} />
      </Box>
    </Box>
  );
};

export default DashboardLayout; 