// src/pages/account/AccountPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
  CircularProgress,
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
  TablePagination,
  useTheme
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import InviteUserForm from '../../components/account/InviteUserForm';
import AccountFilters from '../../components/account/AccountFilters';

import { getUserProfile, getAllUsers, deleteUser, inviteUser } from '../../services/api';

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
  const theme = useTheme();

  const { user: currentUser } = useAuth();
  const {
    canInviteUsers,
    canManageUsers,
    canViewEvents,
    isAdmin,
    isStaff
  } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // allow viewing all users if they can view events
  const canViewAllUsers = canViewEvents;

  useEffect(() => {
    loadProfile();
    if (canViewAllUsers) loadAllUsers();
  }, [userId, canViewAllUsers]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchValue), 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await getUserProfile(userId);
      setUser(response.data.user);
    } catch (err) {
      toast.error('Failed to load profile.');
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

  const handleInviteUser = async inviteData => {
    try {
      const response = await inviteUser(inviteData);
      toast.success('User invited successfully!');
      setShowInviteModal(false);
      loadAllUsers();
      return response;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invite user.');
      throw err;
    }
  };

  const handleDeleteUser = async id => {
    try {
      const response = await deleteUser(id);
      if (response?.status >= 200 && response?.status < 300) {
        toast.success('User deleted successfully!');
        loadAllUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const filteredUsers = allUsers.filter(u => {
    if (filterStatus === 'pending' && !(u.isInvited && !u.isActive)) return false;
    if (filterStatus === 'expired' && !(u.isInvited && !u.isActive && u.inviteExpired)) return false;
    if (filterRole !== 'all' && u.role !== filterRole) return false;

    const match =
      (u.username || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    return match;
  });

  const pagedUsers = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, page, rowsPerPage]);

  if (loading) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout userName={user?.username}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={700} color="primary.main">
          User Management Settings
        </Typography>

        {canInviteUsers && (
          <Button
            variant="contained"
            sx={{
              backgroundColor: '#1bcddc',
              color: '#fff',
              fontWeight: 700,
              px: 3,
              borderRadius: 2,
              '&:hover': { backgroundColor: '#17b3c0' }
            }}
            onClick={() => setShowInviteModal(true)}
          >
            INVITE USERS
          </Button>
        )}
      </Box>

      <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 2px 8px #eee' }}>
        <AccountFilters
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterRole={filterRole}
          setFilterRole={setFilterRole}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          canModifyUsers={canManageUsers}
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
              {pagedUsers.map(u => (
                <TableRow key={u._id}>
                  <TableCell>{u.username || '-'}</TableCell>
                  <TableCell>{u.email}</TableCell>

                  <TableCell>
                    <Chip
                      label={ROLE_LABELS[u.role]}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        color: '#fff',
                        bgcolor: ROLE_COLORS[u.role],
                        px: 2,
                        borderRadius: 2
                      }}
                    />
                  </TableCell>

                  <TableCell>{u.isActive ? 'Active' : 'Pending'}</TableCell>

                  <TableCell>
                    {(canManageUsers || (u.role === 'staff' && isStaff)) && (
                      <Button
                        variant="contained"
                        size="small"
                        sx={{
                          backgroundColor: '#1bcddc',
                          color: '#fff',
                          fontWeight: 700,
                          borderRadius: 2,
                          '&:hover': { backgroundColor: '#17b3c0' }
                        }}
                        onClick={() => navigate(`/account/edit/${u._id}`)}
                      >
                        Edit
                      </Button>
                    )}

                    {isAdmin && (
                      <Button
                        variant="contained"
                        size="small"
                        sx={{
                          backgroundColor: '#CB1033',
                          color: '#fff',
                          fontWeight: 700,
                          borderRadius: 2,
                          ml: 1,
                          '&:hover': { backgroundColor: '#a00000' }
                        }}
                        onClick={() => {
                          if (window.confirm(`Delete ${u.username || u.email}? This cannot be undone.`)) {
                            handleDeleteUser(u._id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {!pagedUsers.length && (
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
            rowsPerPage={rowsPerPage}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={e => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </TableContainer>
      </Card>

      <Dialog open={showInviteModal} onClose={() => setShowInviteModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite a New User</DialogTitle>
        <DialogContent>
          <InviteUserForm onSubmit={handleInviteUser} onCancel={() => setShowInviteModal(false)} />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default AccountPage;

