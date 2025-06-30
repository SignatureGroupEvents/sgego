import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, Card, CardContent, MenuItem, Snackbar, Table, TableBody, TableCell, TableRow, IconButton, Select, FormControl, Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import LockIcon from '@mui/icons-material/Lock';
import EmailIcon from '@mui/icons-material/Email';
import api, { resetUserPassword, resendUserInvite, sendPasswordResetLink, updateUserRole } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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

  // Determine if current user can modify this profile
  const canModifyProfile = isAdmin || isOperationsManager || (currentUser?.id === userId);
  const isOwnProfile = currentUser?.id === userId;

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

  const handleSave = async () => {
    if (!editValue && editingField !== 'email') {
      setError('This field is required');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      if (editingField === 'role') {
        await updateUserRole(userId!, editValue);
        setUser((prev: any) => ({ ...prev, role: editValue }));
        setSuccess(true);
        setEditingField(null);
        setEditValue('');
      } else {
        const payload: any = { [editingField!]: editValue };
        await api.put(`/users/profile/${userId}`, payload);
        setUser((prev: any) => ({ ...prev, [editingField!]: editValue }));
        setSuccess(true);
        setEditingField(null);
        setEditValue('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user.');
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
      setSuccess(true);
      setPasswordEdit(false);
      setPasswordValue('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to update password.');
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
      setSuccess(true);
      setAdminPasswordValue('');
    } catch (err: any) {
      setAdminPasswordError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvite = async () => {
    setResendInviteLoading(true);
    try {
      await resendUserInvite(userId!);
      setResendInviteSuccess(true);
      setTimeout(() => setResendInviteSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend invite.');
    } finally {
      setResendInviteLoading(false);
    }
  };

  const handleSendResetLink = async () => {
    setSendResetLinkLoading(true);
    try {
      await sendPasswordResetLink(userId!);
      setSendResetLinkSuccess(true);
      setTimeout(() => setSendResetLinkSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset link.');
    } finally {
      setSendResetLinkLoading(false);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh"><CircularProgress /></Box>;
  }

  if (error) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
      <Alert severity="error">{error}</Alert>
    </Box>;
  }

  if (!user) return null;

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#f9fafb">
      <Card sx={{ minWidth: 350, maxWidth: 500 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>Account Details</Typography>
          
          {!canModifyProfile && !isOwnProfile && (
            <Alert severity="info" sx={{ mb: 2 }}>
              You are viewing this profile in read-only mode. You can only edit your own profile.
            </Alert>
          )}
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Table>
            <TableBody>
              {fields.map(f => (
                <TableRow key={f.key} hover>
                  <TableCell sx={{ fontWeight: 600, width: 140 }}>{f.label}</TableCell>
                  <TableCell>
                    {editingField === f.key ? (
                      f.key === 'role' ? (
                        <FormControl size="small" fullWidth>
                          <Select
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                          >
                            <MenuItem value="admin">Administrator</MenuItem>
                            <MenuItem value="operations_manager">Operations Manager</MenuItem>
                            <MenuItem value="staff">Staff</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <TextField
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          size="small"
                          fullWidth
                          autoFocus
                        />
                      )
                    ) : (
                      user[f.key] || (f.key === 'email' ? <span style={{ color: '#aaa' }}>—</span> : '')
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ width: 90 }}>
                    {editingField === f.key ? (
                      <>
                        <IconButton color="primary" onClick={handleSave} disabled={saving}>
                          <SaveIcon />
                        </IconButton>
                        <IconButton onClick={handleCancel} disabled={saving}>
                          <CancelIcon />
                        </IconButton>
                      </>
                    ) : (
                      <IconButton 
                        onClick={() => handleEdit(f.key)}
                        disabled={f.key === 'role' && isAdmin && userId === currentUser?.id || !canModifyProfile}
                        title={f.key === 'role' && isAdmin && userId === currentUser?.id ? 'You cannot change your own role' : 
                               !canModifyProfile ? 'You can only edit your own profile' : ''}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(isAdmin || isOperationsManager || isOwnProfile) && (
                <TableRow hover>
                  <TableCell sx={{ fontWeight: 600 }}>Password</TableCell>
                  <TableCell>
                    {passwordEdit ? (
                      <TextField
                        value={passwordValue}
                        onChange={e => setPasswordValue(e.target.value)}
                        size="small"
                        type="password"
                        fullWidth
                        autoFocus
                        error={!!passwordError}
                        helperText={passwordError || 'Set a new password'}
                      />
                    ) : (
                      <span style={{ color: '#aaa' }}>••••••••</span>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {passwordEdit ? (
                      <>
                        <IconButton color="primary" onClick={handlePasswordSave} disabled={saving}>
                          <SaveIcon />
                        </IconButton>
                        <IconButton onClick={() => { setPasswordEdit(false); setPasswordValue(''); setPasswordError(''); }} disabled={saving}>
                          <CancelIcon />
                        </IconButton>
                      </>
                    ) : (
                      <IconButton onClick={() => { setPasswordEdit(true); setPasswordValue(''); setPasswordError(''); }}>
                        <EditIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Admin Actions Section */}
          {isAdmin && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
                Admin Actions
              </Typography>
              
              {/* Set New Password */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Set New Password
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <TextField
                    value={adminPasswordValue}
                    onChange={(e) => setAdminPasswordValue(e.target.value)}
                    placeholder="Enter new password"
                    type="password"
                    size="small"
                    sx={{ flexGrow: 1 }}
                    error={!!adminPasswordError}
                    helperText={adminPasswordError || 'Minimum 6 characters'}
                  />
                  <Button
                    variant="contained"
                    startIcon={<LockIcon />}
                    onClick={handleAdminPasswordReset}
                    disabled={saving || !adminPasswordValue || adminPasswordValue.length < 6}
                    sx={{ minWidth: 140 }}
                  >
                    {saving ? 'Setting...' : 'Set Password'}
                  </Button>
                </Box>
              </Box>
              
              {/* Resend Invite Link */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Resend Invite Link
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<EmailIcon />}
                  onClick={handleResendInvite}
                  disabled={resendInviteLoading}
                  sx={{ minWidth: 140 }}
                >
                  {resendInviteLoading ? 'Sending...' : 'Resend Invite'}
                </Button>
              </Box>

              {/* Send Password Reset Link */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Send Password Reset Link
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<LockIcon />}
                  onClick={handleSendResetLink}
                  disabled={sendResetLinkLoading}
                  sx={{ minWidth: 140 }}
                >
                  {sendResetLinkLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </Box>
            </>
          )}
          
          <Snackbar
            open={success || resendInviteSuccess || sendResetLinkSuccess}
            autoHideDuration={2000}
            onClose={() => { setSuccess(false); setResendInviteSuccess(false); setSendResetLinkSuccess(false); }}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert severity="success" sx={{ width: '100%' }}>
              {sendResetLinkSuccess ? 'Reset link sent successfully!' : 
               resendInviteSuccess ? 'Invite sent successfully!' : 
               'User updated successfully!'}
            </Alert>
          </Snackbar>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AccountEditPage; 