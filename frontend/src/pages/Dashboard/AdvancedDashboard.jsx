import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Container,
  Card,
  CardActionArea
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  Event as EventIcon,
  Feed as FeedIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import MainLayout from '../../components/layout/MainLayout';
import GiftAnalytics from '../../components/dashboard/AdvancedDashboardTabs/GiftAnalytics';
import EventAnalytics from '../../components/dashboard/AdvancedDashboardTabs/EventAnalytics';
import ActivityFeed from '../../components/dashboard/AdvancedDashboardTabs/ActivityFeed';
import EventHeader from '../../components/Events/EventHeader';
import { useParams, useNavigate } from 'react-router-dom';
import { getEvent } from '../../services/events';
import { getGuests, fetchInventory } from '../../services/api';
import api from '../../services/api';
import { useTheme } from '@mui/material/styles';

const AdvancedDashboard = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [event, setEvent] = useState(null);
  const [parentEvent, setParentEvent] = useState(null);
  const [secondaryEvents, setSecondaryEvents] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null); // null = selection page, 'gift' | 'event' | 'activity'
  const [refreshKey, setRefreshKey] = useState(0);
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
            getGuests(eventId, true),
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

  const handleModuleSelect = (module) => {
    // All modules show directly within the same route (no separate navigation)
    setSelectedModule(module);
  };

  const handleBackToSelection = () => {
    setSelectedModule(null);
  };

  // Module Selection Page
  if (!selectedModule) {
    return (
      <MainLayout 
        eventName={event?.eventName || 'Loading Event...'} 
        parentEventName={parentEvent && parentEvent._id !== event?._id ? parentEvent.eventName : null} 
        parentEventId={parentEvent && parentEvent._id !== event?._id ? parentEvent._id : null}
      >
        <EventHeader event={event} mainEvent={parentEvent} secondaryEvents={secondaryEvents} />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
            Advanced Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Select an analytics module to view detailed insights
          </Typography>

          <Grid container spacing={3}>
            {/* Gift Analytics Module */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card 
                elevation={3}
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  }
                }}
                onClick={() => handleModuleSelect('gift')}
              >
                <CardActionArea sx={{ height: '100%', p: 3 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <AnalyticsIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      Gift Analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      View gift distribution, categories, and performance metrics
                    </Typography>
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>

            {/* Event Analytics Module */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card 
                elevation={3}
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  }
                }}
                onClick={() => handleModuleSelect('event')}
              >
                <CardActionArea sx={{ height: '100%', p: 3 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <EventIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      Event Analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Track check-ins, attendance patterns, and guest activity
                    </Typography>
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>

            {/* Activity Feed Module */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card 
                elevation={3}
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  }
                }}
                onClick={() => handleModuleSelect('activity')}
              >
                <CardActionArea sx={{ height: '100%', p: 3 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <FeedIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      Activity Feed
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Real-time activity log: who did what and when
                    </Typography>
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>

            {/* Comprehensive Analytics Module - Hidden until fully set up */}
            {/* <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card 
                elevation={3}
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: `2px solid ${theme.palette.primary.main}`,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  }
                }}
                onClick={() => handleModuleSelect('comprehensive')}
              >
                <CardActionArea sx={{ height: '100%', p: 3 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <AssessmentIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      Comprehensive Analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Complete overview with charts, stats, and combined event data
                    </Typography>
                  </Box>
                </CardActionArea>
              </Card>
            </Grid> */}
          </Grid>
        </Container>
      </MainLayout>
    );
  }

  // Show selected module directly (no tabs)
  const renderModuleContent = () => {
    switch (selectedModule) {
      case 'gift':
        return <GiftAnalytics event={event} guests={guests} inventory={inventory} refreshKey={refreshKey} />;
      case 'event':
        return <EventAnalytics eventId={eventId} refreshKey={refreshKey} />;
      case 'activity':
        return <ActivityFeed refreshKey={refreshKey} />;
      default:
        return null;
    }
  };

  return (
    <MainLayout eventName={event?.eventName || 'Loading Event...'} parentEventName={parentEvent && parentEvent._id !== event?._id ? parentEvent.eventName : null} parentEventId={parentEvent && parentEvent._id !== event?._id ? parentEvent._id : null}>
      <EventHeader event={event} mainEvent={parentEvent} secondaryEvents={secondaryEvents} />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Back + Refresh — default primary button style for consistency */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button
            onClick={handleBackToSelection}
            variant="outlined"
            color="primary"
            size="large"
            startIcon={<ArrowBackIcon />}
          >
            Back to Analytics Modules
          </Button>
          <Button
            onClick={() => setRefreshKey(k => k + 1)}
            variant="contained"
            color="primary"
            size="large"
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
        </Box>

        {/* Module Content */}
      <Box sx={{ minHeight: '500px' }}>
          {renderModuleContent()}
      </Box>
      </Container>
    </MainLayout>
  );
};

export default AdvancedDashboard; 