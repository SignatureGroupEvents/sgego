// src/pages/account/AccountPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  useTheme,
  useMediaQuery,
  Stack,
  Divider
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import InviteUserForm from '../../components/account/InviteUserForm';
import AccountFilters from '../../components/account/AccountFilters';
import AvatarIcon from '../../components/dashboard/AvatarIcon';

import { getUserProfile, getAllUsers, inviteUser } from '../../services/api';
import { getUserDisplayName } from '../../utils/userDisplay';

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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { user: currentUser } = useAuth();
  const {
    canInviteUsers,
    canManageUsers,
    canViewEvents,
    canEditOwnProfile,
    isAdmin,
    isOperationsManager,
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


  const filteredUsers = allUsers.filter(u => {
    if (filterStatus === 'pending' && !(u.isInvited && !u.isActive)) return false;
    if (filterStatus === 'expired' && !(u.isInvited && !u.isActive && u.inviteExpired)) return false;
    if (filterStatus === 'removal_requested' && !u.accountRemovalRequested) return false;
    if (filterRole !== 'all' && u.role !== filterRole) return false;

    const displayName = getUserDisplayName(u, '');
    const match =
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());

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
    <MainLayout userName={user ? getUserDisplayName(user, user?.email) : undefined}>
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        gap={{ xs: 2, sm: 0 }}
        mb={4}
      >
        <Typography 
          variant={isMobile ? 'h5' : 'h4'} 
          fontWeight={700} 
          color="primary.main"
        >
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
            fullWidth={isMobile}
          >
            INVITE USERS
          </Button>
        )}
      </Box>

      <Card sx={{ borderRadius: 3, p: { xs: 2, sm: 3 }, boxShadow: '0 2px 8px #eee' }}>
        <AccountFilters
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterRole={filterRole}
          setFilterRole={setFilterRole}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          canModifyUsers={canManageUsers}
        />

        {isMobile ? (
          // Mobile Card View
          <Box>
            {pagedUsers.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: '#aaa' }}>
                <Typography>No users found.</Typography>
              </Box>
            ) : (
              <Stack spacing={2} sx={{ mt: 2 }}>
                {pagedUsers.map(u => (
                  <Card key={u._id} elevation={2} sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                          <AvatarIcon 
                            user={u}
                            userId={u._id}
                            showTooltip={true}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body1" fontWeight={600} noWrap>
                              {getUserDisplayName(u, '-')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {u.email}
                            </Typography>
                          </Box>
                        </Box>
                        {/* Edit button visibility:
                            - Admin/Ops: can edit users (Ops cannot edit Admin)
                            - Users can edit their own profile if they have canEditOwnProfile capability */}
                        {(canManageUsers && !(isOperationsManager && u.role === 'admin')) || 
                         (u._id === currentUser?.id && canEditOwnProfile) ? (
                          <Button
                            variant="contained"
                            size="small"
                            sx={{
                              backgroundColor: '#1bcddc',
                              color: '#fff',
                              fontWeight: 700,
                              borderRadius: 2,
                              '&:hover': { backgroundColor: '#17b3c0' },
                              ml: 1
                            }}
                            onClick={() => navigate(`/account/edit/${u._id}`)}
                          >
                            Edit
                          </Button>
                        ) : null}
                      </Box>
                      <Divider sx={{ my: 1.5 }} />
                      <Stack spacing={1.5}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Role
                          </Typography>
                          <Chip
                            label={ROLE_LABELS[u.role]}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              color: '#fff',
                              bgcolor: ROLE_COLORS[u.role],
                              px: 2,
                              borderRadius: 2,
                              mt: 0.5
                            }}
                          />
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Status
                          </Typography>
                          {u.accountRemovalRequested ? (
                            <Chip
                              label="Request for Removal"
                              size="small"
                              sx={{
                                fontWeight: 600,
                                color: '#fff',
                                bgcolor: '#CB1033',
                                borderRadius: 2,
                                mt: 0.5
                              }}
                            />
                          ) : (
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {u.isActive ? 'Active' : 'Pending'}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
            <Box sx={{ mt: 2 }}>
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
                sx={{
                  '& .MuiTablePagination-toolbar': {
                    flexWrap: 'wrap',
                    px: { xs: 1, sm: 2 }
                  }
                }}
              />
            </Box>
          </Box>
        ) : (
          // Desktop Table View
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
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <AvatarIcon 
                          user={u}
                          userId={u._id}
                          showTooltip={true}
                        />
                        <Typography variant="body2" fontWeight={500}>
                          {getUserDisplayName(u, '-')}
                        </Typography>
                      </Box>
                    </TableCell>
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

                    <TableCell>
                      {u.accountRemovalRequested ? (
                        <Chip
                          label="Request for Removal"
                          size="small"
                          sx={{
                            fontWeight: 600,
                            color: '#fff',
                            bgcolor: '#CB1033',
                            borderRadius: 2
                          }}
                        />
                      ) : u.isActive ? (
                        'Active'
                      ) : (
                        'Pending'
                      )}
                    </TableCell>

                    <TableCell>
                      {/* Edit button visibility:
                          - Admin/Ops: can edit users (Ops cannot edit Admin)
                          - Users can edit their own profile if they have canEditOwnProfile capability */}
                      {(canManageUsers && !(isOperationsManager && u.role === 'admin')) || 
                       (u._id === currentUser?.id && canEditOwnProfile) ? (
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
                      ) : null}
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
        )}
      </Card>

      <Dialog 
        open={showInviteModal} 
        onClose={() => setShowInviteModal(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Invite a New User</DialogTitle>
        <DialogContent>
          <InviteUserForm onSubmit={handleInviteUser} onCancel={() => setShowInviteModal(false)} />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default AccountPage;

