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
    firstName: '',
    lastName: '',
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
    if (isOperationsManager) return role.value !== 'admin'; // Ops can invite Ops and Staff, but not Admin
    return true; // admin sees everything
  });


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validate required fields
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      await onSubmit(formData);
      setFormData({ email: '', firstName: '', lastName: '', role: 'staff' });
    } catch (error) {
      const message = error.message?.toLowerCase() || '';
      setErrors({
        email: message.includes('already exists')
          ? 'User with this email already exists'
          : message.includes('invalid email')
          ? 'Please enter a valid email address'
          : newErrors.email || '',
        firstName: newErrors.firstName || '',
        lastName: newErrors.lastName || '',
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
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          fullWidth
          label="First Name"
          value={formData.firstName}
          onChange={(e) => {
            setFormData({ ...formData, firstName: e.target.value });
            if (errors.firstName) setErrors({ ...errors, firstName: '' });
          }}
          required
          margin="normal"
          error={!!errors.firstName}
          helperText={errors.firstName}
        />
        <TextField
          fullWidth
          label="Last Name"
          value={formData.lastName}
          onChange={(e) => {
            setFormData({ ...formData, lastName: e.target.value });
            if (errors.lastName) setErrors({ ...errors, lastName: '' });
          }}
          required
          margin="normal"
          error={!!errors.lastName}
          helperText={errors.lastName}
        />
      </Box>
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
