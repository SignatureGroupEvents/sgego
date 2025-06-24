import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, Button, Alert, CircularProgress } from '@mui/material';
import MainNavigation from '../MainNavigation';
import { getEvents } from '../../services/events';
import { getUserAssignedEvents } from '../../services/events';
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
        let allEvents = res.events || res;
        
        // If user is staff, filter to only show assigned events
        if (!isOperationsManager && !isAdmin) {
          try {
            const assignedEvents = await getUserAssignedEvents();
            const assignedEventIds = assignedEvents.map(e => e._id);
            allEvents = allEvents.filter(event => assignedEventIds.includes(event._id));
          } catch (err) {
            console.error('Failed to load assigned events:', err);
            setError('Failed to load your assigned events.');
            return;
          }
        }
        
        setEvents(allEvents);
      } catch (err) {
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    fetchAllEvents();
  }, [isOperationsManager, isAdmin]);

  const mainEvents = events.filter(ev => ev.isMainEvent);
  const secondaryEvents = parentId => events.filter(ev => ev.parentEventId === parentId);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <MainNavigation />
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainNavigation />
      <Box sx={{ flex: 1, overflow: 'auto', p: 4 }}>
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