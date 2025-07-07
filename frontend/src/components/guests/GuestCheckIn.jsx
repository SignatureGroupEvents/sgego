import React, { useState } from 'react';
import { getCheckinContext, singleEventCheckin, multiEventCheckin } from '../../services/api';
// import MainNavigation from '../MainNavigation'; // Removed
import HomeIcon from '@mui/icons-material/Home';
import { Box, Button, TextField, Typography, Alert, CircularProgress, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const GuestCheckIn = ({ event, guest: propGuest, onClose, onCheckinSuccess, onInventoryChange }) => {
  const [qrData, setQrData] = useState('');
  const [guest, setGuest] = useState(propGuest || null);
  const [context, setContext] = useState(null);
  const [giftSelections, setGiftSelections] = useState({}); // { eventId: { inventoryId, quantity } }
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    // Always fetch check-in context for the event
    setContext(null);
    setSuccess('');
    setError('');
    setGiftSelections({});
    setGuest(propGuest || null);
    if (event?._id) {
      setLoading(true);
      getCheckinContext(event._id)
        .then(res => setContext(res.data))
        .catch(() => setError('Failed to fetch check-in context.'))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line
  }, [event?._id, propGuest]);

  const handleScan = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Simulate guest lookup (replace with real guest fetch/scan logic)
      setGuest({
        firstName: 'Sample',
        lastName: 'Guest',
        email: 'sample@example.com',
        company: 'Sample Co',
        _id: 'sample-guest-id',
      });
    } catch (err) {
      setError('Failed to find guest.');
    } finally {
      setLoading(false);
    }
  };

  const handleGiftChange = (eventId, inventoryId) => {
    setGiftSelections(prev => ({
      ...prev,
      [eventId]: { inventoryId, quantity: 1 }
    }));
  };

  const handleCheckIn = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (!guest) return;
      if (context.checkinMode === 'multi') {
        // Multi-event check-in
        const checkins = context.availableEvents.map(ev => ({
          eventId: ev._id,
          selectedGifts: giftSelections[ev._id] ? [giftSelections[ev._id]] : []
        }));
        await multiEventCheckin(guest._id, checkins);
      } else {
        // Single event check-in
        const selectedGifts = giftSelections[event._id] ? [giftSelections[event._id]] : [];
        await singleEventCheckin(guest._id, event._id, selectedGifts);
      }
      setSuccess('Guest checked in successfully!');
      setGiftSelections({});
      if (onClose) onClose();
      if (onCheckinSuccess) onCheckinSuccess();
      if (onInventoryChange) onInventoryChange();
    } catch (err) {
      setError(err.response?.data?.message || 'Check-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>Guest Check-In</Typography>
      {!propGuest && (
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Enter or scan QR"
            value={qrData}
            onChange={(e) => setQrData(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />
          <Button 
            variant="contained" 
            onClick={handleScan} 
            disabled={loading}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            Find Guest
          </Button>
        </Box>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {guest && context && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>{guest.firstName} {guest.lastName}</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>Email: {guest.email}</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>Type: {guest.type}</Typography>
          {context.availableEvents.map(ev => (
            <Box key={ev._id} sx={{ mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>{ev.eventName} Gift</InputLabel>
                <Select
                  value={giftSelections[ev._id]?.inventoryId || ''}
                  onChange={e => handleGiftChange(ev._id, e.target.value)}
                  label={`${ev.eventName} Gift`}
                >
                  <MenuItem value="">Select a gift</MenuItem>
                  {(context.inventoryByEvent?.[ev._id] || []).map(gift => (
                    <MenuItem key={gift._id} value={gift._id}>
                      {gift.style} ({gift.size})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          ))}
          <Button 
            variant="contained" 
            onClick={handleCheckIn} 
            disabled={loading}
            sx={{ mt: 2, borderRadius: 2, fontWeight: 600 }}
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            Check In Guest
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default GuestCheckIn;