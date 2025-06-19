import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, Button, Alert, CircularProgress } from '@mui/material';
import TopNavBar from '../TopNavBar';
import SidebarEventsList from './SidebarEventsList';
import { getEvents } from '../../services/events';
import EventCard from './EventCard';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import HomeIcon from '@mui/icons-material/Home';
import EventIcon from '@mui/icons-material/Event';

const EventsList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { isOperationsManager, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        const res = await getEvents();
        setEvents(res.events || res);
      } catch (err) {
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    fetchAllEvents();
  }, []);

  const mainEvents = events.filter(ev => ev.isMainEvent);
  const secondaryEvents = parentId => events.filter(ev => ev.parentEventId === parentId);

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress size={60} /></Box>;
  }

  return (
    <Box sx={{ p: 0 }}>
      <TopNavBar breadcrumbs={[
        { label: 'Home', to: '/dashboard', icon: <HomeIcon /> },
        { label: 'Events', to: '/events', icon: <EventIcon /> }
      ]} />
      <Box sx={{ p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" gutterBottom>🎪 Events</Typography>
            <Typography variant="subtitle1" color="textSecondary">Manage your events and check-in sessions</Typography>
          </Box>
          {(isOperationsManager || isAdmin) && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/events/new')}
              size="large"
            >
              Create Event
            </Button>
          )}
        </Box>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        <Grid container spacing={3}>
          {mainEvents.map(main => (
            <Grid item xs={12} sm={6} lg={4} key={main._id}>
              <EventCard event={main} secondaryEvents={secondaryEvents(main._id)} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default EventsList;