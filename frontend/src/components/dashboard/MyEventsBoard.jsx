import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as RemoveIcon,
  DragIndicator as DragIcon,
  Event as EventIcon,
  CalendarToday as CalendarIcon,
  Search as SearchIcon,
  Style as StyleIcon,
  CardGiftcard as GiftIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getMyEvents, addToMyEvents, removeFromMyEvents, updateMyEventsPositions } from '../../services/api';
import { getEvents } from '../../services/events';
import toast from 'react-hot-toast';
import AvatarIcon from './AvatarIcon';

const MyEventsBoard = () => {
  const navigate = useNavigate();
  const [myEvents, setMyEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMyEvents();
    loadAllEvents();
  }, []);

  const loadMyEvents = async () => {
    try {
      const response = await getMyEvents();
      setMyEvents(response.data.myEvents || []);
    } catch (error) {
      console.error('Error loading my events:', error);
      toast.error('Failed to load your events');
    } finally {
      setLoading(false);
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
      await loadMyEvents();
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
      await loadMyEvents();
      toast.success('Event removed from your board');
    } catch (error) {
      toast.error('Failed to remove event');
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newEvents = [...myEvents];
    const [draggedEvent] = newEvents.splice(draggedIndex, 1);
    newEvents.splice(dropIndex, 0, draggedEvent);
    
    setMyEvents(newEvents);
    setDraggedIndex(null);

    // Update positions in backend
    try {
      const positions = newEvents.map((event, index) => ({
        eventId: event._id,
        position: index
      }));
      await updateMyEventsPositions(positions);
      toast.success('Event order updated');
    } catch (error) {
      console.error('Error updating positions:', error);
      toast.error('Failed to save new order');
      await loadMyEvents(); // Reload original order
    }
  };

  const getAvailableEvents = () => {
    const myEventIds = myEvents.map(event => event._id);
    // Only show main events that aren't already on the user's board
    return allEvents.filter(event => 
      event.isMainEvent && !myEventIds.includes(event._id)
    );
  };

  // Filter available events based on search term
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" fontWeight={700} color="primary.main">
            📋 My Events Board
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            size="small"
          >
            Add Event To My Board
          </Button>
        </Box>

        {myEvents.length === 0 ? (
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
          <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell width={50}></TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Event Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Contract #</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Start Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Created By</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myEvents.map((event, index) => (
                    <TableRow 
                      key={event._id}
                      hover
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      sx={{ 
                        cursor: 'grab',
                        '&:active': {
                          cursor: 'grabbing'
                        },
                        opacity: draggedIndex === index ? 0.5 : 1,
                        transform: draggedIndex === index ? 'rotate(2deg)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <TableCell>
                        <DragIcon
                          sx={{ color: 'text.secondary', cursor: 'grab' }}
                        />
                      </TableCell>
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
                            user={event.createdByUser || { username: 'Unknown' }} 
                            userId={event.createdBy}
                            showTooltip={true}
                          />
                        </Box>
                      </TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
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
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Features</TableCell>
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
                          <Chip 
                            label={event.status || 'Active'} 
                            size="small" 
                            color={event.status === 'Completed' ? 'success' : 'default'}
                            sx={{ borderRadius: 1 }}
                          />
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
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