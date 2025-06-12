import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Upload as UploadIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Event as EventIcon,
  CalendarToday as CalendarIcon,
  Groups as GroupsIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { format } from 'date-fns';

const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h3" component="div" color={color}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ 
          backgroundColor: `${color}.light`, 
          borderRadius: 2, 
          p: 2 
        }}>
          {React.cloneElement(icon, { 
            sx: { fontSize: 40, color: `${color}.main` } 
          })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const GuestTable = ({ guests, onAddGuest, onUploadGuests }) => {
  if (guests.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <GroupsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No guests added yet
          </Typography>
          <Typography color="textSecondary" paragraph>
            Get started by uploading a guest list or adding guests manually.
          </Typography>
          <Box display="flex" gap={2} justifyContent="center">
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={onUploadGuests}
            >
              Upload CSV/Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={onAddGuest}
            >
              Add Guest Manually
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Guest List ({guests.length})
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={onUploadGuests}
              size="small"
            >
              Upload More
            </Button>
            <Button
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={onAddGuest}
              size="small"
            >
              Add Guest
            </Button>
          </Box>
        </Box>
        
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Tags</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {guests.map((guest) => (
                <TableRow key={guest._id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {guest.firstName} {guest.lastName}
                    </Typography>
                    {guest.jobTitle && (
                      <Typography variant="caption" color="textSecondary">
                        {guest.jobTitle}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{guest.email || 'No email'}</TableCell>
                  <TableCell>{guest.company || '-'}</TableCell>
                  <TableCell>{guest.attendeeType || 'General'}</TableCell>
                  <TableCell>
                    <Chip
                      label={guest.hasCheckedIn ? 'Checked In' : 'Pending'}
                      color={guest.hasCheckedIn ? 'success' : 'default'}
                      size="small"
                      icon={guest.hasCheckedIn ? <CheckCircleIcon /> : <PersonIcon />}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {guest.tags?.map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag.name}
                          size="small"
                          sx={{
                            backgroundColor: tag.color,
                            color: 'white',
                            fontSize: '0.7rem'
                          }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isOperationsManager, isAdmin } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEventData();
    fetchGuests();
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      const response = await api.get(`/events/${eventId}`);
      setEvent(response.data.event);
    } catch (error) {
      setError('Failed to load event data');
      console.error('Error fetching event:', error);
    }
  };

  const fetchGuests = async () => {
    try {
      const response = await api.get(`/guests?eventId=${eventId}`);
      setGuests(response.data.guests);
    } catch (error) {
      console.error('Error fetching guests:', error);
      // Don't set error here as guests might just not exist yet
    } finally {
      setLoading(false);
    }
  };

  const handleUploadGuests = () => {
    navigate(`/events/${eventId}/upload`);
  };

  const handleAddGuest = () => {
    navigate(`/events/${eventId}/add-guest`);
  };

  const handleCheckIn = () => {
    navigate(`/events/${eventId}/checkin`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Container>
        <Alert severity="error">{error || 'Event not found'}</Alert>
      </Container>
    );
  }

  // Calculate stats
  const totalGuests = guests.length;
  const checkedInGuests = guests.filter(g => g.hasCheckedIn).length;
  const pendingGuests = totalGuests - checkedInGuests;
  const checkInPercentage = totalGuests > 0 ? Math.round((checkedInGuests / totalGuests) * 100) : 0;

  // Data for charts
  const pieData = [
    { name: 'Checked In', value: checkedInGuests, color: '#4caf50' },
    { name: 'Pending', value: pendingGuests, color: '#ff9800' }
  ];

  const attendeeTypeData = guests.reduce((acc, guest) => {
    const type = guest.attendeeType || 'General';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const barData = Object.entries(attendeeTypeData).map(([type, count]) => ({
    type,
    count
  }));

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" mb={4}>
          <IconButton onClick={() => navigate('/events')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box flexGrow={1}>
            <Typography variant="h4" gutterBottom>
              {event.eventName}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Contract: {event.eventContractNumber}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={handleCheckIn}
            size="large"
          >
            Start Check-in
          </Button>
        </Box>

        {/* Event Info Card */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom>
                  Event Details
                </Typography>
                <Box display="flex" alignItems="center" mb={1}>
                  <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography>
                    {format(new Date(event.eventStart), 'PPP')}
                  </Typography>
                </Box>
                {event.eventEnd && (
                  <Box display="flex" alignItems="center" mb={1}>
                    <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>
                      End: {format(new Date(event.eventEnd), 'PPP')}
                    </Typography>
                  </Box>
                )}
                <Typography color="textSecondary">
                  Created by: {event.createdBy?.username}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom>
                  Configuration
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {event.isMainEvent ? (
                    <Chip label="Main Event" color="primary" />
                  ) : (
                    <Chip label="Secondary Event" color="secondary" />
                  )}
                  {event.includeStyles && (
                    <Chip label="Styles Enabled" variant="outlined" />
                  )}
                  {event.allowMultipleGifts && (
                    <Chip label="Multi-Gift" variant="outlined" />
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Total Guests"
              value={totalGuests}
              icon={<GroupsIcon />}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Checked In"
              value={checkedInGuests}
              subtitle={`${checkInPercentage}% complete`}
              icon={<CheckCircleIcon />}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Pending"
              value={pendingGuests}
              icon={<PersonIcon />}
              color="warning"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Check-in Rate"
              value={`${checkInPercentage}%`}
              icon={<AssessmentIcon />}
              color="info"
            />
          </Grid>
        </Grid>

        {/* Progress Bar */}
        {totalGuests > 0 && (
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Check-in Progress
              </Typography>
              <LinearProgress
                variant="determinate"
                value={checkInPercentage}
                sx={{ height: 10, borderRadius: 1 }}
              />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {checkedInGuests} of {totalGuests} guests checked in
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        {totalGuests > 0 && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Check-in Status
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Attendee Types
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData}>
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#1976d2" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Guest Table */}
        <GuestTable
          guests={guests}
          onAddGuest={handleAddGuest}
          onUploadGuests={handleUploadGuests}
        />
      </Box>
    </Container>
  );
};

export default EventDetails;