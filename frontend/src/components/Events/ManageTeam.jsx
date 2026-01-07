import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip,
  Alert,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Card,
  CardContent,
  Divider,
  useMediaQuery,
  useTheme,
  Stack
} from '@mui/material';
import {
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { getEventAssignedUsers, assignUsersToEvent, removeUserFromEvent, getAllUsers, updateUserAssignment } from '../../services/api';
import { getEvent } from '../../services/events';
import api from '../../services/api';
import toast from 'react-hot-toast';
import AvatarIcon from '../dashboard/AvatarIcon';
import MainLayout from '../layout/MainLayout';
import EventHeader from './EventHeader';
import { useParams, useNavigate } from 'react-router-dom';

const ManageTeam = ({ eventId, eventName }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [secondaryEvents, setSecondaryEvents] = useState([]);
  const [selectedSecondaryEvent, setSelectedSecondaryEvent] = useState('');
  const [event, setEvent] = useState(null);
  const [parentEvent, setParentEvent] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const searchRef = useRef(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editSecondaryEvent, setEditSecondaryEvent] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAssignments(),
        loadAllUsers(),
        loadEventData()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const response = await getEventAssignedUsers(eventId);
      setAssignments(response.data.assignments || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast.error('Failed to load assigned users');
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await getAllUsers();
      console.log('All users response:', response.data);
      // Filter to show staff, operations_manager, and admin users for assignment
      const users = (response.data.users || []).filter(
        user => user.isActive && (user.role === 'staff' || user.role === 'operations_manager' || user.role === 'admin')
      );
      console.log('Filtered users for assignment:', users);
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  const loadEventData = async () => {
    try {
      const eventData = await getEvent(eventId);
      setEvent(eventData);
      
      // Load parent event if this is a secondary event
      if (eventData.parentEventId) {
        const parent = await getEvent(eventData.parentEventId);
        setParentEvent(parent);
      }
      
      // Determine main event ID
      let mainEventId = eventId;
      if (eventData.parentEventId) {
        mainEventId = eventData.parentEventId;
      }
      
      // Fetch secondary events if this is a main event
      if (eventData.isMainEvent || !eventData.parentEventId) {
        const response = await api.get(`/events?parentEventId=${mainEventId}`);
        const secondary = response.data.events || response.data || [];
        setSecondaryEvents(secondary);
      }
    } catch (error) {
      console.error('Error loading event data:', error);
    }
  };

  const handleOpenAssignForm = () => {
    setShowAssignForm(true);
    setSelectedUsers([]);
    setSelectedSecondaryEvent('');
    setSearchTerm('');
    setSearchInput('');
    setShowUserList(false);
  };

  const handleCloseAssignForm = () => {
    setShowAssignForm(false);
    setSelectedUsers([]);
    setSelectedSecondaryEvent('');
    setSearchTerm('');
    setSearchInput('');
    setShowUserList(false);
  };

  const handleAssignUsers = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    try {
      setAssigning(true);
      const userIds = selectedUsers.map(user => user._id);
      const allocatedToSecondaryEventId = selectedSecondaryEvent || null;
      
      await assignUsersToEvent(eventId, userIds, allocatedToSecondaryEventId);
      toast.success(`Successfully assigned ${selectedUsers.length} user(s) to event`);
      await loadAssignments();
      handleCloseAssignForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign users');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveUser = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this user from the event?')) {
      return;
    }

    try {
      await removeUserFromEvent(eventId, assignmentId);
      toast.success('User removed from event');
      await loadAssignments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove user');
    }
  };

  const handleOpenEditDialog = (assignment) => {
    setEditingAssignment(assignment);
    setEditSecondaryEvent(assignment.allocatedToSecondaryEvent?._id || '');
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingAssignment(null);
    setEditSecondaryEvent('');
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;

    try {
      setUpdating(true);
      const allocatedToSecondaryEventId = editSecondaryEvent || null;
      await updateUserAssignment(eventId, editingAssignment._id, allocatedToSecondaryEventId);
      toast.success('User allocation updated successfully');
      await loadAssignments();
      handleCloseEditDialog();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update allocation');
    } finally {
      setUpdating(false);
    }
  };

  const getUserDisplayName = (user) => {
    if (user.username) return user.username;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    return user.email || 'Unknown User';
  };

  // Filter out already assigned users
  // A user can only be assigned once per event (either to main event or to a specific secondary event)
  const availableUsers = allUsers.filter(user => {
    // Check if user is already assigned
    const isAssigned = assignments.some(assignment => {
      if (assignment.user?._id !== user._id) return false;
      // If no secondary event is selected, check if user is assigned to main event
      if (!selectedSecondaryEvent) {
        return !assignment.allocatedToSecondaryEvent;
      }
      // If secondary event is selected, check if user is assigned to that specific secondary event
      return assignment.allocatedToSecondaryEvent?._id === selectedSecondaryEvent;
    });
    return !isAssigned;
  });

  // Filter users based on search input
  const filteredAvailableUsers = availableUsers.filter(user => {
    if (!searchInput) return true;
    const displayName = getUserDisplayName(user).toLowerCase();
    const email = (user.email || '').toLowerCase();
    const search = searchInput.toLowerCase();
    return displayName.includes(search) || email.includes(search);
  });

  const handleUserToggle = (user) => {
    const isSelected = selectedUsers.some(u => (u._id || u.id) === (user._id || user.id));
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => (u._id || u.id) !== (user._id || user.id)));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
    // Close dropdown after selection
    setTimeout(() => {
      setShowUserList(false);
    }, 100);
  };

  const handleSearchFocus = () => {
    setShowUserList(true);
  };

  const handleSearchBlur = (e) => {
    // Delay to allow click on list item
    setTimeout(() => {
      // Check if the click was outside the search container
      if (!searchRef.current?.contains(document.activeElement)) {
        setShowUserList(false);
      }
    }, 150);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserList && searchRef.current && !searchRef.current.contains(event.target)) {
        setShowUserList(false);
      }
    };

    if (showUserList) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserList]);

  if (loading) {
    return (
      <MainLayout eventName={eventName || 'Loading Event...'}>
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout eventName={event?.eventName || eventName || 'Manage Team'}>
      {event && (
        <EventHeader 
          event={event} 
          mainEvent={parentEvent || event} 
          showDropdown={true}
        />
      )}
      <Box sx={{ px: { xs: 1.5, sm: 3 }, py: 2 }}>
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        gap={{ xs: 2, sm: 0 }}
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/events/${eventId}`)}
            sx={{ minWidth: 'auto' }}
            size={isMobile ? 'small' : 'medium'}
          >
            Back
          </Button>
          <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600}>
            <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: isMobile ? '1.2rem' : 'inherit' }} />
            Team Members
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleOpenAssignForm}
          size={isMobile ? 'small' : 'small'}
          fullWidth={isMobile}
        >
          Assign Team Members
        </Button>
      </Box>

      {assignments.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No team members assigned to this event yet. Click "Assign Team Members" to get started.
        </Alert>
      ) : isMobile ? (
        // Mobile Card View
        <Stack spacing={2}>
          {assignments.map((assignment) => (
            <Card key={assignment._id} elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                    <AvatarIcon 
                      user={assignment.user} 
                      userId={assignment.user._id}
                      showTooltip={false}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body1" fontWeight={600} noWrap>
                        {getUserDisplayName(assignment.user)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {assignment.user.email}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Edit Allocation">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenEditDialog(assignment)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove from Event">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveUser(assignment._id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Role
                    </Typography>
                    <Chip
                      label={
                        assignment.user.role === 'operations_manager' ? 'Operations' :
                        assignment.user.role === 'admin' ? 'Admin' :
                        'Staff'
                      }
                      size="small"
                      color={
                        assignment.user.role === 'operations_manager' ? 'primary' :
                        assignment.user.role === 'admin' ? 'error' :
                        'default'
                      }
                      sx={{ textTransform: 'capitalize', mt: 0.5 }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Allocated To
                    </Typography>
                    <Typography variant="body2" color={assignment.allocatedToSecondaryEvent ? 'primary.main' : 'text.secondary'} sx={{ mt: 0.5 }}>
                      {assignment.allocatedToSecondaryEvent ? assignment.allocatedToSecondaryEvent.eventName : 'Main Event'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Assigned By
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {assignment.assignedBy?.username || assignment.assignedBy?.email || 'Unknown'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        // Desktop Table View
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Allocated To</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Assigned By</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment._id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AvatarIcon 
                        user={assignment.user} 
                        userId={assignment.user._id}
                        showTooltip={false}
                      />
                      <Typography variant="body2" fontWeight={500}>
                        {getUserDisplayName(assignment.user)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {assignment.user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        assignment.user.role === 'operations_manager' ? 'Operations' :
                        assignment.user.role === 'admin' ? 'Admin' :
                        'Staff'
                      }
                      size="small"
                      color={
                        assignment.user.role === 'operations_manager' ? 'primary' :
                        assignment.user.role === 'admin' ? 'error' :
                        'default'
                      }
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    {assignment.allocatedToSecondaryEvent ? (
                      <Typography variant="body2" color="primary.main">
                        {assignment.allocatedToSecondaryEvent.eventName}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Main Event
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {assignment.assignedBy?.username || assignment.assignedBy?.email || 'Unknown'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="Edit Allocation">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEditDialog(assignment)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove from Event">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveUser(assignment._id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Assign Users Form - Inline instead of nested dialog */}
      {showAssignForm && (
        <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mt: 3, mb: 3, borderRadius: 2 }}>
          <Box 
            display="flex" 
            flexDirection={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between" 
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            gap={{ xs: 2, sm: 0 }}
            mb={3}
          >
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600}>
              Assign Team Members
            </Typography>
            <Button
              onClick={handleCloseAssignForm}
              size="small"
              fullWidth={isMobile}
            >
              Cancel
            </Button>
          </Box>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Select team members to assign to this event. You can select multiple users at once.
              </Typography>
              {availableUsers.length === 0 && allUsers.length > 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  All available users are already assigned to this event.
                </Alert>
              )}
              {allUsers.length === 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  No users found. Please ensure there are active staff or operations manager users in the system.
                </Alert>
              )}
            </Box>

            {/* Searchable User Selection */}
            <Box sx={{ mb: 3, position: 'relative' }} ref={searchRef}>
            <TextField
              fullWidth
              label="Search and select team members"
              placeholder="Type to search by name or email..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setShowUserList(true);
              }}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                ),
              }}
            />
            
            {/* Selected Users Chips */}
            {selectedUsers.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedUsers.map((user) => (
                  <Chip
                    key={user._id || user.id}
                    label={getUserDisplayName(user)}
                    onDelete={() => handleUserToggle(user)}
                    size="small"
                    color="primary"
                  />
                ))}
              </Box>
            )}

            {/* User List Dropdown */}
            {showUserList && filteredAvailableUsers.length > 0 && (
              <Paper
                elevation={3}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 0.5,
                  mb: 2, // Add margin bottom to prevent covering buttons
                  maxHeight: { xs: '250px', sm: '300px' },
                  overflow: 'auto',
                  zIndex: 1500,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <List dense sx={{ py: 1 }}>
                  {filteredAvailableUsers.map((user) => {
                    const isSelected = selectedUsers.some(u => (u._id || u.id) === (user._id || user.id));
                    return (
                      <ListItem
                        key={user._id || user.id}
                        disablePadding
                        onClick={() => handleUserToggle(user)}
                        sx={{
                          cursor: 'pointer',
                          px: 2,
                          py: 0.5,
                          '&:hover': {
                            backgroundColor: 'action.hover'
                          }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <Checkbox
                            edge="start"
                            checked={isSelected}
                            tabIndex={-1}
                            disableRipple
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={getUserDisplayName(user)}
                          secondary={user.email}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Paper>
            )}

            {showUserList && searchInput && filteredAvailableUsers.length === 0 && (
              <Paper
                elevation={3}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 0.5,
                  p: 2,
                  zIndex: 1500,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  No users match your search
                </Typography>
              </Paper>
            )}
            </Box>

            {/* Secondary Event Allocation (if available) */}
            {secondaryEvents.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Allocate to Specific Event (Optional)</InputLabel>
                  <Select
                    value={selectedSecondaryEvent}
                    onChange={(e) => setSelectedSecondaryEvent(e.target.value)}
                    label="Allocate to Specific Event (Optional)"
                  >
                    <MenuItem value="">
                      <em>Main Event (Default)</em>
                    </MenuItem>
                    {secondaryEvents.map((secEvent) => (
                      <MenuItem key={secEvent._id} value={secEvent._id}>
                        {secEvent.eventName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Leave as "Main Event" to assign to the main dashboard, or select a specific secondary event.
                </Typography>
              </Box>
            )}

            {selectedUsers.length > 0 && (
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                {selectedUsers.length} user(s) selected for assignment
              </Alert>
            )}

            <Box 
              sx={{ 
                mt: 4, 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'flex-end', 
                gap: 2 
              }}
            >
              <Button 
                onClick={handleCloseAssignForm} 
                disabled={assigning}
                fullWidth={isMobile}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignUsers}
                variant="contained"
                disabled={assigning || selectedUsers.length === 0}
                startIcon={assigning ? <CircularProgress size={16} /> : <PersonAddIcon />}
                fullWidth={isMobile}
              >
                {assigning ? 'Assigning...' : 'Assign Users'}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Edit Allocation Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Edit Event Allocation</DialogTitle>
        <DialogContent>
          {editingAssignment && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Update the event allocation for <strong>{getUserDisplayName(editingAssignment.user)}</strong>
              </Typography>
              
              {secondaryEvents.length > 0 ? (
                <FormControl fullWidth sx={{ mt: 3 }}>
                  <InputLabel>Allocate to Event</InputLabel>
                  <Select
                    value={editSecondaryEvent}
                    onChange={(e) => setEditSecondaryEvent(e.target.value)}
                    label="Allocate to Event"
                  >
                    <MenuItem value="">
                      <em>Main Event (Default)</em>
                    </MenuItem>
                    {secondaryEvents.map((secEvent) => (
                      <MenuItem key={secEvent._id} value={secEvent._id}>
                        {secEvent.eventName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This event has no secondary events. The user will be allocated to the main event.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 }, px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 1 } }}>
          <Button 
            onClick={handleCloseEditDialog} 
            disabled={updating}
            fullWidth={isMobile}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateAssignment}
            variant="contained"
            disabled={updating}
            startIcon={updating ? <CircularProgress size={16} /> : <EditIcon />}
            fullWidth={isMobile}
          >
            {updating ? 'Updating...' : 'Update Allocation'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </MainLayout>
  );
};

// Wrapper component for routing
function ManageTeamWrapper() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  
  useEffect(() => {
    if (eventId) {
      getEvent(eventId).then(setEvent).catch(console.error);
    }
  }, [eventId]);
  
  return <ManageTeam eventId={eventId} eventName={event?.eventName || 'Loading Event...'} />;
}

export default ManageTeamWrapper;

