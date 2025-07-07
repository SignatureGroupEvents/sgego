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
  Chip
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
      maxWidth="md"
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

          <Grid container spacing={2}>
            <Grid xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name *"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
                disabled={loading}
              />
            </Grid>
            
            <Grid xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name *"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
                disabled={loading}
              />
            </Grid>
            
            <Grid xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={loading}
                helperText="Optional"
              />
            </Grid>
            
            <Grid xs={12} sm={6}>
              <TextField
                fullWidth
                label="Job Title"
                value={formData.jobTitle}
                onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                disabled={loading}
                helperText="Optional"
              />
            </Grid>
            
            <Grid xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                disabled={loading}
                helperText="Optional"
              />
            </Grid>
            
            <Grid xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Attendee Type</InputLabel>
                <Select
                  value={formData.attendeeType}
                  onChange={(e) => handleInputChange('attendeeType', e.target.value)}
                  label="Attendee Type"
                  disabled={loading}
                  MenuProps={{
                    PaperProps: {
                      sx: {
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
            </Grid>
            
            <Grid xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                disabled={loading}
                helperText="Optional additional information"
              />
            </Grid>
          </Grid>
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