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
    setGuest(propGuest || null);
    setIsCheckedIn(false);
    
    // Pre-populate gift selections based on existing check-in data
    if (propGuest && propGuest.eventCheckins) {
      console.log('Pre-populating gifts for guest:', propGuest.firstName, propGuest.lastName);
      console.log('Guest eventCheckins:', propGuest.eventCheckins);
      console.log('Current event:', event);
      
      const existingSelections = {};
      
      if (event?.isMainEvent) {
        // For main events, check all events (main + secondary)
        const eventsToCheck = [event, ...(event?.secondaryEvents || [])];
        console.log('Events to check (main):', eventsToCheck.map(ev => ({ id: ev._id, name: ev.eventName })));
        
        eventsToCheck.forEach(ev => {
          console.log(`Looking for event ${ev.eventName} with ID: ${ev._id}`);
          console.log('Available eventCheckins:', propGuest.eventCheckins.map(ec => ({
            eventId: ec.eventId,
            eventIdType: typeof ec.eventId,
            eventIdString: ec.eventId?.toString(),
            giftsReceived: ec.giftsReceived
          })));
          
          const checkin = propGuest.eventCheckins.find(ec => {
            // Handle both populated and unpopulated eventId
            let ecEventId;
            if (ec.eventId && typeof ec.eventId === 'object') {
              // Populated eventId object - use _id property
              ecEventId = ec.eventId._id || ec.eventId.toString();
            } else {
              // Unpopulated eventId string
              ecEventId = ec.eventId;
            }
            
            const evEventId = ev._id?.toString();
            console.log(`Comparing: "${ecEventId}" === "${evEventId}"`);
            return ecEventId === evEventId;
          });
          console.log(`Checking event ${ev.eventName} (${ev._id}):`, checkin);
          
          if (checkin && checkin.giftsReceived && checkin.giftsReceived.length > 0) {
            // For now, use the first gift (UI currently supports single gift selection)
            // TODO: Extend UI to support multiple gifts per event
            const gift = checkin.giftsReceived[0];
            console.log(`Found gift for ${ev.eventName}:`, gift);
            existingSelections[ev._id] = {
              inventoryId: gift.inventoryId?._id || gift.inventoryId,
              quantity: gift.quantity || 1
            };
          }
        });
      } else {
        // For secondary events, check only this event
        console.log(`Looking for secondary event ${event.eventName} with ID: ${event._id}`);
        console.log('Available eventCheckins:', propGuest.eventCheckins.map(ec => ({
          eventId: ec.eventId,
          eventIdType: typeof ec.eventId,
          eventIdString: ec.eventId?.toString(),
          giftsReceived: ec.giftsReceived
        })));
        
        const checkin = propGuest.eventCheckins.find(ec => {
          // Handle both populated and unpopulated eventId
          let ecEventId;
          if (ec.eventId && typeof ec.eventId === 'object') {
            // Populated eventId object - use _id property
            ecEventId = ec.eventId._id || ec.eventId.toString();
          } else {
            // Unpopulated eventId string
            ecEventId = ec.eventId;
          }
          
          const evEventId = event._id?.toString();
          console.log(`Comparing: "${ecEventId}" === "${evEventId}"`);
          return ecEventId === evEventId;
        });
        console.log(`Checking secondary event ${event.eventName} (${event._id}):`, checkin);
        
        if (checkin && checkin.giftsReceived && checkin.giftsReceived.length > 0) {
          // For now, use the first gift (UI currently supports single gift selection)
          // TODO: Extend UI to support multiple gifts per event
          const gift = checkin.giftsReceived[0];
          console.log(`Found gift for ${event.eventName}:`, gift);
          existingSelections[event._id] = {
            inventoryId: gift.inventoryId?._id || gift.inventoryId,
            quantity: gift.quantity || 1
          };
        }
      }
      
      console.log('Final existing selections:', existingSelections);
      setGiftSelections(existingSelections);
    } else {
      console.log('No guest or eventCheckins found');
      setGiftSelections({});
    }
    
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
      let response;
      
      if (context.checkinMode === 'multi') {
        // Multi-event check-in
        const checkins = context.availableEvents.map(ev => ({
          eventId: ev._id,
          selectedGifts: giftSelections[ev._id] ? [giftSelections[ev._id]] : []
        }));
        response = await multiEventCheckin(guest._id, checkins);
      } else {
        // Single event check-in
        const selectedGifts = giftSelections[event._id] ? [giftSelections[event._id]] : [];
        response = await singleEventCheckin(guest._id, event._id, selectedGifts);
      }
      
      // Update local state to show success
      setIsCheckedIn(true);
      setSuccess('Guest checked in successfully!');
      setGiftSelections({});
      
      // Use the updated guest data from the response
      const updatedGuest = response.data.guest || { ...guest, hasCheckedIn: true };
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

  // Helper function to check if guest can still be checked in (same logic as GuestTable)
  const canGuestBeCheckedIn = (guest, event) => {
    if (!guest || !event) return false;
    
    if (event?.isMainEvent) {
      // Main event view - check if there are any pending gifts across all events
      const eventsToCheck = [event, ...(event?.secondaryEvents || [])];
      let hasPendingGifts = false;
      
      eventsToCheck.forEach(ev => {
        const gifts = guest.eventCheckins?.find(ec => 
          ec.eventId?.toString() === ev._id?.toString() || 
          ec.eventId === ev._id
        )?.giftsReceived || [];
        if (gifts.length === 0) {
          hasPendingGifts = true;
        }
      });
      
      return hasPendingGifts;
    } else {
      // Secondary event view - check only this specific event
      const gifts = guest.eventCheckins?.find(ec => 
        ec.eventId?.toString() === event._id?.toString() || 
        ec.eventId === event._id
      )?.giftsReceived || [];
      
      return gifts.length === 0;
    }
  };

  // If guest is already checked in and cannot be checked in further, show success state
  if (isCheckedIn || (guest && !canGuestBeCheckedIn(guest, event))) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h6" color="success.main" gutterBottom>
          {isCheckedIn ? 'Checked In Successfully!' : 'Fully Checked In!'}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {guest?.firstName} {guest?.lastName} {isCheckedIn ? 'has been checked in.' : 'has picked up all available gifts.'}
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
          >
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
            {context.availableEvents.map(ev => {
              const currentSelection = giftSelections[ev._id]?.inventoryId || '';
              console.log(`Rendering dropdown for ${ev.eventName} (${ev._id}):`, {
                currentSelection,
                allGiftSelections: giftSelections,
                availableInventory: context.inventoryByEvent?.[ev._id] || []
              });
              
              return (
                <Box key={ev._id} sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={500} gutterBottom>
                    {ev.eventName} Gift:
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel id={`${ev._id}-gift-label`}>Select a gift</InputLabel>
                    <Select
                      labelId={`${ev._id}-gift-label`}
                      id={`${ev._id}-gift`}
                      value={currentSelection}
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
              );
            })}
          </Box>
          
          <Button 
            variant="contained" 
            color="success"
            onClick={handleCheckIn} 
            disabled={loading}
            fullWidth
            sx={{ mt: 3 }}
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