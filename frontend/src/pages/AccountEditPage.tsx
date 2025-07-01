import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, Card, CardContent, MenuItem, Snackbar, Table, TableBody, TableCell, TableRow, IconButton, Select, FormControl, Divider, InputAdornment, Paper
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import LockIcon from '@mui/icons-material/Lock';
import EmailIcon from '@mui/icons-material/Email';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import api, { resetUserPassword, resendUserInvite, sendPasswordResetLink, updateUserRole } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import MainNavigation from '../components/MainNavigation';
import toast from 'react-hot-toast';

const fields = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
];

const AccountEditPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isAdmin, isOperationsManager, user: currentUser } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordEdit, setPasswordEdit] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [adminPasswordValue, setAdminPasswordValue] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');
  const [resendInviteLoading, setResendInviteLoading] = useState(false);
  const [resendInviteSuccess, setResendInviteSuccess] = useState(false);
  const [sendResetLinkLoading, setSendResetLinkLoading] = useState(false);
  const [sendResetLinkSuccess, setSendResetLinkSuccess] = useState(false);
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Determine if current user can modify this profile
  const canModifyProfile = isAdmin || isOperationsManager || (currentUser?.id === userId);
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
  const handleFieldChange = (key: string, value: string) => {
    setFormState(prev => ({ ...prev, [key]: value }));
    setError('');
  };

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/users/profile/${userId}`);
        setUser(res.data.user);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load user.');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  const handleEdit = (key: string) => {
    if (key === 'role' && isAdmin && userId === currentUser?.id) {
      setError('You cannot change your own role');
      return;
    }
    
    setEditingField(key);
    setEditValue(user[key] || '');
    setError('');
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
    setError('');
  };

  // Save only changed fields, always send username if name changed
  const handleSave = async () => {
    const updates: any = {};
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
        await updateUserRole(userId!, updates.role);
      }
      if (updates.firstName || updates.lastName || updates.email || updates.username) {
        await api.put(`/users/profile/${userId}`, updates);
      }
      toast.success('Account updated successfully!');
      setSuccess(true);
      // Re-fetch user to sync state
      const res = await api.get(`/users/profile/${userId}`);
      setUser(res.data.user);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update user.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!passwordValue || passwordValue.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    setPasswordError('');
    try {
      await api.put(`/users/profile/${userId}`, { newPassword: passwordValue });
      toast.success('Password updated successfully!');
      setSuccess(true);
      setPasswordEdit(false);
      setPasswordValue('');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update password.';
      setPasswordError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleAdminPasswordReset = async () => {
    if (!adminPasswordValue || adminPasswordValue.length < 6) {
      setAdminPasswordError('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    setAdminPasswordError('');
    try {
      await resetUserPassword(userId!, adminPasswordValue);
      toast.success('Password reset successfully!');
      setSuccess(true);
      setAdminPasswordValue('');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to reset password.';
      setAdminPasswordError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvite = async () => {
    setResendInviteLoading(true);
    try {
      await resendUserInvite(userId!);
      toast.success('Invite sent successfully!');
      setResendInviteSuccess(true);
      setTimeout(() => setResendInviteSuccess(false), 3000);
    } catch (err: any) {
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
      await sendPasswordResetLink(userId!);
      toast.success('Password reset link sent successfully!');
      setSendResetLinkSuccess(true);
      setTimeout(() => setSendResetLinkSuccess(false), 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to send reset link.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSendResetLinkLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleAdminPasswordVisibility = () => {
    setShowAdminPassword(!showAdminPassword);
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

  if (error) {
    return (
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <MainNavigation />
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Box>
    );
  }

  if (!user) return null;

  // Role-based edit permissions
  const canEditNames = isAdmin || isOperationsManager;
  const canEditEmail = isAdmin || isOperationsManager;
  const canEditRole = isAdmin && userId !== currentUser?.id;
  const canResendInvite = user.isInvited && (isAdmin || isOperationsManager);
  const canResetPassword = isAdmin;
  const canSave = canEditNames || canEditEmail || canEditRole;
  const statusLabel = user.isActive ? 'Active' : 'Pending';

  return (
    <Box display="flex" minHeight="100vh" bgcolor="#fef8f4">
      <MainNavigation />
      <Box flex={1} px={6} py={4}>
        {/* Header with Return Button */}
        <Box display="flex" alignItems="center" mb={4}>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/profile')}
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
            RETURN TO ACCOUNT PAGE
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
      </Box>
    </Box>
  );
};

export default AccountEditPage; 