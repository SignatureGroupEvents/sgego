import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  InputAdornment,
  TablePagination,
  useTheme
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility,
  VisibilityOff,
  Search as SearchIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import InviteUserForm from '../../components/account/InviteUserForm';
import AccountFilters from '../../components/account/AccountFilters';


import {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  createUser,
  updateUserRole,
  assignUserToEvents,
  getAvailableEvents,
  deleteUser,
  inviteUser,
  sendPasswordResetLink
} from '../../services/api';
import api from '../../services/api';

const ROLE_LABELS = {
  admin: 'Admin',
  staff: 'Staff',
  operations_manager: 'Ops Manager'
};

const ROLE_COLORS = {
  admin: '#CB1033',
  staff: '#FAA951',
  operations_manager: '#31365E'
};

const AccountPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { isAdmin, isOperationsManager, isStaff } = usePermissions();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const isOwnProfile = !userId || userId === currentUser?.id;
  const canManageUsers = isOperationsManager || isAdmin;
  const canViewAllUsers = isAdmin || isOperationsManager || isStaff;

  useEffect(() => {
    loadProfile();
    if (canViewAllUsers) {
      loadAllUsers();
      loadAvailableEvents();
    }
  }, [userId, canViewAllUsers]);

  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => setSearchQuery(searchValue), 300));
  }, [searchValue]);

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

  const handleInviteUser = async (inviteData) => {
    try {
      const response = await inviteUser(inviteData);
      if (response && response.status >= 200 && response.status < 300) {
        toast.success('User invited successfully!');
        setShowInviteModal(false);
        loadAllUsers();
        return response;
      } else {
        const errorMessage = response?.data?.message || 'Failed to invite user.';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to invite user.';
      toast.error(errorMessage);
      console.error('Invite error:', err);
      throw err;
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const response = await deleteUser(userId);
      if (response && response.status >= 200 && response.status < 300) {
        toast.success('User deleted successfully!');
        loadAllUsers(); // Refresh the users list
      } else {
        const errorMessage = response?.data?.message || 'Failed to delete user.';
        toast.error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete user.';
      toast.error(errorMessage);
      console.error('Delete user error:', err);
    }
  };

  const filteredUsers = allUsers.filter((user) => {
    if (filterStatus === 'pending') {
      if (!(user.isInvited === true && user.isActive === false)) return false;
    } else if (filterStatus === 'expired') {
      if (!(user.isInvited === true && user.isActive === false && user.inviteExpired)) return false;
    }
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    if (searchQuery && !(`${user.username || user.name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) || `${user.email}`.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    return true;
  });

  const pagedUsers = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, page, rowsPerPage]);

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress size={60} />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout userName={user?.username}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
          Account Settings
        </Typography>
        <Box>
          <Button
            variant="contained"
            sx={{ backgroundColor: '#1bcddc', color: '#fff', fontWeight: 700, px: 3, borderRadius: 2, boxShadow: 'none', '&:hover': { backgroundColor: '#17b3c0' } }}
            onClick={() => setShowInviteModal(true)}
          >
            INVITE USERS
          </Button>
        </Box>
      </Box>

        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 8px #eee', p: 3 }}>
  <AccountFilters
    filterStatus={filterStatus}
    setFilterStatus={setFilterStatus}
    filterRole={filterRole}
    setFilterRole={setFilterRole}
    searchQuery={searchQuery}
    setSearchQuery={setSearchQuery}
    searchValue={searchValue}
    setSearchValue={setSearchValue}
    canModifyUsers={isAdmin || isOperationsManager}
  />


          <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 8px #eee' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedUsers.map(user => (
                  <TableRow key={user._id}>
                    <TableCell>{user.username || '-'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={ROLE_LABELS[user.role] || user.role}
                        size="small"
                        sx={{ 
                          fontWeight: 700, 
                          color: '#fff', 
                          fontSize: 13, 
                          px: 2, 
                          borderRadius: 2,
                          bgcolor: ROLE_COLORS[user.role] || '#757575'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {user.isActive ? 'Active' : 'Pending'}
                    </TableCell>
                    <TableCell>
                      {(isAdmin || isOperationsManager) && (
                        <Box display="flex" gap={1}>
                          <Button
                            variant="contained"
                            size="small"
                            sx={{ backgroundColor: '#1bcddc', color: '#fff', fontWeight: 700, borderRadius: 2, boxShadow: 'none', '&:hover': { backgroundColor: '#17b3c0' } }}
                            onClick={() => navigate(`/account/edit/${user._id}`)}
                          >
                            Edit
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="contained"
                              size="small"
                              sx={{ 
                                backgroundColor: '#CB1033', 
                                color: '#fff', 
                                fontWeight: 700, 
                                borderRadius: 2, 
                                boxShadow: 'none', 
                                '&:hover': { backgroundColor: '#a00000' } 
                              }}
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete ${user.username || user.email}? This action cannot be undone.`)) {
                                  handleDeleteUser(user._id);
                                }
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {pagedUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: '#aaa' }}>
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredUsers.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 25]}
              labelRowsPerPage="Rows per page:"
              sx={{ px: 2, pb: 1, borderTop: '1px solid #eee' }}
            />
          </TableContainer>
        </Card>

        <Dialog
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Invite a New User</DialogTitle>
          <DialogContent>
            <InviteUserForm
              onSubmit={handleInviteUser}
              onCancel={() => setShowInviteModal(false)}
            />
          </DialogContent>
        </Dialog>
      </MainLayout>
    );
};

export default AccountPage;
