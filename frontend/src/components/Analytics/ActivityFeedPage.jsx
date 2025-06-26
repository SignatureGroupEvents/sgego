import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Button, Alert } from '@mui/material';
import ActivityFeedList from './ActivityFeedList';
import MainNavigation from '../MainNavigation';
import { getGlobalActivityFeed, createTestActivityLog } from '../../services/api';

export default function ActivityFeedPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getGlobalActivityFeed({
        type: filterType || undefined,
        limit: 100
      });
      console.log('Activity logs loaded:', response.data.logs);
      setLogs(response.data.logs || []);
    } catch (err) {
      console.error('Error loading logs:', err);
      setError('Failed to load activity logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filterType]);

  const handleCreateTestLog = async () => {
    try {
      console.log('Creating test log...');
      await createTestActivityLog();
      console.log('Test log created, reloading...');
      await loadLogs();
    } catch (error) {
      console.error('Error creating test log:', error);
      setError('Failed to create test log');
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
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {/* Test button for debugging */}
        <Button 
          variant="outlined" 
          onClick={handleCreateTestLog} 
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