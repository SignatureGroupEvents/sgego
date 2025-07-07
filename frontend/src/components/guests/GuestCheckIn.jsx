import React, { useState } from 'react';
import { getCheckinContext, singleEventCheckin, multiEventCheckin } from '../../services/api';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Alert, 
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { CheckCircleOutline as CheckCircleIcon } from '@mui/icons-material';
import HomeIcon from '@mui/icons-material/Home';

const GuestCheckIn = ({ event, guest: propGuest, onClose, onCheckinSuccess, onInventoryChange }) => {
  const [qrData, setQrData] = useState('');
  const [guest, setGuest] = useState(propGuest || null);
  const [context, setContext] = useState(null);
  const [giftSelections, setGiftSelections] = useState({}); // { eventId: { inventoryId, quantity } }
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  React.useEffect(() => {
    // Always fetch check-in context for the event
    setContext(null);
    setSuccess('');
    setError('');
    setGiftSelections({});
    setGuest(propGuest || null);
    setIsCheckedIn(false);
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
      
      // Update local state to show success
      setIsCheckedIn(true);
      setSuccess('Guest checked in successfully!');
      setGiftSelections({});
      
      // Update the guest object to reflect check-in status
      const updatedGuest = { ...guest, hasCheckedIn: true };
      setGuest(updatedGuest);
      
      // Call callbacks to update parent components
      if (onCheckinSuccess) onCheckinSuccess(updatedGuest);
      if (onInventoryChange) onInventoryChange();
      
      // Auto-close after a short delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Check-in failed.');
    } finally {
      setLoading(false);
    }
  };

  // If guest is already checked in, show success state
  if (isCheckedIn || (guest && guest.hasCheckedIn)) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h6" color="success.main" gutterBottom>
          Checked In Successfully!
        </Typography>
        <Typography variant="body1" gutterBottom>
          {guest?.firstName} {guest?.lastName} has been checked in.
        </Typography>
        <Button 
          variant="outlined" 
          onClick={onClose}
          sx={{ mt: 2 }}
        >
          Close
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h6" gutterBottom>Guest Check-In</Typography>
      {!propGuest && (
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Enter or scan QR code"
            value={qrData}
            onChange={(e) => setQrData(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />
          <Button 
            variant="contained" 
            onClick={handleScan} 
            disabled={loading}
            fullWidth
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
          <Typography variant="h6" gutterBottom>
            {guest.firstName} {guest.lastName}
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Email: {guest.email}
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Type: {guest.type || 'General'}
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Select Gifts:
            </Typography>
            {context.availableEvents.map(ev => (
              <Box key={ev._id} sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={500} gutterBottom>
                  {ev.eventName} Gift:
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel id={`${ev._id}-gift-label`}>Select a gift</InputLabel>
                  <Select
                    labelId={`${ev._id}-gift-label`}
                    id={`${ev._id}-gift`}
                    value={giftSelections[ev._id]?.inventoryId || ''}
                    label="Select a gift"
                    onChange={e => handleGiftChange(ev._id, e.target.value)}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          zIndex: 9999
                        }
                      }
                    }}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {(context.inventoryByEvent?.[ev._id] || []).map(gift => (
                      <MenuItem key={gift._id} value={gift._id}>
                        {gift.style} ({gift.size})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            ))}
          </Box>
          
          <Button 
            variant="contained" 
            color="success"
            onClick={handleCheckIn} 
            disabled={loading}
            fullWidth
            sx={{ mt: 3, borderRadius: 2, fontWeight: 600 }}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Checking In...' : 'Check In Guest'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default GuestCheckIn;