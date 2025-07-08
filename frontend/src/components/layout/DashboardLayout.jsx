import React, { useState } from 'react';
import Dashboard from '../dashboard/Dashboard';

const DashboardLayout = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);

  return <Dashboard selectedEvent={selectedEvent} />;
};

export default DashboardLayout; 