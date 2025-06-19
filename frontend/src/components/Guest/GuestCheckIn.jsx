import React, { useState } from 'react';
import { scanGuestByQR, checkInGuest } from '../api/checkins';

const GuestCheckIn = ({ event }) => {
  const [qrData, setQrData] = useState('');
  const [guest, setGuest] = useState(null);
  const [giftSelections, setGiftSelections] = useState({});

  const handleScan = async () => {
    const data = await scanGuestByQR(qrData, event._id);
    setGuest(data);
  };

  const handleCheckIn = async () => {
    await checkInGuest(guest._id, event._id, giftSelections);
    alert('Checked in!');
  };

  return (
    <div>
      <h3>Guest Check-In</h3>
      <input
        type="text"
        placeholder="Enter or scan QR"
        value={qrData}
        onChange={(e) => setQrData(e.target.value)}
      />
      <button onClick={handleScan}>Find Guest</button>

      {guest && (
        <div>
          <h4>{guest.firstName} {guest.lastName}</h4>
          <p>Email: {guest.email}</p>
          <p>Company: {guest.company}</p>

          {guest.availableEvents.map(ev => (
            <div key={ev._id}>
              <label>{ev.eventName} Gift:</label>
              <select onChange={e => setGiftSelections({ ...giftSelections, [ev._id]: e.target.value })}>
                <option>Select a gift</option>
                {ev.availableGifts.map(gift => (
                  <option key={gift._id} value={gift._id}>{gift.style} ({gift.size})</option>
                ))}
              </select>
            </div>
          ))}

          <button onClick={handleCheckIn}>Check In Guest</button>
        </div>
      )}
    </div>
  );
};

export default GuestCheckIn;