import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, Card, MenuItem, Snackbar, Select, FormControl, Divider, Table, TableBody, TableCell, TableRow, Paper
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import EmailIcon from '@mui/icons-material/Email';
import LockResetIcon from '@mui/icons-material/LockReset';
import api, { resendUserInvite, sendPasswordResetLink, updateUserRole, requestAccountRemoval, cancelAccountRemovalRequest, deleteUser } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import MainLayout from '../../components/layout/MainLayout';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

const AccountEditPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { isAdmin, isOperationsManager, isStaff, canDeleteUsers } = usePermissions();

  // Staff can edit ONLY their own profile
  const canEditThisUser =
    isAdmin ||
    isOperationsManager ||
    (isStaff && currentUser?.id === userId);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendInviteLoading, setResendInviteLoading] = useState(false);
  const [resendInviteSuccess, setResendInviteSuccess] = useState(false);
  const [sendResetLinkLoading, setSendResetLinkLoading] = useState(false);
  const [sendResetLinkSuccess, setSendResetLinkSuccess] = useState(false);
  const [removalRequestLoading, setRemovalRequestLoading] = useState(false);
  const [removalRequestSuccess, setRemovalRequestSuccess] = useState(false);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  // Track form state for dirty checking
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
  });

  useEffect(() => {
    if (user) {
      // If firstName/lastName missing but username exists, split username
      let firstName = user.firstName || '';
      let lastName = user.lastName || '';
      if ((!firstName || !lastName) && user.username) {
        const parts = user.username.split(' ');
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }
      setFormState({
        firstName,
        lastName,
        email: user.email || '',
        role: user.role || '',
      });
    }
  }, [user]);

  // Track dirty state
  const isDirty =
    formState.firstName !== (user?.firstName || '') ||
    formState.lastName !== (user?.lastName || '') ||
    formState.email !== (user?.email || '') ||
    formState.role !== (user?.role || '');

  // Handlers for field changes
  const handleFieldChange = (key, value) => {
    setFormState(prev => ({ ...prev, [key]: value }));
    setError('');
  };

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/users/profile/${userId}`);
        setUser(res.data.user);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load user.');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  // Save only changed fields, always send username if name changed
  const handleSave = async () => {
    const updates = {};
    let nameChanged = false;
    if (formState.firstName !== (user?.firstName || '')) { updates.firstName = formState.firstName; nameChanged = true; }
    if (formState.lastName !== (user?.lastName || '')) { updates.lastName = formState.lastName; nameChanged = true; }
    if (formState.email !== (user?.email || '')) updates.email = formState.email;
    if (formState.role !== (user?.role || '')) updates.role = formState.role;
    if (nameChanged) updates.username = `${formState.firstName} ${formState.lastName}`.trim();
    if (Object.keys(updates).length === 0) return;
    setSaving(true);
    setError('');
    try {
      if (updates.role) {
        await updateUserRole(userId, updates.role);
      }
      if (updates.firstName || updates.lastName || updates.email || updates.username) {
        await api.put(`/users/profile/${userId}`, updates);
      }
      toast.success('Account updated successfully!');
      setSuccess(true);
      // Re-fetch user to sync state
      const res = await api.get(`/users/profile/${userId}`);
      setUser(res.data.user);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update user.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvite = async () => {
    setResendInviteLoading(true);
    try {
      await resendUserInvite(userId);
      toast.success('Invite sent successfully!');
      setResendInviteSuccess(true);
      setTimeout(() => setResendInviteSuccess(false), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to resend invite.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setResendInviteLoading(false);
    }
  };

  const handleSendResetLink = async () => {
    setSendResetLinkLoading(true);
    setError('');
    try {
      if (isOwnProfile) {
        // User requesting their own password reset
        await api.post('/auth/request-reset-link', { email: user.email });
        toast.success('Password reset link sent to your email!');
      } else {
        // Admin sending reset link for another user
        const response = await sendPasswordResetLink(userId);
        if (response?.data?.success) {
          toast.success('Password reset link sent successfully!');
        } else {
          throw new Error(response?.data?.message || 'Failed to send reset link');
        }
      }
      setSendResetLinkSuccess(true);
      setTimeout(() => setSendResetLinkSuccess(false), 3000);
    } catch (err) {
      console.error('Password reset link error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send reset link. Please check email configuration and try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSendResetLinkLoading(false);
    }
  };

  const handleRequestAccountRemoval = async () => {
    if (!window.confirm('Are you sure you want to request account removal? An administrator will review your request. This action cannot be undone once approved.')) {
      return;
    }

    setRemovalRequestLoading(true);
    try {
      await requestAccountRemoval();
      toast.success('Account removal request submitted. An administrator will review your request.');
      setRemovalRequestSuccess(true);
      // Re-fetch user to update the accountRemovalRequested status
      const res = await api.get(`/users/profile/${userId}`);
      setUser(res.data.user);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to submit removal request.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setRemovalRequestLoading(false);
    }
  };

  const handleCancelRemovalRequest = async () => {
    setRemovalRequestLoading(true);
    try {
      await cancelAccountRemovalRequest();
      toast.success('Account removal request cancelled.');
      setRemovalRequestSuccess(true);
      // Re-fetch user to update the accountRemovalRequested status
      const res = await api.get(`/users/profile/${userId}`);
      setUser(res.data.user);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to cancel removal request.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setRemovalRequestLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!window.confirm(`Are you sure you want to delete ${user?.username || user?.email || 'this user'}? This action cannot be undone.`)) {
      return;
    }

    setDeleteUserLoading(true);
    try {
      await deleteUser(userId);
      toast.success('User deleted successfully!');
      // Navigate back to account list after deletion
      navigate('/account');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete user.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setDeleteUserLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout userName={user?.username}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress size={60} />
        </Box>
      </MainLayout>
    );
  }

  if (error && !user) {
    return (
      <MainLayout>
        <Alert severity="error">{error}</Alert>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </MainLayout>
    );
  }

  // Role-based edit permissions
  const canEditNames = canEditThisUser;
  // Staff cannot edit email (even their own). Admin/Ops can edit emails (with restrictions)
  const canEditEmail =
    !isStaff && ( // Staff cannot edit email at all
      isOwnProfile || // Admin/Ops can edit their own email
      isAdmin ||
      (isOperationsManager && user?.role !== 'admin')
    );
  const canEditRole = isAdmin && userId !== currentUser?.id;
  // Show resend invite button for pending users (not active)
  // Ops can resend invite to Ops and Staff (not Admin), Admin can resend to anyone
  // User must be pending (not active) to show the button
  const canResendInvite = !user.isActive && (
    isAdmin || 
    (isOperationsManager && user?.role !== 'admin')
  );
  const canResetPassword = isAdmin || isOwnProfile; // Admin can reset for others, anyone can reset their own
  const statusLabel = user.isActive ? 'Active' : 'Pending';

  return (
    <MainLayout userName={user?.username || user?.email || 'User'}>
      {/* Page Title */}
      <Typography variant="h4" fontWeight={600} mb={1} color="#1a1a1a">
        Account Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>
        Manage account information and settings
      </Typography>

      {/* Main Content - Asana-style structured layout */}
      <Box>
        {/* Account Information Section */}
        <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, mb: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
            <Typography variant="h6" fontWeight={600} color="#1a1a1a">
              Account Information
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Update your name and email address
            </Typography>
          </Box>
          
          <Box component="form" autoComplete="off" onSubmit={e => { e.preventDefault(); handleSave(); }}>
            <Table>
              <TableBody>
                {/* First Name */}
                <TableRow>
                  <TableCell sx={{ width: '200px', fontWeight: 500, color: '#666', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top', pt: 3 }}>
                    First Name
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #f0f0f0', pt: 3, pb: 3 }}>
                    <TextField
                      value={formState.firstName}
                      onChange={e => handleFieldChange('firstName', e.target.value)}
                      size="small"
                      fullWidth
                      disabled={!canEditNames}
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: !canEditNames ? '#f9f9f9' : '#fff',
                          '& fieldset': {
                            borderColor: '#e0e0e0',
                          },
                          '&:hover fieldset': {
                            borderColor: !canEditNames ? '#e0e0e0' : '#999',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#1bcddc',
                            borderWidth: '1px',
                          },
                        },
                      }}
                    />
                  </TableCell>
                </TableRow>
                
                {/* Last Name */}
                <TableRow>
                  <TableCell sx={{ width: '200px', fontWeight: 500, color: '#666', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top', pt: 3 }}>
                    Last Name
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #f0f0f0', pt: 3, pb: 3 }}>
                    <TextField
                      value={formState.lastName}
                      onChange={e => handleFieldChange('lastName', e.target.value)}
                      size="small"
                      fullWidth
                      disabled={!canEditNames}
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: !canEditNames ? '#f9f9f9' : '#fff',
                          '& fieldset': {
                            borderColor: '#e0e0e0',
                          },
                          '&:hover fieldset': {
                            borderColor: !canEditNames ? '#e0e0e0' : '#999',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#1bcddc',
                            borderWidth: '1px',
                          },
                        },
                      }}
                    />
                  </TableCell>
                </TableRow>
                
                {/* Email */}
                <TableRow>
                  <TableCell sx={{ width: '200px', fontWeight: 500, color: '#666', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top', pt: 3 }}>
                    Email
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #f0f0f0', pt: 3, pb: 3 }}>
                    <TextField
                      value={formState.email}
                      onChange={e => handleFieldChange('email', e.target.value)}
                      size="small"
                      fullWidth
                      disabled={!canEditEmail}
                      variant="outlined"
                      helperText={!canEditEmail ? (isStaff ? "Staff cannot update email addresses. Please contact an Operations Manager or Admin." : "Email can only be updated by an Ops Manager or Admin") : ""}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: !canEditEmail ? '#f9f9f9' : '#fff',
                          '& fieldset': {
                            borderColor: '#e0e0e0',
                          },
                          '&:hover fieldset': {
                            borderColor: !canEditEmail ? '#e0e0e0' : '#999',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#1bcddc',
                            borderWidth: '1px',
                          },
                        },
                      }}
                    />
                  </TableCell>
                </TableRow>
                
                {/* Role */}
                <TableRow>
                  <TableCell sx={{ width: '200px', fontWeight: 500, color: '#666', borderBottom: 'none', verticalAlign: 'top', pt: 3 }}>
                    Role
                  </TableCell>
                  <TableCell sx={{ borderBottom: 'none', pt: 3, pb: 3 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <Select
                          value={formState.role}
                          onChange={e => handleFieldChange('role', e.target.value)}
                          disabled={!canEditRole}
                          sx={{
                            backgroundColor: !canEditRole ? '#f9f9f9' : '#fff',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#e0e0e0',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: !canEditRole ? '#e0e0e0' : '#999',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#1bcddc',
                            },
                          }}
                        >
                          <MenuItem value="admin">Administrator</MenuItem>
                          <MenuItem value="operations_manager">Operations Manager</MenuItem>
                          <MenuItem value="staff">Staff</MenuItem>
                        </Select>
                      </FormControl>
                      <Typography variant="caption" color="text.secondary">
                        {statusLabel}
                      </Typography>
                      {canResendInvite && (
                        <Button
                          variant="text"
                          size="small"
                          startIcon={<EmailIcon />}
                          onClick={handleResendInvite}
                          sx={{ 
                            fontWeight: 500, 
                            color: '#1bcddc', 
                            textTransform: 'none',
                            ml: 'auto',
                            '&:hover': {
                              backgroundColor: '#f0f9fa'
                            }
                          }}
                          disabled={resendInviteLoading}
                        >
                          {resendInviteLoading ? 'Sending...' : 'Resend Invite'}
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            {error && <Alert severity="error" sx={{ m: 3, mt: 2 }}>{error}</Alert>}
            
            {/* Save Button */}
            <Box sx={{ p: 3, borderTop: '1px solid #e0e0e0', backgroundColor: '#fafafa', display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                disabled={!isDirty || saving}
                sx={{ 
                  backgroundColor: '#1bcddc',
                  color: '#fff',
                  fontWeight: 500,
                  px: 3,
                  textTransform: 'none',
                  '&:hover': { 
                    backgroundColor: '#17b3c0' 
                  },
                  '&.Mui-disabled': {
                    backgroundColor: '#e0e0e0',
                    color: '#999'
                  }
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Security Section */}
        {(canResetPassword || canResendInvite || isOwnProfile || canDeleteUsers) && (
          <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
              <Typography variant="h6" fontWeight={600} color="#1a1a1a">
                Security
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Manage password and account access
              </Typography>
            </Box>
            
            <Table>
              <TableBody>
                {/* Reset Password */}
                {canResetPassword && (
                  <TableRow>
                    <TableCell sx={{ width: '200px', fontWeight: 500, color: '#666', borderBottom: user?.accountRemovalRequested && isOwnProfile ? '1px solid #f0f0f0' : 'none', pt: 3, pb: 3 }}>
                      {isOwnProfile ? 'Reset My Password' : 'Reset Password'}
                    </TableCell>
                    <TableCell sx={{ borderBottom: user?.accountRemovalRequested && isOwnProfile ? '1px solid #f0f0f0' : 'none', pt: 3, pb: 3 }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="body2" color="text.secondary" flex={1}>
                          {isOwnProfile 
                            ? "We'll send a password reset link to your email address."
                            : "Send a password reset link to this user's email address."}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<LockResetIcon />}
                          onClick={handleSendResetLink}
                          disabled={sendResetLinkLoading}
                          sx={{ 
                            fontWeight: 500,
                            textTransform: 'none',
                            borderColor: '#e0e0e0',
                            color: '#666',
                            '&:hover': {
                              borderColor: '#999',
                              backgroundColor: '#f5f5f5'
                            }
                          }}
                        >
                          {sendResetLinkLoading ? 'Sending...' : 'Send Reset Link'}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                
                {/* Request Account Removal - Only for own account */}
                {isOwnProfile && (
                  <TableRow>
                    <TableCell sx={{ width: '200px', fontWeight: 500, color: '#666', borderBottom: canDeleteUsers && !isOwnProfile ? '1px solid #f0f0f0' : 'none', pt: 3, pb: 3 }}>
                      Request Account Removal
                    </TableCell>
                    <TableCell sx={{ borderBottom: canDeleteUsers && !isOwnProfile ? '1px solid #f0f0f0' : 'none', pt: 3, pb: 3 }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="body2" color="text.secondary" flex={1}>
                          {user?.accountRemovalRequested 
                            ? 'Your account removal request is pending administrator approval. You can cancel this request if needed.'
                            : 'Request to have your account permanently removed. An administrator must approve this request.'}
                        </Typography>
                        {user?.accountRemovalRequested ? (
                          <Button
                            variant="outlined"
                            size="small"
                            color="warning"
                            onClick={handleCancelRemovalRequest}
                            disabled={removalRequestLoading}
                            sx={{ 
                              fontWeight: 500,
                              textTransform: 'none',
                              borderColor: '#faa951',
                              color: '#faa951',
                              '&:hover': {
                                borderColor: '#e89a40',
                                backgroundColor: '#fff8f0'
                              }
                            }}
                          >
                            {removalRequestLoading ? 'Cancelling...' : 'Cancel Request'}
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            onClick={handleRequestAccountRemoval}
                            disabled={removalRequestLoading}
                            sx={{ 
                              fontWeight: 500,
                              textTransform: 'none',
                              borderColor: '#CB1033',
                              color: '#CB1033',
                              '&:hover': {
                                borderColor: '#a00d2a',
                                backgroundColor: '#fff5f5'
                              }
                            }}
                          >
                            {removalRequestLoading ? 'Submitting...' : 'Request Removal'}
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                
                {/* Delete User - Admin only, not for own account */}
                {canDeleteUsers && !isOwnProfile && (
                  <TableRow>
                    <TableCell sx={{ width: '200px', fontWeight: 500, color: '#666', borderBottom: 'none', pt: 3, pb: 3 }}>
                      Delete Account
                    </TableCell>
                    <TableCell sx={{ borderBottom: 'none', pt: 3, pb: 3 }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="body2" color="text.secondary" flex={1}>
                          Permanently delete this user's account. This action cannot be undone. If the user has associated events or check-ins, they must first request account removal.
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          onClick={handleDeleteUser}
                          disabled={deleteUserLoading}
                          sx={{ 
                            fontWeight: 500,
                            textTransform: 'none',
                            borderColor: '#CB1033',
                            color: '#CB1033',
                            '&:hover': {
                              borderColor: '#a00d2a',
                              backgroundColor: '#fff5f5'
                            }
                          }}
                        >
                          {deleteUserLoading ? 'Deleting...' : 'Delete User'}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Box>
      
      <Snackbar
        open={success || resendInviteSuccess || sendResetLinkSuccess || removalRequestSuccess}
        autoHideDuration={3000}
        onClose={() => { 
          setSuccess(false); 
          setResendInviteSuccess(false); 
          setSendResetLinkSuccess(false);
          setRemovalRequestSuccess(false);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {removalRequestSuccess ? 'Request submitted successfully!' :
           sendResetLinkSuccess ? (isOwnProfile ? 'Password reset link sent to your email!' : 'Password reset link sent successfully!') : 
           resendInviteSuccess ? 'Invite sent successfully!' : 
           'Account updated successfully!'}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
};

export default AccountEditPage;
