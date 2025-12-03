// src/components/account/InviteUserForm.tsx
import React, { useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  DialogActions,
  CircularProgress
} from '@mui/material';

const InviteUserForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'staff'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { isAdmin, isOperationsManager, isStaff } = usePermissions();

  const availableRoles = [
    { value: 'staff', label: 'Staff' },
    { value: 'operations_manager', label: 'Operations Manager' },
    { value: 'admin', label: 'Administrator' }
  ].filter(role => {
    if (isStaff) return role.value === 'staff';
    if (isOperationsManager) return role.value !== 'admin';
    return true; // admin sees everything
  });


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      await onSubmit(formData);
      setFormData({ email: '', name: '', role: 'staff' });
    } catch (error) {
      const message = error.message?.toLowerCase() || '';
      setErrors({
        email: message.includes('already exists')
          ? 'User with this email already exists'
          : message.includes('invalid email')
          ? 'Please enter a valid email address'
          : '',
        general: message || 'Failed to send invite'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {errors.general && <Alert severity="error" sx={{ mb: 2 }}>{errors.general}</Alert>}

      <TextField
        fullWidth
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => {
          setFormData({ ...formData, email: e.target.value });
          if (errors.email) setErrors({ ...errors, email: '' });
        }}
        required
        margin="normal"
        error={!!errors.email}
        helperText={errors.email}
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
    {availableRoles.map(r => (
      <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
    ))}
  </Select>
</FormControl>
      <DialogActions sx={{ px: 0, pt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{ minWidth: 120 }}
        >
          {loading ? 'Sending...' : 'Send Invite'}
        </Button>
        <Button onClick={onCancel} variant="outlined" disabled={loading}>
          Cancel
        </Button>
      </DialogActions>
    </Box>
  );
};

export default InviteUserForm;
