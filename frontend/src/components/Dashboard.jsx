import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Dashboard = ({ selectedEvent }) => {
  const { user, logout, isOperationsManager, isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Test API connection
  const testAPI = async () => {
    setLoading(true);
    try {
      const response = await api.get('/events');
      let allEvents = response.data.events;
      
      // Staff can view all events, operations managers and admins can view all events
      // No filtering needed since staff should see all events
      setEvents(allEvents);
      setMessage(`✅ API Working! Found ${allEvents.length} events`);
    } catch (error) {
      setMessage(`❌ API Error: ${error.message}`);
    }
    setLoading(false);
  };

  // Create test event
  const createTestEvent = async () => {
    setLoading(true);
    try {
      const testEvent = {
        eventName: `Test Event ${Date.now()}`,
        eventContractNumber: `TEST${Date.now()}`,
        eventStart: new Date().toISOString(),
        includeStyles: true
      };
      
      await api.post('/events', testEvent);
      setMessage('✅ Test event created successfully!');
      testAPI(); // Refresh events list
    } catch (error) {
      setMessage(`❌ Create Error: ${error.response?.data?.message || error.message}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    testAPI();
  }, []);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        {selectedEvent && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Viewing event: <strong>{selectedEvent.eventName}</strong>
          </Alert>
        )}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">
            Welcome, {user?.username}! 👋
          </Typography>
          <Button variant="outlined" onClick={logout}>
            Logout
          </Button>
        </Box>

        {message && (
          <Alert severity={message.includes('✅') ? 'success' : 'error'} sx={{ mb: 3 }}>
            {message}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🔗 API Connection Test
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Test the backend connection and authentication.
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={testAPI} 
                  disabled={loading}
                  fullWidth
                >
                  {loading ? <CircularProgress size={24} /> : 'Test API Connection'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ➕ Create Test Data
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Create a test event to verify CRUD operations.
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={createTestEvent} 
                  disabled={loading}
                  fullWidth
                >
                  {loading ? <CircularProgress size={24} /> : 'Create Test Event'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📋 Events List ({events.length})
                </Typography>
                {events.length > 0 ? (
                  <List>
                    {events.map((event) => (
                      <ListItem key={event._id} divider>
                        <ListItemText
                          primary={event.eventName}
                          secondary={`Contract: ${event.eventContractNumber} | Created by: ${event.createdBy?.username}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="textSecondary">
                    No events found. Create a test event to get started!
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  👤 User Info
                </Typography>
                <Typography><strong>Username:</strong> {user?.username}</Typography>
                <Typography><strong>Email:</strong> {user?.email}</Typography>
                <Typography><strong>Role:</strong> {user?.role}</Typography>
                <Typography><strong>User ID:</strong> {user?.id}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;