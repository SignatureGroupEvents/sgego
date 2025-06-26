import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import ActivityFeedList from './ActivityFeedList';
import MainNavigation from '../MainNavigation';
import api from '../../services/api';

export default function ActivityFeedPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('');

  const loadLogs = () => {
    setLoading(true);
    api.get('/analytics/activity', {
      params: filterType ? { type: filterType } : {}
    })
      .then(res => {
        console.log('Activity logs loaded:', res.data.logs);
        setLogs(res.data.logs || []);
      })
      .catch(err => {
        console.error('Error loading logs:', err);
        setLogs([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, [filterType]);

  const createTestLog = async () => {
    try {
      console.log('Creating test log...');
      await api.post('/analytics/activity/test', { eventId: null });
      console.log('Test log created, reloading...');
      loadLogs();
    } catch (error) {
      console.error('Error creating test log:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainNavigation />
      <Box sx={{ flex: 1, overflow: 'auto', p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Activity Feed
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          View all activity across all events
        </Typography>
        
        {/* Test button for debugging */}
        <Button 
          variant="outlined" 
          onClick={createTestLog} 
          sx={{ mb: 2 }}
        >
          Create Test Log
        </Button>
        
        <ActivityFeedList 
          logs={logs} 
          loading={loading} 
          filterType={filterType} 
          onFilterTypeChange={setFilterType} 
        />
      </Box>
    </Box>
  );
} 