import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, Card, MenuItem, Snackbar, Select, FormControl, Divider, Paper, Tooltip, Avatar
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import EmailIcon from '@mui/icons-material/Email';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api, { resendUserInvite, sendPasswordResetLink, updateUserRole } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import MainLayout from '../../components/layout/MainLayout';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

const AccountEditPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { isAdmin, isOperationsManager, isStaff } = usePermissions();
  
  // Determine where to navigate back to based on the route
  const getReturnPath = () => {
    if (location.pathname.includes('/profile/edit')) {
      return `/profile/${userId}`;
    }
    return '/account';
  };

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
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  // Track form state for dirty checking
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    profileColor: '',
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
        profileColor: user.profileColor || '',
      });
    }
  }, [user]);

  // Track dirty state
  const isDirty =
    formState.firstName !== (user?.firstName || '') ||
    formState.lastName !== (user?.lastName || '') ||
    formState.email !== (user?.email || '') ||
    formState.role !== (user?.role || '') ||
    formState.profileColor !== (user?.profileColor || '');

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
    if (formState.profileColor !== (user?.profileColor || '')) updates.profileColor = formState.profileColor || null;
    if (nameChanged) updates.username = `${formState.firstName} ${formState.lastName}`.trim();
    if (Object.keys(updates).length === 0) return;
    setSaving(true);
    setError('');
    try {
      if (updates.role) {
        await updateUserRole(userId, updates.role);
      }
      if (updates.firstName || updates.lastName || updates.email || updates.username || updates.profileColor !== undefined) {
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
    try {
      await sendPasswordResetLink(userId);
      toast.success('Password reset link sent successfully!');
      setSendResetLinkSuccess(true);
      setTimeout(() => setSendResetLinkSuccess(false), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send reset link.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSendResetLinkLoading(false);
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
  const canEditEmail =
    isAdmin ||
    (isOperationsManager && user?.role !== 'admin');
  const canEditRole = isAdmin && userId !== currentUser?.id;
  const canResendInvite = user.isInvited && (isAdmin || isOperationsManager);
  const canResetPassword = isAdmin;
  const statusLabel = user.isActive ? 'Active' : 'Pending';

  return (
    <MainLayout userName={user?.username || user?.email || 'User'}>
      {/* Header with Return Button */}
      <Box display="flex" alignItems="center" mb={4}>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(getReturnPath())}
          sx={{ 
            backgroundColor: '#1bcddc', 
            color: '#fff', 
            fontWeight: 700, 
            px: 3, 
            borderRadius: 2, 
            boxShadow: 'none', 
            mr: 3,
            '&:hover': { backgroundColor: '#17b3c0' } 
          }}
        >
          {location.pathname.includes('/profile/edit') ? 'RETURN TO PROFILE' : 'RETURN TO ACCOUNT PAGE'}
        </Button>
      </Box>

      {/* Page Title */}
      <Typography variant="h5" fontWeight={700} letterSpacing={2} mb={4} color="#31365E">
        Edit User Account
      </Typography>

      {/* Main Content Card */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 8px #eee', p: 4 }}>
        <Box component="form" autoComplete="off" onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={4} mb={4}>
            {/* First Name */}
            <Box>
              <Typography fontWeight={600} mb={1} color="#222">First Name</Typography>
              <TextField
                value={formState.firstName}
                onChange={e => handleFieldChange('firstName', e.target.value)}
                size="medium"
                fullWidth
                disabled={!canEditNames}
                InputProps={{
                  style: !canEditNames ? { background: '#f5f5f7', color: '#888' } : { background: '#fff' }
                }}
                sx={{ borderRadius: 2, mb: 2 }}
              />
            </Box>
            {/* Last Name */}
            <Box>
              <Typography fontWeight={600} mb={1} color="#222">Last Name</Typography>
              <TextField
                value={formState.lastName}
                onChange={e => handleFieldChange('lastName', e.target.value)}
                size="medium"
                fullWidth
                disabled={!canEditNames}
                InputProps={{
                  style: !canEditNames ? { background: '#f5f5f7', color: '#888' } : { background: '#fff' }
                }}
                sx={{ borderRadius: 2, mb: 2 }}
              />
            </Box>
            {/* Email */}
            <Box>
              <Typography fontWeight={600} mb={1} color="#222">Email</Typography>
              <TextField
                value={formState.email}
                onChange={e => handleFieldChange('email', e.target.value)}
                size="medium"
                fullWidth
                disabled={!canEditEmail}
                helperText={!canEditEmail ? "Email can only be updated by an Ops Manager or Admin" : ""}
                InputProps={{
                  style: !canEditEmail ? { background: '#f5f5f7', color: '#888' } : { background: '#fff' }
                }}
                sx={{ borderRadius: 2, mb: 2 }}
              />
            </Box>
            {/* Role + Resend Invite */}
            <Box>
              <Typography fontWeight={600} mb={1} color="#222">Role</Typography>
              <Box display="flex" alignItems="center">
                <FormControl size="medium" fullWidth>
                  <Select
                    value={formState.role}
                    onChange={e => handleFieldChange('role', e.target.value)}
                    disabled={!canEditRole}
                    sx={{ background: !canEditRole ? '#f5f5f7' : '#fff', color: !canEditRole ? '#888' : '#222', borderRadius: 2 }}
                  >
                    <MenuItem value="admin">Administrator</MenuItem>
                    <MenuItem value="operations_manager">Operations Manager</MenuItem>
                    <MenuItem value="staff">Staff</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Typography variant="caption" color="text.secondary" mt={1}>
                {statusLabel}
              </Typography>
              {canResendInvite && (
                <Box mt={1}>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<EmailIcon />}
                    onClick={handleResendInvite}
                    sx={{ fontWeight: 600, color: 'primary.main', textTransform: 'none' }}
                    disabled={resendInviteLoading}
                  >
                    {resendInviteLoading ? 'Sending...' : 'Resend Invite'}
                  </Button>
                </Box>
              )}
            </Box>
            {/* Profile Color Picker - Only for own profile */}
            {isOwnProfile && (
              <Box>
                <Typography fontWeight={600} mb={1} color="#222">Profile Color</Typography>
                <Box display="flex" alignItems="center" gap={2} mb={1}>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: formState.profileColor || undefined,
                      border: '2px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      fontSize: '1.5rem',
                      fontWeight: 600
                    }}
                    onClick={() => setShowColorPicker(!showColorPicker)}
                  >
                    {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                  <Button
                    variant="outlined"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    sx={{ borderRadius: 2 }}
                  >
                    {showColorPicker ? 'Hide Colors' : 'Choose Color'}
                  </Button>
                  {formState.profileColor && (
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => handleFieldChange('profileColor', '')}
                      sx={{ color: 'text.secondary' }}
                    >
                      Reset
                    </Button>
                  )}
                </Box>
                {showColorPicker && (
                  <Paper
                    elevation={3}
                    sx={{
                      mt: 2,
                      p: 2,
                      borderRadius: 2,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1.5,
                      maxWidth: 500,
                      backgroundColor: '#fafafa'
                    }}
                  >
                    {[
                      '#1bcddc', '#31365E', '#CB1033', '#FAA951',
                      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
                      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
                      '#BB8FCE', '#85C1E2', '#F8B739', '#E74C3C',
                      '#3498DB', '#2ECC71', '#9B59B6', '#E67E22',
                      '#1ABC9C', '#34495E', '#F39C12', '#E91E63'
                    ].map((color) => (
                      <Tooltip key={color} title={color}>
                        <Box
                          onClick={() => {
                            handleFieldChange('profileColor', color);
                            setShowColorPicker(false);
                          }}
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: color,
                            cursor: 'pointer',
                            border: formState.profileColor === color ? '3px solid #31365E' : '2px solid #ddd',
                            transition: 'all 0.2s',
                            '&:hover': {
                              transform: 'scale(1.2)',
                              boxShadow: `0 0 0 4px ${color}40`,
                              zIndex: 1
                            }
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Paper>
                )}
                <Typography variant="caption" color="text.secondary" mt={1} display="block">
                  Choose a color for your profile avatar. Leave empty to use auto-generated color.
                </Typography>
              </Box>
            )}
          </Box>
          {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
          <Box mt={5} display="flex" justifyContent="flex-end">
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              disabled={!isDirty || saving}
              sx={{ minWidth: 180, fontWeight: 600, fontSize: 18, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
          {canResetPassword && (
            <Box mt={8}>
              <Divider sx={{ mb: 4 }} />
              <Typography fontWeight={600} mb={3} letterSpacing={1} color="#222">
                SEND PASSWORD RESET LINK
              </Typography>
              <Button
                variant="contained"
                color="error"
                onClick={handleSendResetLink}
                disabled={sendResetLinkLoading}
                sx={{ fontWeight: 700, minWidth: 260, borderRadius: 3 }}
              >
                {sendResetLinkLoading ? 'Sending...' : 'Send Reset Password Link'}
              </Button>
            </Box>
          )}
        </Box>
      </Card>
      <Snackbar
        open={success || resendInviteSuccess || sendResetLinkSuccess}
        autoHideDuration={2000}
        onClose={() => { setSuccess(false); setResendInviteSuccess(false); setSendResetLinkSuccess(false); }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {sendResetLinkSuccess ? 'Reset link sent successfully!' : 
           resendInviteSuccess ? 'Invite sent successfully!' : 
           'Account updated successfully!'}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
};

export default AccountEditPage;
