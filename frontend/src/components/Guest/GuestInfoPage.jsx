import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Tabs, Tab, TextField, Chip, Checkbox, FormControlLabel, IconButton, Divider, Paper, Breadcrumbs, Alert
} from '@mui/material';
import { Home as HomeIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const GuestInfoPage = () => {
  const { guestId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  // Placeholder guest data
  const guest = {
    firstName: 'Martin',
    lastName: 'Sharon',
    checkedInAt: '2025-02-09T15:08:00Z',
    tags: ['sandals', '18027 - LandOLakes - Dominican Republic'],
    notes: '',
    title: '',
    otherNames: '',
    email: '',
    barcode: '',
    groupCheckIn: false,
  };
  const [form, setForm] = useState(guest);
  const [tags, setTags] = useState(guest.tags);
  const [error, setError] = useState('');

  const handleTabChange = (_, newValue) => setTab(newValue);
  const handleInputChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleCheckboxChange = (e) => setForm({ ...form, [e.target.name]: e.target.checked });
  const handleAddTag = (tag) => setTags([...tags, tag]);
  const handleDeleteTag = (tagToDelete) => setTags(tags.filter(tag => tag !== tagToDelete));

  // Button handlers (stubs)
  const handleUndoCheckIn = () => {};
  const handleChangeGift = () => {};
  const handleClearCheckIn = () => {};
  const handleSaveChanges = () => {};
  const handleDeleteGuest = () => {};

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4, mb: 6 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }} aria-label="breadcrumb">
        <Button color="inherit" size="small" onClick={() => navigate('/events')} startIcon={<HomeIcon />}>
          Home
        </Button>
        <Button color="inherit" size="small" onClick={() => navigate(-1)}>
          Event
        </Button>
        <Typography color="text.primary">{guest.firstName} {guest.lastName}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Box flex={1}>
          <Typography variant="h4" fontWeight={700}>{guest.firstName} {guest.lastName}</Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Checked in {new Date(guest.checkedInAt).toLocaleString()}
          </Typography>
        </Box>
        <Button variant="outlined" color="primary" onClick={handleUndoCheckIn} sx={{ mr: 1 }}>
          Undo Check In
        </Button>
        <Button variant="outlined" color="primary" onClick={handleChangeGift} sx={{ mr: 1 }}>
          Change Gift
        </Button>
        <Button variant="outlined" color="error" onClick={handleClearCheckIn} sx={{ mr: 1 }}>
          Clear Check-in
        </Button>
        <Button variant="contained" color="primary" onClick={handleSaveChanges}>
          Save Changes
        </Button>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Guest details" />
        <Tab label="Invites" />
        <Tab label="History" />
      </Tabs>

      {/* Tab Panels */}
      {tab === 0 && (
        <Card>
          <CardContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box component="form" autoComplete="off" sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: 1, minWidth: 260 }}>
                <TextField
                  label="Title / Prefix"
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="First Name"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleInputChange}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Last Name"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleInputChange}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Other Names"
                  name="otherNames"
                  value={form.otherNames}
                  onChange={handleInputChange}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Email"
                  name="email"
                  value={form.email}
                  onChange={handleInputChange}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Barcode"
                  name="barcode"
                  value={form.barcode}
                  onChange={handleInputChange}
                  fullWidth
                  sx={{ mb: 2 }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 260 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Tags</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                  {tags.map((tag, idx) => (
                    <Chip key={idx} label={tag} onDelete={() => handleDeleteTag(tag)} color="info" />
                  ))}
                </Box>
                <Button size="small" sx={{ mb: 2 }} onClick={() => handleAddTag('new-tag')}>Add tags</Button>
                <TextField
                  label="Guest notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  minRows={3}
                  sx={{ mb: 2 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.groupCheckIn}
                      onChange={handleCheckboxChange}
                      name="groupCheckIn"
                    />
                  }
                  label={<span>Group check-in <Typography variant="caption" color="text.secondary">What is this?</Typography></span>}
                  sx={{ mb: 2 }}
                />
              </Box>
            </Box>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteGuest}
              >
                Delete Guest
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
      {tab === 1 && (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">Invites</Typography>
          <Typography color="text.secondary">(Coming soon)</Typography>
        </Card>
      )}
      {tab === 2 && (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">History</Typography>
          <Typography color="text.secondary">(Coming soon)</Typography>
        </Card>
      )}
    </Box>
  );
};

export default GuestInfoPage; 