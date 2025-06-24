import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  IconButton,
  Snackbar,
  Divider,
  Avatar
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MainNavigation from '../MainNavigation';
import {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  createUser,
  updateUserRole,
  assignUserToEvents,
  getAvailableEvents,
  deactivateUser,
  deleteUser
} from '../../services/api';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon2 from '@mui/icons-material/Person';

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isOperationsManager, isAdmin } = useAuth();
  
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [createUserDialog, setCreateUserDialog] = useState(false);
  const [assignEventsDialog, setAssignEventsDialog] = useState(false);
  const [selectedUserForAssignment, setSelectedUserForAssignment] = useState(null);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Determine if this is viewing own profile or managing users
  const isOwnProfile = !userId || userId === currentUser?.id;
  const canManageUsers = isOperationsManager || isAdmin;
  const canViewAllUsers = canManageUsers;

  useEffect(() => {
    loadProfile();
    if (canViewAllUsers) {
      loadAllUsers();
      loadAvailableEvents();
    }
  }, [userId, canViewAllUsers]);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getUserProfile(userId);
      setUser(response.data.user);
      setEditValues({
        email: response.data.user.email,
        username: response.data.user.username
      });
    } catch (err) {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await getAllUsers();
      setAllUsers(response.data.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadAvailableEvents = async () => {
    try {
      const response = await getAvailableEvents();
      setAvailableEvents(response.data.events);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const handleEditClick = () => {
    setEditMode(true);
  };

  const handleEditCancel = () => {
    setEditMode(false);
    setEditValues({
      email: user.email,
      username: user.username
    });
  };

  const handleEditSave = async () => {
    try {
      await updateUserProfile(userId, editValues);
      setSuccess('Profile updated successfully!');
      setEditMode(false);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      await createUser(userData);
      setSuccess('User created successfully!');
      setCreateUserDialog(false);
      loadAllUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user.');
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      setSuccess('User role updated successfully!');
      loadAllUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user role.');
    }
  };

  const handleAssignEvents = async () => {
    try {
      await assignUserToEvents(selectedUserForAssignment._id, selectedEvents.map(e => e._id));
      setSuccess('User assigned to events successfully!');
      setAssignEventsDialog(false);
      setSelectedUserForAssignment(null);
      setSelectedEvents([]);
      loadAllUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign events.');
    }
  };

  const handleDeleteUser = async () => {
    try {
      await deleteUser(userToDelete._id);
      setSuccess('User deleted successfully!');
      setDeleteDialog(false);
      setUserToDelete(null);
      loadAllUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'operations_manager': return 'warning';
      case 'staff': return 'info';
      default: return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'operations_manager': return 'Operations Manager';
      case 'staff': return 'Staff';
      default: return role;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <MainNavigation />
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  if (error && !user) {
    return (
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <MainNavigation />
        <Box sx={{ flex: 1, p: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainNavigation />
      <Box sx={{ flex: 1, overflow: 'auto', p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {isOwnProfile ? '👤 My Profile' : '👥 User Management'}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && (
          <Snackbar open autoHideDuration={3000} onClose={() => setSuccess('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
            <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>{success}</Alert>
          </Snackbar>
        )}

        {isOwnProfile ? (
          // Personal Profile View
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
                    <PersonIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h5">{user?.username}</Typography>
                    <Chip 
                      label={getRoleLabel(user?.role)} 
                      color={getRoleColor(user?.role)} 
                      size="small" 
                    />
                  </Box>
                </Box>
                {!editMode && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={handleEditClick}
                  >
                    Edit Profile
                  </Button>
                )}
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={editMode ? editValues.email : user?.email}
                    onChange={(e) => editMode && setEditValues({ ...editValues, email: e.target.value })}
                    disabled={!editMode}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={editMode ? editValues.username : user?.username}
                    onChange={(e) => editMode && setEditValues({ ...editValues, username: e.target.value })}
                    disabled={!editMode}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Role"
                    value={getRoleLabel(user?.role)}
                    disabled
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Last Login"
                    value={user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                    disabled
                    margin="normal"
                  />
                </Grid>
              </Grid>

              {editMode && (
                <Box display="flex" gap={2} mt={3}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleEditSave}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleEditCancel}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        ) : (
          // User Management View
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="subtitle1" color="textSecondary">
                Manage users and their access levels
              </Typography>
              {canManageUsers && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateUserDialog(true)}
                >
                  Add New User
                </Button>
              )}
            </Box>

            <Card>
              <CardContent>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Last Login</TableCell>
                        <TableCell>Assigned Events</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allUsers.map((user) => (
                        <TableRow key={user._id}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                <PersonIcon sx={{ fontSize: 16 }} />
                              </Avatar>
                              {user.username}
                            </Box>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip 
                              label={getRoleLabel(user.role)} 
                              color={getRoleColor(user.role)} 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell>
                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                              {user.assignedEvents?.slice(0, 2).map((event, index) => (
                                <Chip 
                                  key={event._id} 
                                  label={event.eventName} 
                                  size="small" 
                                  variant="outlined"
                                />
                              ))}
                              {user.assignedEvents?.length > 2 && (
                                <Chip 
                                  label={`+${user.assignedEvents.length - 2} more`} 
                                  size="small" 
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box display="flex" gap={1} justifyContent="center">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedUserForAssignment(user);
                                  setAssignEventsDialog(true);
                                }}
                                title="Assign Events"
                              >
                                <AssignmentIcon />
                              </IconButton>
                              {isAdmin && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setDeleteDialog(true);
                                  }}
                                  title="Delete User"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </>
        )}
      </Box>

      {/* Create User Dialog */}
      <Dialog open={createUserDialog} onClose={() => setCreateUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <CreateUserForm onSubmit={handleCreateUser} onCancel={() => setCreateUserDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Assign Events Dialog */}
      <Dialog open={assignEventsDialog} onClose={() => setAssignEventsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Assign Events to {selectedUserForAssignment?.username}</DialogTitle>
        <DialogContent>
          <Autocomplete
            multiple
            options={availableEvents}
            getOptionLabel={(option) => `${option.eventName} (${option.eventContractNumber})`}
            value={selectedEvents}
            onChange={(_, newValue) => setSelectedEvents(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="Select Events"
                margin="normal"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option.eventName}
                  {...getTagProps({ index })}
                  key={option._id}
                />
              ))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignEventsDialog(false)}>Cancel</Button>
          <Button onClick={handleAssignEvents} variant="contained">Assign Events</Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {userToDelete?.username}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Create User Form Component
const CreateUserForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    role: 'staff'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <TextField
        fullWidth
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
        margin="normal"
      />
      <TextField
        fullWidth
        label="Username"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        required
        margin="normal"
      />
      <TextField
        fullWidth
        label="Password"
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
        margin="normal"
      />
      <FormControl fullWidth margin="normal">
        <InputLabel>Role</InputLabel>
        <Select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          label="Role"
        >
          <MenuItem value="staff">Staff</MenuItem>
          <MenuItem value="operations_manager">Operations Manager</MenuItem>
        </Select>
      </FormControl>
      <Box display="flex" gap={2} mt={3}>
        <Button type="submit" variant="contained">Create User</Button>
        <Button onClick={onCancel} variant="outlined">Cancel</Button>
      </Box>
    </Box>
  );
};

export default ProfilePage; 