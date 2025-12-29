import React, { useState } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Card, CardContent, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, CircularProgress, Tooltip  } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Edit as EditIcon, Dashboard as DashboardIcon, Event as EventIcon } from '@mui/icons-material';
import { updateEvent } from '../../services/events';
import toast from 'react-hot-toast';

const EventHeader = ({ event, mainEvent, secondaryEvents = [], showDropdown = false, onEventUpdate }) => {
  const navigate = useNavigate();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    eventName: '',
    eventStart: '',
    eventEnd: ''
  });
  const [saving, setSaving] = useState(false);

  if (!event || !mainEvent) return null;

  const isMainEvent = event.isMainEvent;
  const hasSecondaryEvents = secondaryEvents.length > 0;

  const handleEditClick = () => {
    setEditForm({
      eventName: event.eventName || '',
      eventStart: event.eventStart ? new Date(event.eventStart).toISOString().split('T')[0] : '',
      eventEnd: event.eventEnd ? new Date(event.eventEnd).toISOString().split('T')[0] : ''
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      
      const updateData = {
        eventName: editForm.eventName,
        eventStart: editForm.eventStart ? new Date(editForm.eventStart).toISOString() : null,
        eventEnd: editForm.eventEnd ? new Date(editForm.eventEnd).toISOString() : null
      };

      await updateEvent(event._id, updateData);
      
      // Call the callback to update the parent component
      if (onEventUpdate) {
        onEventUpdate({
          ...event,
          ...updateData
        });
      }
      
      toast.success('Event updated successfully');
      setEditModalOpen(false);
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error(error.response?.data?.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditModalOpen(false);
    setEditForm({
      eventName: '',
      eventStart: '',
      eventEnd: ''
    });
  };

  return (
    <Box mb={4}>
      {/* Event Information Container */}
      <Card 
        sx={{ 
          mb: 3,
          background: isMainEvent 
            ? 'linear-gradient(135deg,rgb(227, 252, 253) 0%,rgb(240, 249, 249) 100%)' 
            : 'linear-gradient(135deg,rgb(245, 236, 227) 0%,rgb(248, 238, 220) 100%)',  
          border: isMainEvent ? '2px solid #00B2C0' : '2px solid #FAA951',
          borderRadius: 3,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isMainEvent ? (
                <DashboardIcon sx={{ color: '#00B2C0', fontSize: 32 }} />
              ) : (
                <EventIcon sx={{ color: '#FAA951', fontSize: 32 }} />
              )}
              <Box>
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {event.eventName || 'Event'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip 
                    label={isMainEvent ? 'Program Dashboard' : 'Check-in Event'} 
                    size="small" 
                    color={isMainEvent ? 'primary' : 'success'}
                    sx={{ fontWeight: 600 }}
                  />
                  {isMainEvent && hasSecondaryEvents && (
                    <Chip 
                      label={`${secondaryEvents.length} Check-in Event${secondaryEvents.length > 1 ? 's' : ''}`} 
                      size="small" 
                      variant="outlined"
                      color="primary"
                    />
                  )}
                </Box>
              </Box>
            </Box>
            <Tooltip title="Edit Event Details">
              <IconButton 
                onClick={handleEditClick}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.8)', 
                  '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
                }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
          </Box>  
          
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
            Contract: {event.eventContractNumber || '—'}
          </Typography>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Start Date: {event.eventStart ? new Date(event.eventStart).toLocaleDateString() : '—'}
            </Typography> 
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              End Date: {event.eventEnd ? new Date(event.eventEnd).toLocaleDateString() : '—'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Operations Manager: {event.createdBy ? event.createdBy.username : '—'}
            </Typography> 
          </Box>

          {isMainEvent && hasSecondaryEvents && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
              This is the main program dashboard. Guests check in to the individual events below.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Event Navigation Dropdown - Only show if there are multiple events */}
      {showDropdown && (hasSecondaryEvents || (event && mainEvent && event._id !== mainEvent._id)) && (
        <Box sx={{ 
          p: 2, 
          bgcolor: 'grey.50', 
          borderRadius: 2, 
          border: '1px solid #e0e0e0'
        }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
            Switch Between Events:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="secondary-event-label">Select Event</InputLabel>
            <Select
              labelId="secondary-event-label"
              label="Select Event"
              value={event?._id || ''}
              onChange={e => {
                const selectedId = e.target.value;
                if (selectedId && selectedId !== event?._id) {
                  navigate(`/events/${selectedId}/dashboard`);
                }
              }}
            >
              {mainEvent && (
                <MenuItem key={mainEvent?._id} value={mainEvent?._id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DashboardIcon sx={{ fontSize: 16, color: '#00B2C0' }} />
                    <Typography>{mainEvent?.eventName}</Typography>
                    <Chip label="Dashboard" size="small" color="primary" sx={{ ml: 'auto' }} />
                  </Box>
                </MenuItem>
              )}
              {secondaryEvents.map(ev => (
                <MenuItem key={ev?._id} value={ev?._id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EventIcon sx={{ fontSize: 16, color: '#FAA951' }} />
                    <Typography>{ev?.eventName}</Typography>
                    <Chip label="Check-in" size="small" color="success" sx={{ ml: 'auto' }} />
                  </Box>
                </MenuItem>
              ))}
              {/* If current event is not in the above, add it */}
              {event && mainEvent && event._id !== mainEvent._id && !secondaryEvents.some(ev => ev._id === event._id) && (
                <MenuItem key={event._id} value={event._id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EventIcon sx={{ fontSize: 16, color: '#FAA951' }} />
                    <Typography>{event.eventName}</Typography>
                    <Chip label="Check-in" size="small" color="success" sx={{ ml: 'auto' }} />
                  </Box>
                </MenuItem>
              )}
            </Select>
          </FormControl>
        </Box>
      )}
      
      {/* Edit Event Modal */}
      <Dialog 
        open={editModalOpen} 
        onClose={handleCancelEdit}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Edit Event Details</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Event Name"
              value={editForm.eventName}
              onChange={(e) => setEditForm(prev => ({ ...prev, eventName: e.target.value }))}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={editForm.eventStart}
              onChange={(e) => setEditForm(prev => ({ ...prev, eventStart: e.target.value }))}
              margin="normal"
              InputLabelProps={{
                shrink: true,
              }}
            />
            
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={editForm.eventEnd}
              onChange={(e) => setEditForm(prev => ({ ...prev, eventEnd: e.target.value }))}
              margin="normal"
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEdit} 
            variant="contained" 
            disabled={saving || !editForm.eventName.trim()}
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EventHeader; 