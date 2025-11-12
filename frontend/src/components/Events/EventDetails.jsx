import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { getEvent, updateEvent, deleteEvent } from '../../services/events';
import api from '../../services/api';
import MainLayout from '../layout/MainLayout';
import toast from 'react-hot-toast';
import EventHeader from './EventHeader';
import TagManagement from './TagManagement';

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isOperationsManager, isAdmin } = usePermissions();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [parentEvent, setParentEvent] = useState(null);
  const [secondaryEvents, setSecondaryEvents] = useState([]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const eventData = await getEvent(eventId);
        setEvent(eventData);
        setEditValues({
          eventName: eventData.eventName || '',
          eventContractNumber: eventData.eventContractNumber || '',
          eventStart: eventData.eventStart ? new Date(eventData.eventStart).toISOString().split('T')[0] : '',
          eventEnd: eventData.eventEnd ? new Date(eventData.eventEnd).toISOString().split('T')[0] : '',
          includeStyles: eventData.includeStyles || false,
          allowMultipleGifts: eventData.allowMultipleGifts || false,
          status: eventData.status || 'Active'
        });

        // Fetch parent event if this is a secondary event
        let mainEvent = eventData;
        if (eventData.parentEventId) {
          const parent = await getEvent(eventData.parentEventId);
          setParentEvent(parent);
          mainEvent = parent;
        } else {
          setParentEvent(eventData);
        }

        // Fetch all secondary events for the main event
        const response = await api.get(`/events?parentEventId=${mainEvent._id}`);
        const siblings = response.data.events || response.data;
        setSecondaryEvents(siblings);
      } catch (err) {
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditValues({
      eventName: event.eventName || '',
      eventContractNumber: event.eventContractNumber || '',
      eventStart: event.eventStart ? new Date(event.eventStart).toISOString().split('T')[0] : '',
      eventEnd: event.eventEnd ? new Date(event.eventEnd).toISOString().split('T')[0] : '',
      includeStyles: event.includeStyles || false,
      allowMultipleGifts: event.allowMultipleGifts || false,
      status: event.status || 'Active'
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateEvent(eventId, editValues);
      setEvent(prev => ({ ...prev, ...editValues }));
      setEditing(false);
      toast.success('Event updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteEvent(eventId);
      toast.success('Event deleted successfully');
      navigate('/events');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete event');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const canModify = isOperationsManager || isAdmin;

  if (loading) {
    return (
      <MainLayout eventName={event?.eventName}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Alert severity="error">{error}</Alert>
      </MainLayout>
    );
  }

  if (!event) {
    return (
      <MainLayout>
        <Alert severity="warning">Event not found</Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout eventName={event.eventName} parentEventName={parentEvent && parentEvent._id !== event._id ? parentEvent.eventName : null} parentEventId={parentEvent && parentEvent._id !== event._id ? parentEvent._id : null}>
      <EventHeader event={event} mainEvent={parentEvent} secondaryEvents={secondaryEvents} />
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <IconButton onClick={() => navigate('/events')} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" fontWeight={700} color="primary.main">
              Event Details
            </Typography>
            {canModify && (
              <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                {editing ? (
                  <>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      disabled={saving}
                      sx={{ borderRadius: 2, fontWeight: 600 }}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleCancel}
                      sx={{ borderRadius: 2 }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={handleEdit}
                      sx={{ borderRadius: 2 }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => setDeleteDialogOpen(true)}
                      sx={{ borderRadius: 2 }}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </Box>
            )}
          </Box>
          <Typography variant="subtitle1" color="text.secondary">
            View and manage event information
          </Typography>
        </Box>

        {/* Event Information */}
        <Grid container spacing={3}>
          <Grid xs={12} md={8}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventIcon color="primary" />
                  Basic Information
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid xs={12}>
                    {editing ? (
                      <TextField
                        fullWidth
                        label="Event Name"
                        value={editValues.eventName}
                        onChange={(e) => setEditValues(prev => ({ ...prev, eventName: e.target.value }))}
                      />
                    ) : (
                      <Box>
                        <Typography variant="body2" color="text.secondary">Event Name</Typography>
                        <Typography variant="h6">{event.eventName}</Typography>
                      </Box>
                    )}
                  </Grid>
                  
                  <Grid xs={12} md={6}>
                    {editing ? (
                      <TextField
                        fullWidth
                        label="Contract Number"
                        value={editValues.eventContractNumber}
                        onChange={(e) => setEditValues(prev => ({ ...prev, eventContractNumber: e.target.value }))}
                      />
                    ) : (
                      <Box>
                        <Typography variant="body2" color="text.secondary">Contract Number</Typography>
                        <Typography variant="h6">{event.eventContractNumber}</Typography>
                      </Box>
                    )}
                  </Grid>
                  
                  <Grid xs={12} md={6}>
                    {editing ? (
                      <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={editValues.status}
                          onChange={(e) => setEditValues(prev => ({ ...prev, status: e.target.value }))}
                          label="Status"
                        >
                          <MenuItem value="Active">Active</MenuItem>
                          <MenuItem value="Completed">Completed</MenuItem>
                          <MenuItem value="Cancelled">Cancelled</MenuItem>
                        </Select>
                      </FormControl>
                    ) : (
                      <Box>
                        <Typography variant="body2" color="text.secondary">Status</Typography>
                        <Chip 
                          label={event.status || 'Active'} 
                          color={event.status === 'Completed' ? 'success' : 'default'}
                          sx={{ borderRadius: 1 }}
                        />
                      </Box>
                    )}
                  </Grid>
                  
                  <Grid xs={12} md={6}>
                    {editing ? (
                      <TextField
                        fullWidth
                        label="Start Date"
                        type="date"
                        value={editValues.eventStart}
                        onChange={(e) => setEditValues(prev => ({ ...prev, eventStart: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    ) : (
                      <Box>
                        <Typography variant="body2" color="text.secondary">Start Date</Typography>
                        <Typography variant="h6">
                          {event.eventStart ? new Date(event.eventStart).toLocaleDateString() : 'Not set'}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                  
                  <Grid xs={12} md={6}>
                    {editing ? (
                      <TextField
                        fullWidth
                        label="End Date"
                        type="date"
                        value={editValues.eventEnd}
                        onChange={(e) => setEditValues(prev => ({ ...prev, eventEnd: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    ) : (
                      <Box>
                        <Typography variant="body2" color="text.secondary">End Date</Typography>
                        <Typography variant="h6">
                          {event.eventEnd ? new Date(event.eventEnd).toLocaleDateString() : 'Not set'}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid xs={12} md={4}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon color="primary" />
                  Event Type
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={event.isMainEvent ? 'Main Event' : 'Secondary Event'} 
                    color={event.isMainEvent ? 'primary' : 'secondary'}
                    sx={{ borderRadius: 1 }}
                  />
                </Box>
                
                {event.parentEventId && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">Parent Event</Typography>
                    <Typography variant="body1">{event.parentEventName || 'Unknown'}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 3, mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Gift Settings
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {editing ? (
                    <>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={editValues.includeStyles}
                            onChange={(e) => setEditValues(prev => ({ ...prev, includeStyles: e.target.checked }))}
                          />
                        }
                        label="Include style selection"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={editValues.allowMultipleGifts}
                            onChange={(e) => setEditValues(prev => ({ ...prev, allowMultipleGifts: e.target.checked }))}
                          />
                        }
                        label="Allow multiple gifts"
                      />
                    </>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Style Selection</Typography>
                        <Chip 
                          label={event.includeStyles ? 'Enabled' : 'Disabled'} 
                          color={event.includeStyles ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Multiple Gifts</Typography>
                        <Chip 
                          label={event.allowMultipleGifts ? 'Enabled' : 'Disabled'} 
                          color={event.allowMultipleGifts ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tag Management */}
        <Box sx={{ mt: 3 }}>
          <TagManagement 
            event={event} 
            onUpdate={(updatedEvent) => {
              setEvent(updatedEvent);
              toast.success('Event updated successfully');
            }}
          />
        </Box>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Event</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{event.eventName}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleDelete} 
              color="error" 
              variant="contained"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
    );
};

export default EventDetails; 