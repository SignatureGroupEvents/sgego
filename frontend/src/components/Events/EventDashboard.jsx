import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, Button, Alert, Table, TableBody, TableCell, TableContainer, TablePagination, TableHead, TableRow, Paper, IconButton, LinearProgress, Drawer, CardHeader, Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails, Tabs, Tab, InputAdornment, FormControl, InputLabel, Select, MenuItem, TextField, Autocomplete, Tooltip, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import api, { fetchInventory } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import MainLayout from '../layout/MainLayout';
import AddSecondaryEventModal from './AddSecondaryEventModal';
import AddGuest from '../guests/AddGuest';
import InventoryPage from '../../components/inventory/InventoryPage';
import GuestCheckIn from '../guests/GuestCheckIn';
import BasicAnalytics from '../dashboard/BasicAnalytics';
import { getEvent } from '../../services/events';
import { getEventActivityFeed, getGuests } from '../../services/api';
import ManageSection from './ManageSection';
import EventHeader from '../events/EventHeader';
import GuestTable from '../guests/GuestTable';
import AdvancedView from './AdvancedView/AdvancedView';


const EventDashboard = ({ eventId, inventory = [], inventoryLoading = false, inventoryError = '', onInventoryChange }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isOperationsManager, isAdmin } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [localGuests, setLocalGuests] = useState([]);
  const [error, setError] = useState('');
  const [secondaryModalOpen, setSecondaryModalOpen] = useState(false);
  const [secondaryEvents, setSecondaryEvents] = useState([]);
  const [parentEvent, setParentEvent] = useState(null);
  const [giftTrackerCollapsed, setGiftTrackerCollapsed] = useState(true); // Collapsed by default
  const [inventoryViewMode, setInventoryViewMode] = useState('basic');
  const [inventoryExpanded, setInventoryExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('basic'); // 'basic' or 'advanced'
  const [checkInGuest, setCheckInGuest] = useState(null);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [addGuestModalOpen, setAddGuestModalOpen] = useState(false);

  // Update local guests when props change
  React.useEffect(() => {
    setLocalGuests(guests);
  }, [guests]);

  // Determine if user can modify events
  const canModifyEvents = isOperationsManager || isAdmin;

  const handleOpenCheckIn = (guest) => {
    setCheckInGuest(guest);
    setCheckInModalOpen(true);
  };

  const handleCloseCheckIn = () => {
    setCheckInGuest(null);
    setCheckInModalOpen(false);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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
        // Updated API call to match backend route with inheritance support
        const response = await getGuests(eventId, true);
        setGuests(response.data.guests || []);
      } catch (error) {
        console.error('Error fetching guests:', error);
      }
    };

    const fetchSecondaryEvents = async () => {
      try {
        // Determine the main event ID to fetch secondary events for
        let mainEventId = eventId;
        if (event && event.parentEventId) {
          // If we're viewing a secondary event, fetch secondary events for the parent
          mainEventId = event.parentEventId;
        } else if (event && event.isMainEvent) {
          // If we're viewing a main event, fetch its secondary events
          mainEventId = event._id;
        }

        const response = await api.get(`/events?parentEventId=${mainEventId}`);
        setSecondaryEvents(response.data.events || response.data);
      } catch (error) {
        // ignore for now
      }
    };

    const fetchAllData = async () => {
      try {
        await fetchEventData();
        // Use the eventId directly since we just fetched the event data
        const mainEventId = eventId;
        await Promise.all([
          fetchGuests(mainEventId),
          fetchSecondaryEvents()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchAllData();
  }, [eventId]);

  const handleUploadGuests = () => {
    navigate(`/events/${eventId}/upload`);
  };
  const handleAddGuest = () => {
    setAddGuestModalOpen(true);
  };

  const handleGuestAdded = (newGuest) => {
    // Add the new guest to the current list
    setGuests(prev => [...prev, newGuest]);
    setLocalGuests(prev => [...prev, newGuest]);
  };

  const handleCheckInSuccess = (checkedInGuest) => {
    // Update the guest's check-in status in the local state
    setLocalGuests(prev => prev.map(guest =>
      guest._id === checkedInGuest._id
        ? { ...guest, hasCheckedIn: true }
        : guest
    ));
  };

  if (loading) {
    return (
      <MainLayout eventName={event?.eventName || 'Loading Event...'}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress size={60} />
        </Box>
      </MainLayout>
    );
  }

  if (error || !event) {
    return (
      <MainLayout eventName={event?.eventName || 'Loading Event...'}>
        <Alert severity="error">{error || 'Event not found'}</Alert>
      </MainLayout>
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
    <MainLayout eventName={event.eventName || 'Loading Event...'} parentEventName={parentEvent && parentEvent._id !== event._id ? parentEvent.eventName : null} parentEventId={parentEvent && parentEvent._id !== event._id ? parentEvent._id : null}>
      <EventHeader event={event} mainEvent={parentEvent || event} secondaryEvents={secondaryEvents} showDropdown={true} />

      {/* Event Overview Section */}
      <Box sx={{ width: '100%', px: 2, py: 2, backgroundColor: '#fdf9f6' }}>
        {viewMode === 'basic' ? (
          <BasicAnalytics
            event={event}
            guests={guests}
            inventory={inventory}
          />
        ) : (
          <AdvancedView
            event={event}
            guests={guests}
            secondaryEvents={secondaryEvents}
            inventory={inventory}
            onInventoryChange={onInventoryChange}
          />
        )}
      </Box>

      <ManageSection
        onInventory={() => navigate(`/events/${eventId}/inventory`)}
        onUpload={handleUploadGuests}
        onAddGuest={handleAddGuest}
        onAddEvent={() => setSecondaryModalOpen(true)}
        canModify={canModifyEvents}
      />

      {/* Guest Table */}
      <GuestTable
        guests={localGuests}
        onAddGuest={handleAddGuest}
        onUploadGuests={handleUploadGuests}
        event={{
          ...event,
          parentEvent: parentEvent,
          secondaryEvents: secondaryEvents
        }}
        onInventoryChange={onInventoryChange}
        inventory={inventory}
      />

      {/* Check-in Modal */}
      <Dialog
        open={checkInModalOpen}
        onClose={handleCloseCheckIn}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minWidth: 400
          }
        }}
      >
        <DialogTitle>
          Check In Guest
        </DialogTitle>
        <DialogContent>
          {checkInGuest && (
            <GuestCheckIn
              event={event}
              guest={checkInGuest}
              onClose={handleCloseCheckIn}
              onInventoryChange={onInventoryChange}
              onCheckInSuccess={handleCheckInSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Guest Modal */}
      <AddGuest
        open={addGuestModalOpen}
        onClose={() => setAddGuestModalOpen(false)}
        eventId={mainEvent._id}
        onGuestAdded={handleGuestAdded}
      />
    </MainLayout>
  );
};

export default EventDashboard;