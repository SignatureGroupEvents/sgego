import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Button,
  TextField,
  Grid,
  Paper,
  Container
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import MainLayout from '../../components/layout/MainLayout';
import GiftAnalytics from '../../components/dashboard/AdvancedDashboardTabs/GiftAnalytics';
import EventAnalytics from '../../components/dashboard/AdvancedDashboardTabs/EventAnalytics';
import ActivityFeed from '../../components/dashboard/AdvancedDashboardTabs/ActivityFeed';
import EventHeader from '../../components/events/EventHeader';
import { useParams } from 'react-router-dom';
import { getEvent } from '../../services/events';
import { getGuests, fetchInventory } from '../../services/api';
import api from '../../services/api';

const AdvancedDashboard = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [parentEvent, setParentEvent] = useState(null);
  const [secondaryEvents, setSecondaryEvents] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [guests, setGuests] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    if (eventId) {
      const fetchAllData = async () => {
        try {
          // Fetch event data first
          const eventData = await getEvent(eventId);
          setEvent(eventData);
          
          // Fetch parent event if this is a secondary event
          let mainEvent = eventData;
          if (eventData.parentEventId) {
            const parent = await getEvent(eventData.parentEventId);
            setParentEvent(parent);
            mainEvent = parent;
          } else {
            setParentEvent(eventData);
          }

          // Fetch secondary events for the main event
          const response = await api.get(`/events?parentEventId=${mainEvent._id}`);
          setSecondaryEvents(response.data.events || response.data);

          // Fetch guests and inventory in parallel
          const [guestsRes, inventoryRes] = await Promise.all([
            getGuests(eventId),
            fetchInventory(eventId)
          ]);
          
          setGuests(guestsRes.data?.guests || guestsRes.data || []);
          setInventory(inventoryRes.data?.inventory || inventoryRes.data || []);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };

      fetchAllData();
    }
  }, [eventId]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const renderTabContent = () => {
    switch (tabValue) {
      case 0:
        return <GiftAnalytics guests={guests} inventory={inventory} />;
      case 1:
        return <EventAnalytics eventId={eventId} />;
      case 2:
        return <ActivityFeed />;
      default:
        return <GiftAnalytics guests={guests} inventory={inventory} />;
    }
  };

  return (
    <MainLayout eventName={event?.eventName || 'Loading Event...'} parentEventName={parentEvent && parentEvent._id !== event?._id ? parentEvent.eventName : null} parentEventId={parentEvent && parentEvent._id !== event?._id ? parentEvent._id : null}>
      <EventHeader event={event} mainEvent={parentEvent} secondaryEvents={secondaryEvents} />
      <Container maxWidth="xl" sx={{ py: 3 }}>

      {/* Tabs Section */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 64,
              fontSize: '1rem',
              fontWeight: 500,
            },
          }}
        >
          <Tab label="Gift Analytics" />
          <Tab label="Event Analytics" />
          <Tab label="Activity" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ minHeight: '500px' }}>
        {renderTabContent()}
      </Box>
      </Container>
    </MainLayout>
  );
};

export default AdvancedDashboard; 