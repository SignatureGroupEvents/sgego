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
  Alert
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
import { getMyEvents, getMyCreatedEvents, addToMyEvents, removeFromMyEvents } from '../../services/api';
import { getEvents } from '../../services/events';
import { usePermissions } from '../../hooks/usePermissions';
import toast from 'react-hot-toast';
import AvatarIcon from './AvatarIcon';


const MyEventsBoard = () => {
  const navigate = useNavigate();
  const { isOperationsManager, isAdmin } = usePermissions();
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [myAddedEvents, setMyAddedEvents] = useState([]);
  const [myCreatedEvents, setMyCreatedEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state for created events
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalCreatedEvents, setTotalCreatedEvents] = useState(0);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('eventStart');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 0) {
      loadMyCreatedEvents();
    }
  }, [activeTab, page, rowsPerPage, sortBy, sortOrder, searchTerm]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMyAddedEvents(),
        loadAllEvents()
      ]);
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

  const loadMyCreatedEvents = async () => {
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        sortBy,
        sortOrder,
        search: searchTerm
      };
      const response = await getMyCreatedEvents(params);
      setMyCreatedEvents(response.data.events || []);
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
            {events.map((event) => (
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
                  <Chip 
                    label={event.status || 'Active'} 
                    size="small" 
                    color={event.status === 'Completed' ? 'success' : 'default'}
                    sx={{ borderRadius: 1 }}
                  />
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
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
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddDialogOpen(true)}
              size="small"
            >
              Add Event To My Board
            </Button>
          </Box>
        </Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Your personal events board contains events you've created and events you've added to your board.<br></br>
            Add events you're working on to keep them easily accessible.
          </Typography>
        </Box>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label={`My Events (${totalCreatedEvents})`} />
          <Tab label={`Added Events (${myAddedEvents.length})`} />
        </Tabs>

        {/* My Events Tab (Created Events) */}
        {activeTab === 0 && (
          <>
            {/* Search and Sort Controls */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
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
                sx={{ flexGrow: 1 }}
              />
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
                {renderEventsTable(myCreatedEvents)}
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

        {/* Added Events Tab */}
        {activeTab === 1 && (
          <>
            {myAddedEvents.length === 0 ? (
              <Box textAlign="center" py={4}>
                <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No events on your board yet
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Add events you're working on to keep them easily accessible
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDialogOpen(true)}
                >
                  Add Your First Event
                </Button>
              </Box>
            ) : (
              renderEventsTable(myAddedEvents, true)
            )}
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

            {/* Events Table */}
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
                    {filteredAvailableEvents.map((event) => (
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
                          <Chip 
                            label={event.status || 'Active'} 
                            size="small" 
                            color={event.status === 'Completed' ? 'success' : 'default'}
                            sx={{ borderRadius: 1 }}
                          />
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
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
            
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