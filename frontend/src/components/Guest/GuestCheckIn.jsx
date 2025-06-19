import React, { useState } from 'react';
import { getCheckinContext, singleEventCheckin, multiEventCheckin } from '../../services/api';

const GuestCheckIn = ({ event, guest: propGuest, onClose, onCheckinSuccess }) => {
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
    } catch (err) {
      setError(err.response?.data?.message || 'Check-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Guest Check-In</h3>
      {!propGuest && (
        <>
          <input
            type="text"
            placeholder="Enter or scan QR"
            value={qrData}
            onChange={(e) => setQrData(e.target.value)}
            disabled={loading}
          />
          <button onClick={handleScan} disabled={loading}>Find Guest</button>
        </>
      )}
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginTop: 8 }}>{success}</div>}
      {guest && context && (
        <div style={{ marginTop: 24 }}>
          <h4>{guest.firstName} {guest.lastName}</h4>
          <p>Email: {guest.email}</p>
          <p>Type: {guest.type}</p>
          {context.availableEvents.map(ev => (
            <div key={ev._id} style={{ marginBottom: 16 }}>
              <label><b>{ev.eventName} Gift:</b></label>
              <select
                value={giftSelections[ev._id]?.inventoryId || ''}
                onChange={e => handleGiftChange(ev._id, e.target.value)}
              >
                <option value="">Select a gift</option>
                {(context.inventoryByEvent?.[ev._id] || []).map(gift => (
                  <option key={gift._id} value={gift._id}>
                    {gift.style} ({gift.size})
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button onClick={handleCheckIn} disabled={loading}>Check In Guest</button>
        </div>
      )}
    </div>
  );
};

export default GuestCheckIn;