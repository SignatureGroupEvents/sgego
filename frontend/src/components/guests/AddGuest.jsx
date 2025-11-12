import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Typography
} from '@mui/material';
import { createGuest } from '../../services/api';

const AddGuest = ({ open, onClose, eventId, onGuestAdded }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    jobTitle: '',
    company: '',
    attendeeType: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const attendeeTypes = [
    'General',
    'VIP',
    'Speaker',
    'Sponsor',
    'Media',
    'Staff',
    'Volunteer'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const guestData = {
        eventId,
        ...formData,
        // Clean up empty strings
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        jobTitle: formData.jobTitle.trim() || undefined,
        company: formData.company.trim() || undefined,
        attendeeType: formData.attendeeType || undefined,
        notes: formData.notes.trim() || undefined
      };

      const response = await createGuest(guestData);
      
      setSuccess('Guest added successfully!');
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        jobTitle: '',
        company: '',
        attendeeType: '',
        notes: ''
      });

      // Notify parent component
      if (onGuestAdded) {
        onGuestAdded(response.data.guest);
      }

      // Close dialog after a short delay
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1500);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add guest');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        jobTitle: '',
        company: '',
        attendeeType: '',
        notes: ''
      });
      setError('');
      setSuccess('');
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Add New Guest
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* First Name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ minWidth: 150, flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  First Name <span style={{ color: 'red' }}>*</span>
                </Typography>
              </Box>
              <TextField
                fullWidth
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
                disabled={loading}
                size="small"
              />
            </Box>

            {/* Last Name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ minWidth: 150, flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Last Name <span style={{ color: 'red' }}>*</span>
                </Typography>
              </Box>
              <TextField
                fullWidth
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
                disabled={loading}
                size="small"
              />
            </Box>

            {/* Email */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ minWidth: 150, flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Email
                </Typography>
              </Box>
              <TextField
                fullWidth
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={loading}
                size="small"
              />
            </Box>

            {/* Job Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ minWidth: 150, flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Job Title
                </Typography>
              </Box>
              <TextField
                fullWidth
                value={formData.jobTitle}
                onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                disabled={loading}
                size="small"
              />
            </Box>

            {/* Company */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ minWidth: 150, flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Company
                </Typography>
              </Box>
              <TextField
                fullWidth
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                disabled={loading}
                size="small"
              />
            </Box>

            {/* Attendee Type */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ minWidth: 150, flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Attendee Type
                </Typography>
              </Box>
              <FormControl fullWidth size="small">
                <Select
                  value={formData.attendeeType}
                  onChange={(e) => handleInputChange('attendeeType', e.target.value)}
                  disabled={loading}
                  displayEmpty
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 300,
                        zIndex: 9999
                      }
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>Select type (optional)</em>
                  </MenuItem>
                  {attendeeTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Notes */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ minWidth: 150, flexShrink: 0, pt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Notes
                </Typography>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                disabled={loading}
                size="small"
              />
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={handleClose} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || !formData.firstName.trim() || !formData.lastName.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Adding...' : 'Add Guest'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddGuest; 