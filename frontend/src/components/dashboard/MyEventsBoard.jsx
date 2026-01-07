import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Alert,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as RemoveIcon,
  Search as SearchIcon,
  Style as StyleIcon,
  CardGiftcard as GiftIcon,
  Sort as SortIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getMyEvents, getMyCreatedEvents, getMyAssignedEvents, addToMyEvents, removeFromMyEvents } from '../../services/api';
import { getEvents } from '../../services/events';
import { usePermissions } from '../../hooks/usePermissions';
import toast from 'react-hot-toast';
import AvatarIcon from './AvatarIcon';
import DashboardEventCard from './DashboardEventCard';


const MyEventsBoard = () => {
  const navigate = useNavigate();
  const { isOperationsManager, isAdmin, isStaff } = usePermissions();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State management
  // All tabs are always rendered: tab 0 = My Events, tab 1 = Assigned Events, tab 2 = Added Events
  // For staff, tabs 0 and 2 are hidden but still exist in the DOM
  const [activeTab, setActiveTab] = useState(isStaff ? 1 : 0); // Staff starts on Assigned Events tab
  
  // Helper to get the correct tab index for content rendering
  const getTabIndex = (tabName) => {
    // All tabs are always at the same indices regardless of user role
    if (tabName === 'created') return 0;
    if (tabName === 'assigned') return 1;
    if (tabName === 'added') return 2;
    return -1;
  };
  const [myAddedEvents, setMyAddedEvents] = useState([]);
  const [myCreatedEvents, setMyCreatedEvents] = useState([]);
  const [myAssignedEvents, setMyAssignedEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state for created events
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalCreatedEvents, setTotalCreatedEvents] = useState(0);
  
  // Sorting state for created events (server-side)
  const [sortBy, setSortBy] = useState('eventStart');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Filter and sort state for added events (client-side)
  const [addedEventsSearchTerm, setAddedEventsSearchTerm] = useState('');
  const [addedEventsStatusFilter, setAddedEventsStatusFilter] = useState('Active');
  const [addedEventsSortBy, setAddedEventsSortBy] = useState('eventStart');
  const [addedEventsSortOrder, setAddedEventsSortOrder] = useState('desc');
  
  // Filter and sort state for assigned events (client-side)
  const [assignedEventsSearchTerm, setAssignedEventsSearchTerm] = useState('');
  const [assignedEventsStatusFilter, setAssignedEventsStatusFilter] = useState('Active');
  const [assignedEventsSortBy, setAssignedEventsSortBy] = useState('eventStart');
  const [assignedEventsSortOrder, setAssignedEventsSortOrder] = useState('desc');
  
  // Status filter for created events
  const [createdEventsStatusFilter, setCreatedEventsStatusFilter] = useState('Active');

  // Helper function to normalize status for comparison and API calls
  const normalizeStatus = (status) => {
    if (!status) return 'active';
    const statusLower = status.toLowerCase();
    // Map common status values to backend values
    if (statusLower === 'completed' || statusLower === 'closed') return 'closed';
    if (statusLower === 'archived') return 'archived';
    return 'active'; // default
  };

  // Helper function to format status for display
  const formatStatusForDisplay = (event) => {
    if (event.isArchived) return 'Archived';
    if (!event.status) return 'Active';
    const statusLower = event.status.toLowerCase();
    if (statusLower === 'closed' || statusLower === 'completed') return 'Completed';
    return 'Active'; // default
  };

  // Helper function to check if event matches filter status (for client-side filtering)
  const matchesStatusFilter = (event, filterStatus) => {
    if (filterStatus === 'All') return true;
    
    // Check for archived events
    if (filterStatus === 'Archived') {
      return event.isArchived === true;
    }
    
    // For non-archived events, check status
    const normalizedEventStatus = normalizeStatus(event.status);
    const normalizedFilterStatus = normalizeStatus(filterStatus);
    return normalizedEventStatus === normalizedFilterStatus && !event.isArchived;
  };

  // Helper function to check if event is currently active
  const isEventActive = (event) => {
    if (event.isArchived) return false;
    const status = normalizeStatus(event.status);
    if (status !== 'active') return false;
    
    // Check if event is within date range (optional - can be enhanced)
    const now = new Date();
    const startDate = event.eventStart ? new Date(event.eventStart) : null;
    const endDate = event.eventEnd ? new Date(event.eventEnd) : null;
    
    // Event is active if it has started and hasn't ended (or has no end date)
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    
    return true;
  };

  useEffect(() => {
    loadAllData();
  }, [isStaff]);

  useEffect(() => {
    // Tab indices are now consistent: 0 = My Events, 1 = Assigned Events, 2 = Added Events
    if (activeTab === 0 && !isStaff) {
      // Load created events for ops/admin
      loadMyCreatedEvents();
    } else if (activeTab === 1) {
      // Load assigned events for all users
      loadMyAssignedEvents();
    }
    // Tab 2 (Added Events) data is already loaded in loadAllData
  }, [activeTab, page, rowsPerPage, sortBy, sortOrder, searchTerm, createdEventsStatusFilter, isStaff]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const promises = [loadAllEvents()];
      
      // Only load added events for non-staff users
      if (!isStaff) {
        promises.push(loadMyAddedEvents());
      }
      
      // Load assigned events for all users
      promises.push(loadMyAssignedEvents());
      
      await Promise.all(promises);
    } finally {
      setLoading(false);
    }
  };

  const loadMyAddedEvents = async () => {
    try {
      const response = await getMyEvents();
      setMyAddedEvents(response.data.myEvents || []);
    } catch (error) {
      console.error('Error loading my added events:', error);
      toast.error('Failed to load your added events');
    }
  };

  const loadMyAssignedEvents = async () => {
    try {
      const response = await getMyAssignedEvents();
      setMyAssignedEvents(response.data.assignedEvents || []);
    } catch (error) {
      console.error('Error loading my assigned events:', error);
      toast.error('Failed to load your assigned events');
    }
  };

  const loadMyCreatedEvents = async () => {
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        sortBy,
        sortOrder,
        search: searchTerm,
        status: createdEventsStatusFilter === 'All' 
          ? undefined 
          : createdEventsStatusFilter === 'Archived' 
            ? 'archived' 
            : normalizeStatus(createdEventsStatusFilter)
      };
      const response = await getMyCreatedEvents(params);
      const events = response.data.events || [];
      
      setMyCreatedEvents(events);
      setTotalCreatedEvents(response.data.total || 0);
    } catch (error) {
      console.error('Error loading my created events:', error);
      toast.error('Failed to load your created events');
    }
  };

  const loadAllEvents = async () => {
    try {
      const response = await getEvents();
      setAllEvents(response.events || []);
    } catch (error) {
      console.error('Error loading all events:', error);
    }
  };

  const handleAddEvent = async (eventId) => {
    try {
      setAddingEvent(true);
      await addToMyEvents(eventId);
      await loadMyAddedEvents();
      setAddDialogOpen(false);
      toast.success('Event added to your board');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add event');
    } finally {
      setAddingEvent(false);
    }
  };

  const handleRemoveEvent = async (eventId) => {
    try {
      await removeFromMyEvents(eventId);
      await loadMyAddedEvents();
      toast.success('Event removed from your board');
    } catch (error) {
      toast.error('Failed to remove event');
    }
  };

  const getAvailableEvents = () => {
    const myEventIds = myAddedEvents.map(event => event._id);
    return allEvents.filter(event => 
      event.isMainEvent && !myEventIds.includes(event._id)
    );
  };

  const filteredAvailableEvents = getAvailableEvents().filter(event => {
    const matchesSearch = searchTerm === '' || 
      event.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.eventContractNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    setPage(0);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  // Filter and sort added events (client-side)
  const getFilteredAndSortedAddedEvents = () => {
    let filtered = [...myAddedEvents];

    // Apply status filter
    if (addedEventsStatusFilter !== 'All') {
      filtered = filtered.filter(event => {
        return matchesStatusFilter(event, addedEventsStatusFilter);
      });
    }

    // Apply search filter
    if (addedEventsSearchTerm) {
      const searchLower = addedEventsSearchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.eventName?.toLowerCase().includes(searchLower) ||
        event.eventContractNumber?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (addedEventsSortBy) {
        case 'eventName':
          aValue = a.eventName || '';
          bValue = b.eventName || '';
          break;
        case 'eventStart':
          aValue = a.eventStart ? new Date(a.eventStart).getTime() : 0;
          bValue = b.eventStart ? new Date(b.eventStart).getTime() : 0;
          break;
        case 'eventEnd':
          aValue = a.eventEnd ? new Date(a.eventEnd).getTime() : 0;
          bValue = b.eventEnd ? new Date(b.eventEnd).getTime() : 0;
          break;
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'eventContractNumber':
          aValue = a.eventContractNumber || '';
          bValue = b.eventContractNumber || '';
          break;
        default:
          aValue = a.eventStart ? new Date(a.eventStart).getTime() : 0;
          bValue = b.eventStart ? new Date(b.eventStart).getTime() : 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return addedEventsSortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return addedEventsSortOrder === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
    });

    return filtered;
  };

  const handleAddedEventsSortChange = (newSortBy) => {
    if (addedEventsSortBy === newSortBy) {
      setAddedEventsSortOrder(addedEventsSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setAddedEventsSortBy(newSortBy);
      setAddedEventsSortOrder('desc');
    }
  };

  // Filter and sort assigned events (client-side)
  const getFilteredAndSortedAssignedEvents = () => {
    let filtered = [...myAssignedEvents];

    // Apply status filter
    if (assignedEventsStatusFilter !== 'All') {
      filtered = filtered.filter(event => {
        return matchesStatusFilter(event, assignedEventsStatusFilter);
      });
    }

    // Apply search filter
    if (assignedEventsSearchTerm) {
      const searchLower = assignedEventsSearchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.eventName?.toLowerCase().includes(searchLower) ||
        event.eventContractNumber?.toLowerCase().includes(searchLower) ||
        event.allocatedToSecondaryEvent?.eventName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (assignedEventsSortBy) {
        case 'eventName':
          aValue = a.eventName || '';
          bValue = b.eventName || '';
          break;
        case 'eventStart':
          aValue = a.eventStart ? new Date(a.eventStart).getTime() : 0;
          bValue = b.eventStart ? new Date(b.eventStart).getTime() : 0;
          break;
        case 'eventEnd':
          aValue = a.eventEnd ? new Date(a.eventEnd).getTime() : 0;
          bValue = b.eventEnd ? new Date(b.eventEnd).getTime() : 0;
          break;
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'eventContractNumber':
          aValue = a.eventContractNumber || '';
          bValue = b.eventContractNumber || '';
          break;
        default:
          aValue = a.eventStart ? new Date(a.eventStart).getTime() : 0;
          bValue = b.eventStart ? new Date(b.eventStart).getTime() : 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return assignedEventsSortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return assignedEventsSortOrder === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
    });

    return filtered;
  };

  const handleAssignedEventsSortChange = (newSortBy) => {
    if (assignedEventsSortBy === newSortBy) {
      setAssignedEventsSortOrder(assignedEventsSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setAssignedEventsSortBy(newSortBy);
      setAssignedEventsSortOrder('desc');
    }
  };

  const renderEventsTable = (events, showRemoveButton = false) => (
    <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>Event Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Contract #</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Start Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>End Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Created By</TableCell>
              {/* <TableCell sx={{ fontWeight: 600 }}>Features</TableCell> */}
              {showRemoveButton && (
                <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => {
              const isActive = isEventActive(event);
              return (
              <TableRow key={event._id} hover>
                <TableCell>
                  <Typography 
                    variant="subtitle2" 
                    fontWeight={600}
                    onClick={() => navigate(`/events/${event._id}`)}
                    sx={{ 
                      color: 'primary.main',
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' }
                    }}
                  >
                    {event.eventName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {event.eventContractNumber}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {formatDate(event.eventStart)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {formatDate(event.eventEnd)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={formatStatusForDisplay(event)} 
                      size="small" 
                      color={
                        event.isArchived 
                          ? 'default' 
                          : normalizeStatus(event.status) === 'closed' 
                            ? 'success' 
                            : 'default'
                      }
                      sx={{ borderRadius: 1 }}
                    />
                    {isActive && (
                      <Tooltip title="Live Event - Currently Open">
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: '#393ce0',
                            boxShadow: '0 0 6px #393ce0, 0 0 10px #393ce0',
                            animation: 'pulse-glow 2s ease-in-out infinite',
                            flexShrink: 0,
                          }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <AvatarIcon 
                      user={event.createdBy || { username: 'Unknown' }} 
                      userId={event.createdBy?._id}
                      showTooltip={true}
                    />
                  </Box>
                </TableCell>
                {/* <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {event.includeStyles && (
                      <Tooltip title="Style Selection Enabled">
                        <StyleIcon color="primary" fontSize="small" />
                      </Tooltip>
                    )}
                    {event.allowMultipleGifts && (
                      <Tooltip title="Multiple Gifts Allowed">
                        <GiftIcon color="primary" fontSize="small" />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell> */}
                {showRemoveButton && (
                  <TableCell align="center">
                    <Tooltip title="Remove Event From My Board">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveEvent(event._id)}
                      >
                        <RemoveIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  // Card layout for mobile devices - using reusable DashboardEventCard component
  const renderEventsCards = (events, showRemoveButton = false) => (
    <Box>
      {events.map(event => (
        <DashboardEventCard
          key={event._id}
          event={event}
          variant="standard"
          onRemove={showRemoveButton ? handleRemoveEvent : undefined}
          formatDate={formatDate}
          formatStatusForDisplay={formatStatusForDisplay}
          normalizeStatus={normalizeStatus}
          isEventActive={isEventActive}
        />
      ))}
    </Box>
  );

  const renderAssignedEventsCards = (events) => (
    <Box>
      {events.map(event => (
        <DashboardEventCard
          key={event._id}
          event={event}
          variant="assigned"
          formatDate={formatDate}
          formatStatusForDisplay={formatStatusForDisplay}
          normalizeStatus={normalizeStatus}
          isEventActive={isEventActive}
        />
      ))}
    </Box>
  );

  const renderDialogEventsCards = (events) => (
    <Box>
      {events.map(event => (
        <DashboardEventCard
          key={event._id}
          event={event}
          variant="dialog"
          onAdd={handleAddEvent}
          addingEvent={addingEvent}
          formatDate={formatDate}
          formatStatusForDisplay={formatStatusForDisplay}
          normalizeStatus={normalizeStatus}
          isEventActive={isEventActive}
        />
      ))}
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card sx={{ mb: 4, sm: { p: 2 } }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
          <Typography variant="h6" fontWeight={700} color="primary.main">
            <Tooltip title="Your Events">
              <span>📋 My Events Board</span>
            </Tooltip>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {(isOperationsManager || isAdmin) && (
              <Button
                variant="contained"
                color="info"
                startIcon={<EventIcon />}
                onClick={() => navigate('/events/new')}
                size="small"
                sx={{ fontWeight: 600, bgcolor: 'info.main', '&:hover': { bgcolor: 'info.main' } }}
              >
                Create New Event
              </Button>
            )}
            {!isStaff && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddDialogOpen(true)}
                size="small"
              >
                Add Event To My Board
              </Button>
            )}
          </Box>
        </Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {isStaff ? (
              <>
                Events assigned to you by Operations Managers or Admins will appear here.<br></br>
                You can view and work with the events you've been assigned to.
              </>
            ) : (
              <>
                Your personal events board contains events you've created and events you've added to your board.<br></br>
                Add events you're working on to keep them easily accessible.
              </>
            )}
          </Typography>
        </Box>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => {
            // Prevent staff from accessing hidden tabs
            if (isStaff && (newValue === 0 || newValue === 2)) {
              return;
            }
            setActiveTab(newValue);
          }}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ mb: 3 }}
        >
          <Tab 
            label={`My Events (${totalCreatedEvents})`}
            sx={{ 
              display: isStaff ? 'none' : 'inline-flex',
              minWidth: { xs: 'auto', sm: 160 }
            }}
            disabled={isStaff}
          />
          <Tab 
            label={`Assigned Events (${myAssignedEvents.length})`}
            sx={{ minWidth: { xs: 'auto', sm: 160 } }}
          />
          <Tab 
            label={`Added Events (${myAddedEvents.length})`}
            sx={{ 
              display: isStaff ? 'none' : 'inline-flex',
              minWidth: { xs: 'auto', sm: 160 }
            }}
            disabled={isStaff}
          />
        </Tabs>

        {/* Assigned Events Tab */}
        {activeTab === getTabIndex('assigned') && (
          <>
            {/* Search, Filter and Sort Controls */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                placeholder="Search events..."
                value={assignedEventsSearchTerm}
                onChange={(e) => setAssignedEventsSearchTerm(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                  ),
                }}
                sx={{ flexGrow: 1, minWidth: 200 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={assignedEventsStatusFilter}
                  onChange={(e) => setAssignedEventsStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Archived">Archived</MenuItem>
                  <MenuItem value="All">All</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={assignedEventsSortBy}
                  onChange={(e) => setAssignedEventsSortBy(e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="eventStart">Start Date</MenuItem>
                  <MenuItem value="eventEnd">End Date</MenuItem>
                  <MenuItem value="eventName">Event Name</MenuItem>
                  <MenuItem value="eventContractNumber">Contract #</MenuItem>
                  <MenuItem value="createdAt">Created Date</MenuItem>
                </Select>
              </FormControl>
              <Tooltip title={`Sort ${assignedEventsSortOrder === 'asc' ? 'Descending' : 'Ascending'}`}>
                <IconButton onClick={() => handleAssignedEventsSortChange(assignedEventsSortBy)}>
                  <SortIcon sx={{ transform: assignedEventsSortOrder === 'desc' ? 'rotate(180deg)' : 'none' }} />
                </IconButton>
              </Tooltip>
            </Box>

            {(() => {
              const filteredAndSortedEvents = getFilteredAndSortedAssignedEvents();
              if (filteredAndSortedEvents.length === 0) {
                const hasFilters = assignedEventsSearchTerm || assignedEventsStatusFilter !== 'All';
                const emptyMessage = myAssignedEvents.length === 0 
                  ? 'No events assigned to you yet'
                  : hasFilters
                    ? 'No events match your filters'
                    : 'No events found';
                const emptyDescription = myAssignedEvents.length === 0
                  ? "You'll see events here once an Operations Manager or Admin assigns them to you"
                  : 'Try adjusting your search or filter criteria';
                
                return (
                  <Box textAlign="center" py={4}>
                    <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      {emptyMessage}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {emptyDescription}
                    </Typography>
                  </Box>
                );
              }
              
              // Render cards on mobile, table on desktop
              return isMobile ? (
                renderAssignedEventsCards(filteredAndSortedEvents)
              ) : (
                <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Event Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Contract #</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Start Date</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>End Date</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Allocated To</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Created By</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredAndSortedEvents.map((event) => {
                          const isActive = isEventActive(event);
                          return (
                            <TableRow key={event._id} hover>
                              <TableCell>
                                <Typography 
                                  variant="subtitle2" 
                                  fontWeight={600}
                                  onClick={() => navigate(`/events/${event._id}`)}
                                  sx={{ 
                                    color: 'primary.main',
                                    cursor: 'pointer',
                                    '&:hover': { textDecoration: 'underline' }
                                  }}
                                >
                                  {event.eventName}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {event.eventContractNumber}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  {formatDate(event.eventStart)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  {formatDate(event.eventEnd)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Chip 
                                    label={formatStatusForDisplay(event)} 
                                    size="small" 
                                    color={
                                      event.isArchived 
                                        ? 'default' 
                                        : normalizeStatus(event.status) === 'closed' 
                                          ? 'success' 
                                          : 'default'
                                    }
                                    sx={{ borderRadius: 1 }}
                                  />
                                  {isActive && (
                                    <Tooltip title="Live Event - Currently Open">
                                      <Box
                                        sx={{
                                          width: 10,
                                          height: 10,
                                          borderRadius: '50%',
                                          backgroundColor: '#393ce0',
                                          boxShadow: '0 0 6px #393ce0, 0 0 10px #393ce0',
                                          animation: 'pulse-glow 2s ease-in-out infinite',
                                          flexShrink: 0,
                                        }}
                                      />
                                    </Tooltip>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                {event.allocatedToSecondaryEvent ? (
                                  <Typography variant="body2" color="primary.main" fontWeight={500}>
                                    {event.allocatedToSecondaryEvent.eventName}
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    Main Event
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <AvatarIcon 
                                    user={event.createdBy || { username: 'Unknown' }} 
                                    userId={event.createdBy?._id}
                                    showTooltip={true}
                                  />
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              );
            })()}
          </>
        )}

        {/* My Events Tab (Created Events) - Only for ops/admin */}
        {activeTab === getTabIndex('created') && (
          <>
            {/* Search, Filter and Sort Controls */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                placeholder="Search events..."
                value={searchTerm}
                onChange={handleSearchChange}
                size="small"
                InputProps={{
                  startAdornment: (
                    <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                  ),
                }}
                sx={{ flexGrow: 1, minWidth: 200 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={createdEventsStatusFilter}
                  onChange={(e) => {
                    setCreatedEventsStatusFilter(e.target.value);
                    setPage(0);
                  }}
                  label="Status"
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Archived">Archived</MenuItem>
                  <MenuItem value="All">All</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(0);
                  }}
                  label="Sort By"
                >
                  <MenuItem value="eventStart">Start Date</MenuItem>
                  <MenuItem value="createdAt">Created Date</MenuItem>
                  <MenuItem value="eventName">Event Name</MenuItem>
                  <MenuItem value="eventEnd">End Date</MenuItem>
                </Select>
              </FormControl>
              <Tooltip title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}>
                <IconButton onClick={() => handleSortChange(sortBy)}>
                  <SortIcon sx={{ transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none' }} />
                </IconButton>
              </Tooltip>
            </Box>

            {myCreatedEvents.length === 0 ? (
              <Box textAlign="center" py={4}>
                <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {searchTerm ? 'No events found' : 'No events created yet'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm 
                    ? `No events match "${searchTerm}". Try adjusting your search.`
                    : 'Create your first event to see it here!'
                  }
                </Typography>
              </Box>
            ) : (
              <>
                {isMobile ? renderEventsCards(myCreatedEvents) : renderEventsTable(myCreatedEvents)}
                <TablePagination
                  component="div"
                  count={totalCreatedEvents}
                  page={page}
                  onPageChange={handlePageChange}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </>
            )}
          </>
        )}

        {/* Added Events Tab - Only for ops/admin */}
        {activeTab === getTabIndex('added') && (
          <>
            {/* Search, Filter and Sort Controls */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                placeholder="Search events..."
                value={addedEventsSearchTerm}
                onChange={(e) => setAddedEventsSearchTerm(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                  ),
                }}
                sx={{ flexGrow: 1, minWidth: 200 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={addedEventsStatusFilter}
                  onChange={(e) => setAddedEventsStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Archived">Archived</MenuItem>
                  <MenuItem value="All">All</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={addedEventsSortBy}
                  onChange={(e) => setAddedEventsSortBy(e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="eventStart">Start Date</MenuItem>
                  <MenuItem value="eventEnd">End Date</MenuItem>
                  <MenuItem value="eventName">Event Name</MenuItem>
                  <MenuItem value="eventContractNumber">Contract #</MenuItem>
                  <MenuItem value="createdAt">Created Date</MenuItem>
                </Select>
              </FormControl>
              <Tooltip title={`Sort ${addedEventsSortOrder === 'asc' ? 'Descending' : 'Ascending'}`}>
                <IconButton onClick={() => handleAddedEventsSortChange(addedEventsSortBy)}>
                  <SortIcon sx={{ transform: addedEventsSortOrder === 'desc' ? 'rotate(180deg)' : 'none' }} />
                </IconButton>
              </Tooltip>
            </Box>

            {(() => {
              const filteredAndSortedEvents = getFilteredAndSortedAddedEvents();
              if (filteredAndSortedEvents.length === 0) {
                const hasFilters = addedEventsSearchTerm || addedEventsStatusFilter !== 'All';
                const emptyMessage = myAddedEvents.length === 0 
                  ? 'No events on your board yet'
                  : hasFilters
                    ? 'No events match your filters'
                    : 'No events found';
                const emptyDescription = myAddedEvents.length === 0
                  ? "Add events you're working on to keep them easily accessible"
                  : 'Try adjusting your search or filter criteria';
                
                return (
                  <Box textAlign="center" py={4}>
                    <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      {emptyMessage}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                      {emptyDescription}
                    </Typography>
                    {myAddedEvents.length === 0 && (
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setAddDialogOpen(true)}
                      >
                        Add Your First Event
                      </Button>
                    )}
                  </Box>
                );
              }
              return isMobile 
                ? renderEventsCards(filteredAndSortedEvents, true)
                : renderEventsTable(filteredAndSortedEvents, true);
            })()}
          </>
        )}

        {/* Add Event Dialog */}
        <Dialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: { minHeight: '60vh' }
          }}
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={600}>
                Add Event to Your Board
              </Typography>
              <Button
                onClick={() => setAddDialogOpen(false)}
                size="small"
              >
                Close
              </Button>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Select an event to add to your personal board. Only main events are shown.
            </Typography>
            
            {/* Search Bar */}
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                placeholder="Search events by name or contract number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'background.paper',
                  }
                }}
              />
            </Box>

            {/* Events Table or Cards */}
            {isMobile ? (
              renderDialogEventsCards(filteredAvailableEvents)
            ) : (
              <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Event Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Contract #</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Start Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>End Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        {/* <TableCell sx={{ fontWeight: 600 }}>Features</TableCell> */}
                        <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAvailableEvents.map((event) => {
                        const isActive = isEventActive(event);
                        return (
                        <TableRow 
                          key={event._id}
                          hover
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'action.hover' }
                          }}
                        >
                          <TableCell>
                            <Typography 
                              variant="subtitle2" 
                              fontWeight={600}
                              onClick={() => navigate(`/events/${event._id}`)}
                              sx={{ 
                                color: 'primary.main',
                                '&:hover': { textDecoration: 'underline' }
                              }}
                            >
                              {event.eventName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {event.eventContractNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {formatDate(event.eventStart)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {formatDate(event.eventEnd)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip 
                                label={formatStatusForDisplay(event)} 
                                size="small" 
                                color={
                                  event.isArchived 
                                    ? 'default' 
                                    : normalizeStatus(event.status) === 'closed' 
                                      ? 'success' 
                                      : 'default'
                                }
                                sx={{ borderRadius: 1 }}
                              />
                              {isActive && (
                                <Tooltip title="Active Event">
                                  <Box
                                    sx={{
                                      width: 10,
                                      height: 10,
                                      borderRadius: '50%',
                                      backgroundColor: '#393ce0',
                                      boxShadow: '0 0 6px #393ce0, 0 0 10px #393ce0',
                                      animation: 'pulse-glow 2s ease-in-out infinite',
                                      flexShrink: 0,
                                    }}
                                  />
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          {/* <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {event.includeStyles && (
                                <Tooltip title="Style Selection Enabled">
                                  <StyleIcon color="primary" fontSize="small" />
                                </Tooltip>
                              )}
                              {event.allowMultipleGifts && (
                                <Tooltip title="Multiple Gifts Allowed">
                                  <GiftIcon color="primary" fontSize="small" />
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell> */}
                          <TableCell align="center">
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleAddEvent(event._id)}
                              disabled={addingEvent}
                              startIcon={<AddIcon />}
                            >
                              Add
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}
            
            {filteredAvailableEvents.length === 0 && (
              <Box textAlign="center" py={4}>
                <EventIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {searchTerm ? 'No events found' : 'No events available'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm 
                    ? `No events match "${searchTerm}". Try adjusting your search.`
                    : 'All main events are already on your board!'
                  }
                </Typography>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default MyEventsBoard;