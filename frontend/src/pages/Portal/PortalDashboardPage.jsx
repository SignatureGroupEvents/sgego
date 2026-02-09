import React, { useState, useEffect } from 'react';
import { Box, Alert, Button } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { hasPortalSession, getPortalEventId, getPortalInventory, clearPortalSession } from '../../services/portalApi';
import EventDashboard from '../../components/Events/EventDashboard';

export default function PortalDashboardPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState('');
  const [closedMessage, setClosedMessage] = useState('');

  useEffect(() => {
    if (getPortalEventId() !== eventId || !hasPortalSession()) {
      navigate(`/portal/${eventId}/login`, { replace: true });
      return;
    }

    const loadInventory = async () => {
      setInventoryLoading(true);
      setInventoryError('');
      setClosedMessage('');
      try {
        const data = await getPortalInventory(eventId);
        setInventory(data.inventory || []);
      } catch (err) {
        const res = err.response?.data;
        if (res?.code === 'PORTAL_CLOSED') {
          setClosedMessage(res.message || 'This event portal has closed. Contact your operations manager to reopen this event.');
        } else {
          setInventoryError(res?.message || 'Failed to load inventory');
        }
      } finally {
        setInventoryLoading(false);
      }
    };

    loadInventory();
  }, [eventId, navigate]);

  if (getPortalEventId() !== eventId || !hasPortalSession()) {
    return null;
  }

  if (closedMessage) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, bgcolor: '#fdf9f6' }}>
        <Alert severity="warning" sx={{ maxWidth: 480 }} action={
          <Button color="inherit" size="small" onClick={() => { clearPortalSession(); navigate(`/portal/${eventId}/login`, { replace: true }); }}>
            Sign out
          </Button>
        }>
          {closedMessage}
        </Alert>
      </Box>
    );
  }

  return (
    <EventDashboard
      eventId={eventId}
      inventory={inventory}
      inventoryLoading={inventoryLoading}
      inventoryError={inventoryError}
      onInventoryChange={() => {
        getPortalInventory(eventId).then((data) => setInventory(data.inventory || [])).catch(() => {});
      }}
      isPortalView
    />
  );
}
