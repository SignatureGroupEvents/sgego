import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Container,
  Card,
  CardActionArea,
  CircularProgress,
  Alert
} from '@mui/material';
import { Analytics as AnalyticsIcon, Event as EventIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/layout/PortalLayout';
import GiftAnalytics from '../../components/dashboard/AdvancedDashboardTabs/GiftAnalytics';
import EventAnalytics from '../../components/dashboard/AdvancedDashboardTabs/EventAnalytics';
import { AnalyticsApiProvider } from '../../contexts/AnalyticsApiContext';
import {
  getPortalEventId,
  hasPortalSession,
  getPortalEvent,
  getPortalGuests,
  getPortalInventory,
  getPortalAllEventAnalytics
} from '../../services/portalApi';

export default function PortalAdvancedPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedModule, setSelectedModule] = useState(null);

  useEffect(() => {
    if (getPortalEventId() !== eventId || !hasPortalSession()) {
      navigate(`/portal/${eventId}/login`, { replace: true });
      return;
    }

    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const [eventData, guestsRes, inventoryRes] = await Promise.all([
          getPortalEvent(eventId),
          getPortalGuests(eventId, true),
          getPortalInventory(eventId)
        ]);
        setEvent(eventData);
        setGuests(guestsRes.guests || []);
        setInventory(inventoryRes.inventory || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [eventId, navigate]);

  if (getPortalEventId() !== eventId || !hasPortalSession()) {
    return null;
  }

  const handleModuleSelect = (module) => setSelectedModule(module);
  const handleBackToSelection = () => setSelectedModule(null);
  const handleBackToDashboard = () => navigate(`/portal/${eventId}/dashboard`, { replace: true });

  const renderContent = () => {
    switch (selectedModule) {
      case 'gift':
        return <GiftAnalytics event={event} guests={guests} inventory={inventory} />;
      case 'event':
        return <EventAnalytics eventId={eventId} isPortalView />;
      default:
        return null;
    }
  };

  return (
    <AnalyticsApiProvider value={getPortalAllEventAnalytics}>
      <PortalLayout eventName={event?.eventName || 'Event'}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Container maxWidth="md" sx={{ py: 4 }}>
            <Alert severity="error" action={<Button color="inherit" size="small" onClick={handleBackToDashboard}>Back to dashboard</Button>}>
              {error}
            </Alert>
          </Container>
        ) : !selectedModule ? (
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Button
              onClick={handleBackToDashboard}
              startIcon={<ArrowBackIcon />}
              sx={{ mb: 2, color: 'text.secondary' }}
            >
              Back to dashboard
            </Button>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
              Advanced Analytics
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Select an analytics module to view detailed insights
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card
                  elevation={3}
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
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

              <Grid size={{ xs: 12, md: 6 }}>
                <Card
                  elevation={3}
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
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
            </Grid>
          </Container>
        ) : (
          <Container maxWidth="xl" sx={{ py: 3 }}>
            <Button
              onClick={selectedModule ? handleBackToSelection : handleBackToDashboard}
              variant="outlined"
              color="primary"
              size="large"
              sx={{ mb: 3 }}
              startIcon={<ArrowBackIcon />}
            >
              {selectedModule ? 'Back to Analytics Modules' : 'Back to dashboard'}
            </Button>
            <Box sx={{ minHeight: 500 }}>{renderContent()}</Box>
          </Container>
        )}
      </PortalLayout>
    </AnalyticsApiProvider>
  );
}
