import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, Button, Alert, Table, TableBody, TableCell, TableContainer, TablePagination, TableHead, TableRow, Paper, IconButton, LinearProgress, Drawer } from '@mui/material';
import { CheckCircle as CheckCircleIcon, Person as PersonIcon, Groups as GroupsIcon, Assessment as AssessmentIcon, Event as EventIcon, Home as HomeIcon, Menu as MenuIcon, Upload as UploadIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import TopNavBar from '../TopNavBar';
import SidebarEventsList from './SidebarEventsList';
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
        <Box sx={{ backgroundColor: `${color}.light`, borderRadius: 2, p: 2 }}>
          {React.cloneElement(icon, { sx: { fontSize: 40, color: `${color}.main` } })}
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [secondaryModalOpen, setSecondaryModalOpen] = useState(false);
  const [secondaryEvents, setSecondaryEvents] = useState([]);
  const [parentEvent, setParentEvent] = useState(null);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const response = await api.get(`/events/${eventId}`);
        const eventData = response.data.event || response.data;
        setEvent(eventData);
        if (eventData.parentEventId) {
          // Fetch parent event for breadcrumbs
          const parent = await getEvent(eventData.parentEventId);
          setParentEvent(parent);
        } else {
          setParentEvent(null);
        }
      } catch (error) {
        setError('Failed to load event data');
        console.error('Error fetching event:', error);
      }
    };
    const fetchGuests = async (mainEventId) => {
      try {
        const response = await api.get(`/guests?eventId=${mainEventId}`);
        setGuests(response.data.guests || response.data);
      } catch (error) {
        console.error('Error fetching guests:', error);
      } finally {
        setLoading(false);
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
    fetchEventData().then(() => {
      // Wait for event to be set
      setTimeout(() => {
        const mainEventId = event && event.isMainEvent ? event._id : event?.parentEventId || eventId;
        fetchGuests(mainEventId);
      }, 0);
    });
    fetchSecondaryEvents();
  }, [eventId]);

  const handleUploadGuests = () => {
    navigate(`/events/${eventId}/upload`);
  };
  const handleAddGuest = () => {
    navigate(`/events/${eventId}/add-guest`);
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress size={60} /></Box>;
  }

  if (error || !event) {
    return <Box p={4}><Alert severity="error">{error || 'Event not found'}</Alert></Box>;
  }

  // Calculate stats
  const totalGuests = guests.length;
  const checkedInGuests = guests.filter(g => g.hasCheckedIn).length;
  const pendingGuests = totalGuests - checkedInGuests;
  const checkInPercentage = totalGuests > 0 ? Math.round((checkedInGuests / totalGuests) * 100) : 0;

  // After event and parentEvent are set, determine mainEvent for guest actions
  const mainEvent = event && event.isMainEvent ? event : parentEvent || event;

  return (
    <Box sx={{ p: 0 }}>
      <TopNavBar
        breadcrumbs={[
          { label: 'Home', to: '/events', icon: <HomeIcon /> },
          ...(parentEvent
            ? [
                { label: parentEvent.eventName, to: `/events/${parentEvent._id}` },
                { label: event?.eventName, to: `/events/${event?._id}` },
                { label: 'Dashboard' }
              ]
            : [
                { label: event?.eventName, to: `/events/${event?._id}` },
                { label: 'Dashboard' }
              ]),
        ]}
        leftAction={
          <IconButton color="inherit" onClick={() => setSidebarOpen(true)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
        }
      />
      <Drawer
        anchor="left"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        ModalProps={{ keepMounted: true }}
      >
        <SidebarEventsList onSelectEvent={() => setSidebarOpen(false)} />
      </Drawer>
      <Box sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" mb={4}>
          <Box flexGrow={1}>
            <Typography variant="h4" gutterBottom>
              {event.eventName} Dashboard
            </Typography>
            <Typography variant="subtitle1" color="textSecondary" gutterBottom>
              Contract: {event.eventContractNumber}
            </Typography>
          </Box>
          {/* Inventory Button for main events only */}
          {event.isMainEvent && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => navigate(`/events/${eventId}/inventory`)}
              size="large"
            >
              View Inventory
            </Button>
          )}
        </Box>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Guests"
              value={totalGuests}
              icon={<GroupsIcon />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Checked In"
              value={checkedInGuests}
              subtitle={`${checkInPercentage}% complete`}
              icon={<CheckCircleIcon />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pending"
              value={pendingGuests}
              icon={<PersonIcon />}
              color="warning"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Check-in Rate"
              value={`${checkInPercentage}%`}
              icon={<AssessmentIcon />}
              color="info"
            />
          </Grid>
        </Grid>
        {/* Add Secondary Event Button and Modal */}
        {event.allowMultipleGifts && (
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" color="secondary" onClick={() => setSecondaryModalOpen(true)}>
              Add Additional Event
            </Button>
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
          </Box>
        )}
        {/* List of Secondary Events */}
        {secondaryEvents.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>Additional Events</Typography>
            <Grid container spacing={2}>
              {secondaryEvents.map(sec => (
                <Grid item xs={12} sm={6} md={4} key={sec._id}>
                  <Card
                    onClick={() => navigate(`/events/${sec._id}`)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: 'grey.50',
                      transition: 'box-shadow 0.2s, background 0.2s',
                      '&:hover': {
                        boxShadow: 6,
                        bgcolor: 'grey.100',
                      },
                    }}
                  >
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600}>{sec.eventName}</Typography>
                      <Button size="small" sx={{ mt: 1 }} variant="outlined" onClick={e => { e.stopPropagation(); navigate(`/events/${sec._id}`); }}>
                        View Dashboard
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
        {/* Progress Bar */}
        {totalGuests > 0 && (
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Check-in Progress
              </Typography>
              <LinearProgress
                variant="determinate"
                value={checkInPercentage}
                sx={{ height: 10, borderRadius: 5, my: 2 }}
                color={checkInPercentage === 100 ? 'success' : 'primary'}
              />
              <Typography variant="body2" color="textSecondary">
                {checkedInGuests} of {totalGuests} guests checked in
              </Typography>
            </CardContent>
          </Card>
        )}
        {/* Guest Table */}
        <GuestTable guests={guests} onAddGuest={handleAddGuest} onUploadGuests={handleUploadGuests} event={mainEvent} />
      </Box>
    </Box>
  );
};

export default EventDashboard;