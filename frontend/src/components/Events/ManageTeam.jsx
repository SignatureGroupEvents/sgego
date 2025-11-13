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
  ListItemIcon
} from '@mui/material';
import {
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { getEventAssignedUsers, assignUsersToEvent, removeUserFromEvent, getAllUsers } from '../../services/api';
import { getEvent } from '../../services/events';
import api from '../../services/api';
import toast from 'react-hot-toast';
import AvatarIcon from '../dashboard/AvatarIcon';

const ManageTeam = ({ eventId }) => {
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
  const [searchInput, setSearchInput] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const searchRef = useRef(null);

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
      // Filter to only show staff and operations_manager (not admin for assignment)
      const users = (response.data.users || []).filter(
        user => user.isActive && (user.role === 'staff' || user.role === 'operations_manager')
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
  };

  const handleSearchFocus = () => {
    setShowUserList(true);
  };

  const handleSearchBlur = (e) => {
    // Delay to allow click on list item
    setTimeout(() => {
      if (!searchRef.current?.contains(e.relatedTarget)) {
        setShowUserList(false);
      }
    }, 200);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight={600}>
          <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Team Members
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleOpenAssignForm}
          size="small"
        >
          Assign Team Members
        </Button>
      </Box>

      {assignments.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No team members assigned to this event yet. Click "Assign Team Members" to get started.
        </Alert>
      ) : (
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
                      label={assignment.user.role === 'operations_manager' ? 'Operations' : 'Staff'}
                      size="small"
                      color={assignment.user.role === 'operations_manager' ? 'primary' : 'default'}
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
                    <Tooltip title="Remove from Event">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveUser(assignment._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Assign Users Form - Inline instead of nested dialog */}
      {showAssignForm && (
        <Paper elevation={2} sx={{ p: 3, mt: 3, mb: 3, borderRadius: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" fontWeight={600}>
              Assign Team Members
            </Typography>
            <Button
              onClick={handleCloseAssignForm}
              size="small"
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
                  maxHeight: '300px',
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
              <Alert severity="info" sx={{ mt: 2 }}>
                {selectedUsers.length} user(s) selected for assignment
              </Alert>
            )}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button onClick={handleCloseAssignForm} disabled={assigning}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignUsers}
                variant="contained"
                disabled={assigning || selectedUsers.length === 0}
                startIcon={assigning ? <CircularProgress size={16} /> : <PersonAddIcon />}
              >
                {assigning ? 'Assigning...' : 'Assign Users'}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ManageTeam;

