import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, Card, CardContent, MenuItem, Snackbar, Table, TableBody, TableCell, TableRow, IconButton, Select, FormControl
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import api from '../services/api';
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
  const { isAdmin, isOperationsManager } = useAuth();
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
      const payload: any = { [editingField!]: editValue };
      await api.put(`/users/profile/${userId}`, payload);
      setUser((prev: any) => ({ ...prev, [editingField!]: editValue }));
      setSuccess(true);
      setEditingField(null);
      setEditValue('');
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
                      <IconButton onClick={() => handleEdit(f.key)}>
                        <EditIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(isAdmin || isOperationsManager) && (
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
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Snackbar
            open={success}
            autoHideDuration={2000}
            onClose={() => setSuccess(false)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert severity="success" sx={{ width: '100%' }}>
              User updated successfully!
            </Alert>
          </Snackbar>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AccountEditPage; 