import React from 'react';
import {
  Typography,
  Alert,
  Box
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import MainLayout from '../layout/MainLayout';
import MyEventsBoard from './MyEventsBoard';
import UpcomingEventsCalendar from './UpcomingEventsCalendar';

const Dashboard = ({ selectedEvent }) => {
  const { user } = useAuth();

  return (
    <MainLayout>
      <Box sx={{ my: 2 }}>
        {selectedEvent && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Viewing event: <strong>{selectedEvent.eventName}</strong>
          </Alert>
        )}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">
            Welcome, {user?.username}! 👋
          </Typography>
        </Box>



        {/* My Events Board */}
        <MyEventsBoard />

        {/* Upcoming Events Calendar */}
        <UpcomingEventsCalendar />
      </Box>
    </MainLayout>
  );
};

export default Dashboard;