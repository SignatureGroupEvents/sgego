import React, { useState } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Card, CardContent, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, CircularProgress, Tooltip  } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Edit as EditIcon, Dashboard as DashboardIcon, Event as EventIcon } from '@mui/icons-material';
import { updateEvent } from '../../services/events';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';
import { getUserDisplayName } from '../../utils/userDisplay';

const EventHeader = ({ event, mainEvent, secondaryEvents = [], showDropdown = false, onEventUpdate, readOnly = false }) => {
  const navigate = useNavigate();
  const { canManageEvents } = usePermissions();
  const canEdit = !readOnly && canManageEvents;
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
    <Box mb={{ xs: 2, sm: 3, md: 4 }}>
      {/* Event Information Container */}
      <Card 
        sx={{ 
          mb: { xs: 1.5, sm: 2, md: 3 },
          background: isMainEvent 
            ? 'linear-gradient(135deg,rgb(227, 252, 253) 0%,rgb(240, 249, 249) 100%)' 
            : 'linear-gradient(135deg,rgb(245, 236, 227) 0%,rgb(248, 238, 220) 100%)',  
          border: isMainEvent ? '2px solid #00B2C0' : '2px solid #FAA951',
          borderRadius: { xs: 2, sm: 2.5, md: 3 },
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1, sm: 1.5, md: 2 }, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5, md: 2 }, flex: 1, minWidth: 0 }}>
              {isMainEvent ? (
                <DashboardIcon sx={{ color: '#00B2C0', fontSize: { xs: 24, sm: 28, md: 32 }, flexShrink: 0 }} />
              ) : (
                <EventIcon sx={{ color: '#FAA951', fontSize: { xs: 24, sm: 28, md: 32 }, flexShrink: 0 }} />
              )}
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography 
                  variant="h4" 
                  fontWeight={700} 
                  color="primary.main"
                  sx={{ 
                    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2.125rem' },
                    lineHeight: { xs: 1.3, sm: 1.4, md: 1.5 },
                    wordBreak: 'break-word'
                  }}
                >
                  {event.eventName || 'Event'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 0.75, md: 1 }, mt: { xs: 0.25, sm: 0.5 }, flexWrap: 'wrap' }}>
                  <Chip 
                    label={isMainEvent ? 'Program Dashboard' : 'Check-in Event'} 
                    size="small" 
                    color={isMainEvent ? 'primary' : 'success'}
                    sx={{ 
                      fontWeight: 600,
                      fontSize: { xs: '0.65rem', sm: '0.75rem' },
                      height: { xs: 20, sm: 24 }
                    }}
                  />
                  {isMainEvent && hasSecondaryEvents && (
                    <Chip 
                      label={`${secondaryEvents.length} Check-in Event${secondaryEvents.length > 1 ? 's' : ''}`} 
                      size="small" 
                      variant="outlined"
                      color="primary"
                      sx={{ 
                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                        height: { xs: 20, sm: 24 }
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
            {canEdit && (
              <Tooltip title="Edit Event Details">
                <IconButton 
                  onClick={handleEditClick}
                  size="small"
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.8)', 
                    '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                    ml: { xs: 0.5, sm: 1 },
                    flexShrink: 0,
                    width: { xs: 32, sm: 40 },
                    height: { xs: 32, sm: 40 }
                  }}
                >
                  <EditIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>  
          
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ 
              fontWeight: 500,
              fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' },
              mb: { xs: 0.5, sm: 0.75, md: 1 }
            }}
          >
            Contract: {event.eventContractNumber || '—'}
          </Typography>
          <Box sx={{ mb: { xs: 0.5, sm: 0.75, md: 1 } }}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                fontWeight: 500,
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            >
              Start Date: {event.eventStart ? new Date(event.eventStart).toLocaleDateString() : '—'}
            </Typography> 
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                fontWeight: 500,
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            >
              End Date: {event.eventEnd ? new Date(event.eventEnd).toLocaleDateString() : '—'}
            </Typography>
          </Box>
          <Box>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                fontWeight: 500,
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            >
              Operations Manager: {event.createdBy ? getUserDisplayName(event.createdBy, '—') : '—'}
            </Typography> 
          </Box>

          {isMainEvent && hasSecondaryEvents && (
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mt: { xs: 0.75, sm: 1 },
                fontStyle: 'italic',
                fontSize: { xs: '0.7rem', sm: '0.875rem' }
              }}
            >
              This is the main program dashboard. Guests check in to the individual events below.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Event Navigation Dropdown - Only show if there are multiple events */}
      {showDropdown && (hasSecondaryEvents || (event && mainEvent && event._id !== mainEvent._id)) && (
        <Box sx={{ 
          p: { xs: 1, sm: 1.5, md: 2 }, 
          bgcolor: 'grey.50', 
          borderRadius: { xs: 1.5, sm: 2 }, 
          border: '1px solid #e0e0e0'
        }}>
          <Typography 
            variant="subtitle2" 
            color="text.secondary" 
            sx={{ 
              mb: { xs: 0.75, sm: 1 }, 
              fontWeight: 600,
              fontSize: { xs: '0.75rem', sm: '0.875rem' }
            }}
          >
            Switch Between Events:
          </Typography>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 }, width: { xs: '100%', sm: 'auto' } }}>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, width: '100%' }}>
                    <DashboardIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: '#00B2C0', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                      {mainEvent?.eventName}
                    </Typography>
                    <Chip 
                      label="Dashboard" 
                      size="small" 
                      color="primary" 
                      sx={{ 
                        ml: 'auto', 
                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                        height: { xs: 18, sm: 24 },
                        flexShrink: 0
                      }} 
                    />
                  </Box>
                </MenuItem>
              )}
              {secondaryEvents.map(ev => (
                <MenuItem key={ev?._id} value={ev?._id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, width: '100%' }}>
                    <EventIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: '#FAA951', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                      {ev?.eventName}
                    </Typography>
                    <Chip 
                      label="Check-in" 
                      size="small" 
                      color="success" 
                      sx={{ 
                        ml: 'auto',
                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                        height: { xs: 18, sm: 24 },
                        flexShrink: 0
                      }} 
                    />
                  </Box>
                </MenuItem>
              ))}
              {/* If current event is not in the above, add it */}
              {event && mainEvent && event._id !== mainEvent._id && !secondaryEvents.some(ev => ev._id === event._id) && (
                <MenuItem key={event._id} value={event._id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, width: '100%' }}>
                    <EventIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: '#FAA951', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                      {event.eventName}
                    </Typography>
                    <Chip 
                      label="Check-in" 
                      size="small" 
                      color="success" 
                      sx={{ 
                        ml: 'auto',
                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                        height: { xs: 18, sm: 24 },
                        flexShrink: 0
                      }} 
                    />
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