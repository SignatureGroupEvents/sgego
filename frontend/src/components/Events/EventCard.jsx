import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Box, Chip, Button, IconButton, Menu, MenuItem, Collapse, List, ListItem, ListItemText, ListItemIcon, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert as MuiAlert, CircularProgress, Backdrop } from '@mui/material';
import { MoreVert as MoreVertIcon, Edit as EditIcon, Delete as DeleteIcon, People as PeopleIcon, CheckCircle as CheckinIcon, Event as EventIcon, ExpandLess, ExpandMore, SubdirectoryArrowRight as SubEventIcon, GroupWork as GroupWorkIcon, Dashboard as DashboardIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { deleteEvent as deleteEventApi } from '../../services/events';

const EventCard = ({ event, isSecondary = false, onEdit, onDelete, onViewGuests, onCheckin, secondaryEvents = [] }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { isOperationsManager, isAdmin } = useAuth();
  const navigate = useNavigate();

  const canManage = isOperationsManager || isAdmin;
  const hasSecondaries = secondaryEvents.length > 0;

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => setAnchorEl(null);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteEventApi(event._id);
      setDeleting(false);
      setDeleteDialogOpen(false);
      handleMenuClose();
      setSnackbarOpen(true);
      // Optionally, call onDelete callback here if provided
      if (onDelete) onDelete(event._id);
    } catch (err) {
      setDeleting(false);
      alert('Failed to delete event.');
    }
  };

  return (
    <Card
      onClick={() => navigate(`/events/${event._id}`)}
      sx={{
        minHeight: 340,
        width: 350,
        maxWidth: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        cursor: 'pointer',
        bgcolor: isSecondary ? 'grey.50' : 'background.paper',
        borderLeft: isSecondary ? 4 : 0,
        borderColor: isSecondary ? 'secondary.main' : 'transparent',
        boxShadow: isSecondary ? 1 : 3,
        '&:hover': {
          boxShadow: 6,
          bgcolor: isSecondary ? 'grey.100' : 'grey.50',
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out'
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              <EventIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
              {event.eventName}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Contract: {event.eventContractNumber}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center">
            {canManage && (
              <IconButton size="small" onClick={handleMenuClick} sx={{ mt: -1, mr: -1 }}>
                <MoreVertIcon />
              </IconButton>
            )}
          </Box>
        </Box>
        <Box mb={2}>
          <Typography variant="body2" gutterBottom>
            📅 {format(new Date(event.eventStart), 'PPP p')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            👤 Created by: {event.createdBy?.username}
          </Typography>
        </Box>
        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
          {event.isMainEvent ? (
            <Chip label="Main Event" color="primary" size="small" />
          ) : (
            <Chip label="Secondary Event" color="secondary" size="small" />
          )}
          {event.includeStyles && (
            <Chip label="Styles Enabled" variant="outlined" size="small" />
          )}
          {event.allowMultipleGifts && (
            <Chip label="Multi-Gift" variant="outlined" size="small" />
          )}
        </Box>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          onClick={e => e.stopPropagation()}
        >
          {canManage && (
            <MenuItem onClick={() => { onEdit && onEdit(event._id); handleMenuClose(); }}>
              <EditIcon sx={{ mr: 1 }} fontSize="small" />Edit
            </MenuItem>
          )}
          {canManage && (
            <MenuItem onClick={() => { setDeleteDialogOpen(true); }}>
              <DeleteIcon sx={{ mr: 1 }} fontSize="small" />Delete
            </MenuItem>
          )}
        </Menu>
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Event</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this event? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} color="secondary">Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
          </DialogActions>
        </Dialog>
        <Backdrop open={deleting} sx={{ zIndex: (theme) => theme.zIndex.modal + 1, color: '#fff' }}>
          <Box display="flex" flexDirection="column" alignItems="center">
            <CircularProgress color="inherit" />
            <Typography variant="h6" sx={{ mt: 2 }}>Deleting event...</Typography>
          </Box>
        </Backdrop>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={600}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <MuiAlert elevation={6} variant="filled" severity="success" sx={{ width: '100%' }}>
            Event deleted successfully.
          </MuiAlert>
        </Snackbar>
        {/* Has Additional Events Indicator and Expander */}
        {hasSecondaries && !isSecondary && (
          <Box sx={{ pb: 1, pt: 1, display: 'flex', justifyContent: 'center' }}>
            <Chip
              icon={<GroupWorkIcon />}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  Has Additional Events
                  {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </Box>
              }
              color="secondary"
              variant="outlined"
              onClick={e => { e.stopPropagation(); setExpanded(exp => !exp); }}
              sx={{ cursor: 'pointer', fontWeight: 500, fontSize: '1rem', px: 2 }}
            />
          </Box>
        )}
        {/* Additional Events List */}
        {hasSecondaries && !isSecondary && (
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <List dense sx={{ mt: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              {secondaryEvents.map(sec => (
                <ListItem
                  key={sec._id}
                  sx={{
                    pl: 2,
                    cursor: 'pointer',
                    borderRadius: 1,
                    transition: 'background 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      bgcolor: 'grey.200',
                      boxShadow: 2,
                    },
                  }}
                  onClick={() => navigate(`/events/${sec._id}`)}
                >
                  <ListItemIcon>
                    <SubEventIcon color="secondary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={sec.eventName} />
                  <Chip label="Secondary" color="secondary" size="small" sx={{ ml: 1 }} />
                </ListItem>
              ))}
            </List>
          </Collapse>
        )}
      </CardContent>
    </Card>
  );
};

export default EventCard; 