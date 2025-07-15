import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchInventory } from '../../services/api';
import EventDashboard from './EventDashboard';

// Event Dashboard Wrapper that fetches inventory and passes it to EventDashboard
const EventDashboardWrapper = () => {
    const { eventId } = useParams();
    const [inventory, setInventory] = useState([]);
    const [inventoryLoading, setInventoryLoading] = useState(false);
    const [inventoryError, setInventoryError] = useState('');
  
    const loadInventory = async () => {
      if (!eventId) return;
  
      setInventoryLoading(true);
      setInventoryError('');
      try {
        const response = await fetchInventory(eventId);
        setInventory(response.data.inventory || []);
      } catch (error) {
        console.error('Error fetching inventory:', error);
        setInventoryError('Failed to fetch inventory data');
      } finally {
        setInventoryLoading(false);
      }
    };
  
    useEffect(() => {
      loadInventory();
    }, [eventId]);
  
    return (
      <EventDashboard
        eventId={eventId}
        inventory={inventory}
        inventoryLoading={inventoryLoading}
        inventoryError={inventoryError}
        onInventoryChange={loadInventory}
      />
    );
  };

  export default EventDashboardWrapper;