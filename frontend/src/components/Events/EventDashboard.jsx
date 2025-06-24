import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, Button, Alert, Table, TableBody, TableCell, TableContainer, TablePagination, TableHead, TableRow, Paper, IconButton, LinearProgress, Drawer, CardHeader, Switch, FormControlLabel } from '@mui/material';
import { CheckCircle as CheckCircleIcon, Person as PersonIcon, Groups as GroupsIcon, Assessment as AssessmentIcon, Event as EventIcon, Home as HomeIcon, Menu as MenuIcon, Upload as UploadIcon, PersonAdd as PersonAddIcon, Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon, PeopleAlt as PeopleAltIcon, HourglassEmpty as HourglassEmptyIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api, { fetchInventory } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import MainNavigation from '../MainNavigation';
import AddSecondaryEventModal from './AddSecondaryEventModal';
import { getEvent } from '../../services/events';
import InventoryPage from '../Inventory/InventoryPage';
import GuestCheckIn from '../Guest/GuestCheckIn';

const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h3" component="div" color={color}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ backgroundColor: `${color}.light`, borderRadius: 2, p: 1.5 }}>
          {React.cloneElement(icon, { sx: { fontSize: 28, color: `${color}.main` } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const GuestTable = ({ guests, onAddGuest, onUploadGuests, event }) => {
  const [checkInGuest, setCheckInGuest] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpenCheckIn = (guest) => {
    setCheckInGuest(guest);
    setModalOpen(true);
  };
  const handleCloseCheckIn = () => {
    setCheckInGuest(null);
    setModalOpen(false);
  };

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (guests.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <GroupsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No guests added yet
          </Typography>
          <Typography color="textSecondary" paragraph>
            Get started by uploading a guest list or adding guests manually.
          </Typography>
          <Box display="flex" gap={2} justifyContent="center">
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={onUploadGuests}
            >
              Upload CSV/Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={onAddGuest}
            >
              Add Guest Manually
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Guest List ({guests.length})
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={onUploadGuests}
                size="small"
              >
                Upload More
              </Button>
              <Button
                variant="outlined"
                startIcon={<PersonAddIcon />}
                onClick={onAddGuest}
                size="small"
              >
                Add Guest
              </Button>
            </Box>
          </Box>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell /> {/* Check-in action column */}
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Tags</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {guests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((guest) => (
                  <TableRow key={guest._id} hover>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleOpenCheckIn(guest)}
                      >
                        Check In
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {guest.firstName} {guest.lastName}
                      </Typography>
                      {guest.jobTitle && (
                        <Typography variant="caption" color="textSecondary">
                          {guest.jobTitle}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{guest.email || 'No email'}</TableCell>
                    <TableCell>{guest.company || '-'}</TableCell>
                    <TableCell>{guest.attendeeType || 'General'}</TableCell>
                    <TableCell>
                      <Chip
                        label={guest.hasCheckedIn ? 'Checked In' : 'Pending'}
                        color={guest.hasCheckedIn ? 'success' : 'default'}
                        size="small"
                        icon={guest.hasCheckedIn ? <CheckCircleIcon /> : <PersonIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {guest.tags?.map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag.name}
                            size="small"
                            sx={{
                              backgroundColor: tag.color,
                              color: 'white',
                              fontSize: '0.7rem'
                            }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
      <TablePagination
        component="div"
        count={guests.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="Guests per page"
        sx={{ mt: 2 }}
      />
      {/* Check-in Modal */}
      {modalOpen && checkInGuest && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(0,0,0,0.2)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card sx={{ minWidth: 400, p: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Check In Guest</Typography>
                <Button onClick={handleCloseCheckIn} size="small">Close</Button>
              </Box>
              <GuestCheckIn event={event} guest={checkInGuest} onClose={handleCloseCheckIn} />
            </CardContent>
          </Card>
        </Box>
      )}
    </>
  );
};

const EventDashboard = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [error, setError] = useState('');
  const [secondaryModalOpen, setSecondaryModalOpen] = useState(false);
  const [secondaryEvents, setSecondaryEvents] = useState([]);
  const [parentEvent, setParentEvent] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [giftTrackerCollapsed, setGiftTrackerCollapsed] = useState(true); // Collapsed by default
  const [inventoryViewMode, setInventoryViewMode] = useState('basic');
  const [inventoryExpanded, setInventoryExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);
        const eventData = await getEvent(eventId);
        setEvent(eventData);
        
        // If this is a secondary event, fetch the parent event
        if (eventData.parentEventId) {
          try {
            const parentData = await getEvent(eventData.parentEventId);
            setParentEvent(parentData);
          } catch (error) {
            console.error('Error fetching parent event:', error);
          }
        }
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to fetch event');
      } finally {
        setLoading(false);
      }
    };

    const fetchGuests = async (mainEventId) => {
      try {
        const response = await api.get(`/guests?eventId=${mainEventId}`);
        setGuests(response.data.guests || []);
      } catch (error) {
        console.error('Error fetching guests:', error);
      }
    };

    const fetchSecondaryEvents = async () => {
      try {
        const response = await api.get(`/events?parentEventId=${eventId}`);
        setSecondaryEvents(response.data.events || response.data);
      } catch (error) {
        // ignore for now
      }
    };

    const fetchInventoryData = async () => {
      try {
        setInventoryLoading(true);
        const response = await fetchInventory(eventId);
        setInventory(response.data.inventory || []);
      } catch (error) {
        console.error('Error fetching inventory:', error);
      } finally {
        setInventoryLoading(false);
      }
    };
    fetchEventData().then(() => {
      // Wait for event to be set
      setTimeout(() => {
        const mainEventId = event && event.isMainEvent ? event._id : event?.parentEventId || eventId;
        fetchGuests(mainEventId);
      }, 0);
    });
    fetchSecondaryEvents();
    fetchInventoryData();
  }, [eventId]);

  const handleUploadGuests = () => {
    navigate(`/events/${eventId}/upload`);
  };
  const handleAddGuest = () => {
    navigate(`/events/${eventId}/add-guest`);
  };

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

  if (error || !event) {
    return (
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <MainNavigation />
        <Box sx={{ flex: 1, p: 4 }}>
          <Alert severity="error">{error || 'Event not found'}</Alert>
        </Box>
      </Box>
    );
  }

  // Calculate stats
  const totalGuests = guests.length;
  const checkedInGuests = guests.filter(g => g.hasCheckedIn).length;
  const pendingGuests = totalGuests - checkedInGuests;
  const checkInPercentage = totalGuests > 0 ? Math.round((checkedInGuests / totalGuests) * 100) : 0;

  // After event and parentEvent are set, determine mainEvent for guest actions
  const mainEvent = event && event.isMainEvent ? event : parentEvent || event;

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainNavigation />
      <Box sx={{ flex: 1, overflow: 'auto', p: 4 }}>
        <Box display="flex" alignItems="center" mb={4}>
          <Box flexGrow={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box flexGrow={1}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                  {event.eventName} Dashboard
                </Typography>
                <Typography variant="subtitle1" color="textSecondary" sx={{ fontWeight: 500 }}>
                  📋 Contract: {event.eventContractNumber}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={() => navigate(`/events/${eventId}/inventory`)}
                sx={{ 
                  borderRadius: 2
                }}
              >
                View Inventory
              </Button>
            </Box>
            
            {/* Additional Events Section - Enhanced */}
            {secondaryEvents.length > 0 && (
              <Box sx={{ 
                background: 'linear-gradient(135deg, #FFFAF6 0%, #f8f9fa 100%)', 
                borderRadius: 3, 
                p: 2.5, 
                mb: 2,
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #00B2C0, #FAA951)',
                  borderRadius: '3px 3px 0 0'
                }
              }}>
                <Typography variant="subtitle1" gutterBottom sx={{ 
                  fontWeight: 700, 
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1.5,
                  color: '#00B2C0'
                }}>
                  📅 Additional Events
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', maxWidth: 600 }}>
                  {secondaryEvents.map((secondaryEvent) => (
                    <Button
                      key={secondaryEvent._id}
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/events/${secondaryEvent._id}/dashboard`)}
                      sx={{ 
                        fontSize: '0.75rem',
                        borderRadius: 2,
                        borderColor: '#00B2C0',
                        color: '#00B2C0',
                        fontWeight: 600,
                        textTransform: 'none',
                        '&:hover': {
                          backgroundColor: '#00B2C0',
                          color: '#FFFAF6',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 2px 8px rgba(0, 178, 192, 0.3)'
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      {secondaryEvent.eventName}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}
            
            {/* Add Additional Event Button - Enhanced */}
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<EventIcon />}
                onClick={() => setSecondaryModalOpen(true)}
                sx={{ 
                  mr: 2,
                  borderRadius: 2
                }}
              >
                ➕ Add Additional Event
              </Button>
            </Box>
          </Box>
        </Box>
        
        {/* Event Overview Section */}
        <Card sx={{ mb: 4, p: 2, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <CardHeader
            title={
              <Typography variant="h6" fontWeight={600} sx={{ color: '#1a1a1a' }}>
                Event Overview
              </Typography>
            }
            subheader={
              <Typography variant="body2" color="textSecondary">
                Key metrics and statistics for this event
              </Typography>
            }
          />
          <div style={{ display: 'flex', gap: '1.5rem', width: '100%' }}>
            {/* Total Guests */}
            <div style={{ 
              flex: 1, 
              background: '#fff', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)', 
              border: '1px solid #e0e0e0', 
              borderRadius: '16px', 
              padding: '2rem 1.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              transition: 'transform 0.2s ease-in-out',
              cursor: 'pointer'
            }}>
              <PeopleAltIcon style={{ fontSize: 40, color: '#1976d2' }} />
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>{totalGuests}</div>
                <div style={{ color: '#666', fontWeight: 500 }}>Total Guests</div>
              </div>
            </div>
            {/* Checked In */}
            <div style={{ 
              flex: 1, 
              background: '#fff', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)', 
              border: '1px solid #e0e0e0', 
              borderRadius: '16px', 
              padding: '2rem 1.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              transition: 'transform 0.2s ease-in-out',
              cursor: 'pointer'
            }}>
              <CheckCircleIcon style={{ fontSize: 40, color: '#4caf50' }} />
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>{checkedInGuests}</div>
                <div style={{ color: '#666', fontWeight: 500 }}>Checked In</div>
              </div>
            </div>
            {/* Pending */}
            <div style={{ 
              flex: 1, 
              background: '#fff', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)', 
              border: '1px solid #e0e0e0', 
              borderRadius: '16px', 
              padding: '2rem 1.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              transition: 'transform 0.2s ease-in-out',
              cursor: 'pointer'
            }}>
              <PersonIcon style={{ fontSize: 40, color: '#ff9800' }} />
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>{pendingGuests}</div>
                <div style={{ color: '#666', fontWeight: 500 }}>Pending</div>
              </div>
            </div>
          </div>
        </Card>
        {/* Add Secondary Event Button and Modal */}
        <AddSecondaryEventModal
          open={secondaryModalOpen}
          onClose={() => setSecondaryModalOpen(false)}
          parentEventId={eventId}
          parentContractNumber={event.eventContractNumber}
          parentEventStart={event.eventStart}
          parentEventEnd={event.eventEnd}
          onEventAdded={() => {
            setSecondaryModalOpen(false);
            // Refresh secondary events after add
            api.get(`/events?parentEventId=${eventId}`).then(res => setSecondaryEvents(res.data.events || res.data));
          }}
        />
        
        {/* Guest Table */}
        <GuestTable guests={guests} onAddGuest={handleAddGuest} onUploadGuests={handleUploadGuests} event={mainEvent} />
      </Box>
    </Box>
  );
};

export default EventDashboard;