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
  Avatar,
  InputAdornment
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
  Group as GroupIcon,
  Visibility,
  VisibilityOff
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
  deleteUser,
  inviteUser,
  sendPasswordResetLink
} from '../../services/api';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon2 from '@mui/icons-material/Person';
import api from '../../services/api';

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
  const [inviteDialog, setInviteDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createRoleModal, setCreateRoleModal] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Role editing state
  const [editingRoleUserId, setEditingRoleUserId] = useState(null);
  const [editingRoleValue, setEditingRoleValue] = useState('');
  const [roleUpdateLoading, setRoleUpdateLoading] = useState(false);
  const [roleConfirmDialog, setRoleConfirmDialog] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState({ userId: null, newRole: '', oldRole: '', userName: '' });

  // Determine if this is viewing own profile or managing users
  const isOwnProfile = !userId || userId === currentUser?.id;
  const canManageUsers = isOperationsManager || isAdmin;
  const canViewAllUsers = canManageUsers || isAdmin || isOperationsManager || currentUser?.role === 'staff';
  const canModifyUsers = isOperationsManager || isAdmin; // Staff can view but not modify

  // --- Refactor: Always show user management for admin/ops ---
  const showUserManagement = canViewAllUsers;

  useEffect(() => {
    loadProfile();
    if (canViewAllUsers) {
      loadAllUsers();
      loadAvailableEvents();
    }
  }, [userId, canViewAllUsers]);

  useEffect(() => {
    // Always fetch users from backend on initial load
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await getAllUsers();
        setAllUsers(response.data.users || []);
        console.log('Loaded users:', response.data.users);
      } catch (err) {
        setError('Failed to load users.');
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

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

  const handleRoleChange = (userId, newRole, oldRole, userName) => {
    // Prevent admins from editing their own role
    if (userId === currentUser?.id) {
      setError('You cannot change your own role');
      return;
    }
    
    setRoleChangeData({ userId, newRole, oldRole, userName });
    setRoleConfirmDialog(true);
    setError('');
  };

  const handleRoleConfirm = async () => {
    setRoleUpdateLoading(true);
    setError('');
    
    try {
      await updateUserRole(roleChangeData.userId, roleChangeData.newRole);
      setSuccess('User role updated successfully!');
      setRoleConfirmDialog(false);
      setRoleChangeData({ userId: null, newRole: '', oldRole: '', userName: '' });
      loadAllUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user role.');
    } finally {
      setRoleUpdateLoading(false);
    }
  };

  const handleRoleCancel = () => {
    setRoleConfirmDialog(false);
    setRoleChangeData({ userId: null, newRole: '', oldRole: '', userName: '' });
    setError('');
  };

  const handleAssignEvents = async () => {
    try {
      await assignUserToEvents(selectedUserForAssignment._id, selectedEvents.map(e => e._id));
      setSuccess('Events assigned successfully!');
      setAssignEventsDialog(false);
      setSelectedEvents([]);
      setSelectedUserForAssignment(null);
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

  const handleInviteUser = async (inviteData) => {
    try {
      await inviteUser(inviteData);
      setSuccess('User invited successfully!');
      setInviteDialog(false);
      loadAllUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to invite user.');
    }
  };

  const handleResendInvite = async (userId) => {
    try {
      await api.post(`/users/${userId}/resend-invite`);
      setSuccess('Invite resent successfully!');
      loadAllUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend invite.');
    }
  };

  const handleSendResetLink = async (userId) => {
    try {
      await sendPasswordResetLink(userId);
      setSuccess('Password reset link sent successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send password reset link.');
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

  // Filter users based on filters
  const filteredUsers = allUsers.filter((user) => {
    // Status filter
    if (filterStatus === 'pending') {
      if (!(user.isInvited === true && user.isActive === false)) return false;
    } else if (filterStatus === 'expired') {
      if (!(user.isInvited === true && user.isActive === false && user.inviteExpired)) return false;
    }
    // Role filter
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    // Search filter
    if (searchQuery && !(`${user.username || user.name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) || `${user.email}`.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    return true;
  });

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
        {showUserManagement ? (
          <>
            <Typography variant="h4" gutterBottom>
              Roles & Permissions
            </Typography>
            <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 3 }}>
              {canModifyUsers 
                ? 'Invite collaborators to work on this site and manage roles.'
                : 'View user information and assigned events (read-only mode).'
              }
            </Typography>

            {!canModifyUsers && (
              <Alert severity="info" sx={{ mb: 3 }}>
                You are viewing user information in read-only mode. Only administrators and operations managers can modify user data.
              </Alert>
            )}

            {/* Filter/Search Bar Section */}
            <AccountFilters
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterRole={filterRole}
              setFilterRole={setFilterRole}
              onCreateRole={() => setCreateRoleModal(true)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              canModifyUsers={canModifyUsers}
            />

            <Box display="flex" justifyContent="flex-end" alignItems="center" mb={3}>
              {canModifyUsers && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setInviteDialog(true)}
                >
                  Invite User
                </Button>
              )}
            </Box>
            <Card>
              <CardContent>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user._id}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                <PersonIcon sx={{ fontSize: 16 }} />
                              </Avatar>
                              {user.name || user.username || ''}
                            </Box>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <FormControl size="small" sx={{ minWidth: 150 }}>
                                <Select
                                  value={user.role}
                                  onChange={(e) => handleRoleChange(user._id, e.target.value, user.role, user.username || user.email)}
                                  disabled={!isAdmin || user._id === currentUser?.id || roleUpdateLoading}
                                  size="small"
                                >
                                  <MenuItem value="admin">Administrator</MenuItem>
                                  <MenuItem value="operations_manager">Operations Manager</MenuItem>
                                  <MenuItem value="staff">Staff</MenuItem>
                                </Select>
                              </FormControl>
                              {user._id === currentUser?.id && (
                                <Chip 
                                  label="Current User" 
                                  color="info" 
                                  size="small" 
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {user.isActive ? (
                              <Chip label="Active" color="success" size="small" />
                            ) : user.isInvited && user.inviteExpired ? (
                              <Chip label="Expired" color="error" size="small" />
                            ) : user.isInvited ? (
                              <Chip label="Pending Invite" color="warning" size="small" />
                            ) : (
                              <Chip label="Inactive" color="default" size="small" />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Box display="flex" gap={1} justifyContent="center">
                              {canModifyUsers && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<EditIcon />}
                                  onClick={() => navigate(`/account-edit/${user._id}`)}
                                  sx={{ minWidth: 0, px: 1 }}
                                >
                                  Edit
                                </Button>
                              )}
                              {canModifyUsers && user.isInvited === true && user.isActive === false && user._id && (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handleResendInvite(user._id)}
                                  sx={{ ml: 1 }}
                                >
                                  Resend
                                </Button>
                              )}
                              {isAdmin && user.isActive && (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handleSendResetLink(user._id)}
                                  sx={{ ml: 1 }}
                                  title="Send Password Reset Link"
                                >
                                  Reset
                                </Button>
                              )}
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
        ) : (
          // Personal Profile View for regular users only
          <>
            <Typography variant="h4" gutterBottom>
              My Account
            </Typography>
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
                      Edit Account
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
          </>
        )}

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && (
          <Snackbar open autoHideDuration={3000} onClose={() => setSuccess('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
            <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>{success}</Alert>
          </Snackbar>
        )}

        {/* Create User Dialog */}
        <Dialog open={createUserDialog} onClose={() => setCreateUserDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New User</DialogTitle>
          <DialogContent>
            <CreateUserForm onSubmit={handleCreateUser} onCancel={() => setCreateUserDialog(false)} />
          </DialogContent>
        </Dialog>

        {/* Invite User Dialog */}
        <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogContent>
            <InviteUserForm onSubmit={handleInviteUser} onCancel={() => setInviteDialog(false)} />
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

        {/* Role Change Confirmation Dialog */}
        <Dialog open={roleConfirmDialog} onClose={handleRoleCancel}>
          <DialogTitle>Confirm Role Change</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to change the role of <strong>{roleChangeData.userName}</strong> from{' '}
              <strong>{getRoleLabel(roleChangeData.oldRole)}</strong> to{' '}
              <strong>{getRoleLabel(roleChangeData.newRole)}</strong>?
            </Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>
              This will change the user's permissions and access levels. Please ensure this change is appropriate.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleRoleCancel} disabled={roleUpdateLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleRoleConfirm} 
              variant="contained" 
              disabled={roleUpdateLoading}
              startIcon={roleUpdateLoading ? <CircularProgress size={20} /> : null}
            >
              {roleUpdateLoading ? 'Updating...' : 'Confirm Change'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
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
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
        margin="normal"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={handleTogglePasswordVisibility}
                edge="end"
                tabIndex={-1}
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
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

// Invite User Form Component
const InviteUserForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'staff'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      setFormData({ email: '', name: '', role: 'staff' });
    } catch (error) {
      // Error is handled by the parent component
    } finally {
      setLoading(false);
    }
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
        placeholder="Enter email address"
      />
      <TextField
        fullWidth
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        margin="normal"
        placeholder="Enter full name (optional)"
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
          <MenuItem value="admin">Administrator</MenuItem>
        </Select>
      </FormControl>
      <Box display="flex" gap={2} mt={3}>
        <Button 
          type="submit" 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Sending Invite...' : 'Send Invite'}
        </Button>
        <Button onClick={onCancel} variant="outlined" disabled={loading}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
};

// Account Filters Component
const AccountFilters = ({ filterStatus, setFilterStatus, filterRole, setFilterRole, onCreateRole, searchQuery, setSearchQuery, canModifyUsers }) => {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      {/* Tabs for filtering */}
      <Tabs value={filterStatus} onChange={(e, val) => setFilterStatus(val)}>
        <Tab label="All" value="all" />
        <Tab label="Pending" value="pending" />
        <Tab label="Expired" value="expired" />
      </Tabs>

      {/* Role filter dropdown */}
      <FormControl size="small" variant="standard">
        <InputLabel>Role</InputLabel>
        <Select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
          <MenuItem value="operations_manager">Operations Manager</MenuItem>
          <MenuItem value="staff">Staff</MenuItem>
        </Select>
      </FormControl>

      {/* Search bar */}
      <TextField
        size="small"
        label="Search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* "+ Create New Role" button - only show for users who can modify */}
      {canModifyUsers && (
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onCreateRole}
        >
          Create New Role
        </Button>
      )}
    </Box>
  );
};

export default ProfilePage; 