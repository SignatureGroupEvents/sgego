import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Button,
    Box,
    Card,
    CardContent,
    Grid,
    Chip,
    Alert,
    CircularProgress,
    IconButton,
    Menu,
    MenuItem
} from '@mui/material';
import {
    Add as AddIcon,
    Event as EventIcon,
    MoreVert as MoreVertIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    People as PeopleIcon,
    CheckCircle as CheckinIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { format } from 'date-fns';

const EventCard = ({ event, onEdit, onDelete, onViewGuests, onCheckin }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const { isOperationsManager, isAdmin } = useAuth();

    const handleMenuClick = (e) => {
        e.stopPropagation();
        setAnchorEl(e.currentTarget);
    };

    const handleMenuClose = () => setAnchorEl(null);

    const canManage = isOperationsManager || isAdmin;

    return (
        <Card sx={{
            height: '100%',
            cursor: 'pointer',
            '&:hover': {
                boxShadow: 4,
                transform: 'translateY(-2px)',
                transition: 'all 0.2s ease-in-out'
            }
        }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            {event.eventName}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Contract: {event.eventContractNumber}
                        </Typography>
                    </Box>

                    {canManage && (
                        <IconButton
                            size="small"
                            onClick={handleMenuClick}
                            sx={{ mt: -1, mr: -1 }}
                        >
                            <MoreVertIcon />
                        </IconButton>
                    )}
                </Box>

                <Box mb={2}>
                    <Typography variant="body2" gutterBottom>
                        📅 {format(new Date(event.eventStart), 'PPP p')}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        👤 Created by: {event.createdBy?.username}
                    </Typography>
                </Box>

                <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                    {event.isMainEvent ? (
                        <Chip label="Main Event" color="primary" size="small" />
                    ) : (
                        <Chip label="Secondary Event" color="secondary" size="small" />
                    )}

                    {event.includeStyles && (
                        <Chip label="Styles Enabled" variant="outlined" size="small" />
                    )}

                    {event.allowMultipleGifts && (
                        <Chip label="Multi-Gift" variant="outlined" size="small" />
                    )}
                </Box>

                <Box display="flex" gap={1} mt={2}>
                    <Button
                        size="small"
                        startIcon={<PeopleIcon />}
                        onClick={() => onViewGuests(event._id)}
                    >
                        Guests
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<CheckinIcon />}
                        onClick={() => onCheckin(event._id)}
                    >
                        Check-in
                    </Button>
                </Box>

                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                    onClick={(e) => e.stopPropagation()}
                >
                    <MenuItem onClick={() => { onEdit(event._id); handleMenuClose(); }}>
                        <EditIcon sx={{ mr: 1 }} fontSize="small" />
                        Edit
                    </MenuItem>
                    <MenuItem onClick={() => { onDelete(event._id); handleMenuClose(); }}>
                        <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
                        Delete
                    </MenuItem>
                </Menu>
            </CardContent>
        </Card>
    );
};

const EventsList = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { isOperationsManager, isAdmin } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await api.get('/events');
            setEvents(response.data.events);
        } catch (error) {
            setError('Failed to load events');
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (eventId) => {
        navigate(`/events/${eventId}/edit`);
    };

    const handleDelete = async (eventId) => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            try {
                await api.delete(`/events/${eventId}`);
                setEvents(events.filter(e => e._id !== eventId));
                // Show success message
            } catch (error) {
                setError('Failed to delete event');
            }
        }
    };

    const handleViewGuests = (eventId) => {
        navigate(`/events/${eventId}/guests`);
    };

    const handleCheckin = (eventId) => {
        navigate(`/events/${eventId}/checkin`);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress size={60} />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                    <Box>
                        <Typography variant="h4" gutterBottom>
                            🎪 Events
                        </Typography>
                        <Typography variant="subtitle1" color="textSecondary">
                            Manage your events and check-in sessions
                        </Typography>
                    </Box>

                    {(isOperationsManager || isAdmin) && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/events/new')}
                            size="large"
                        >
                            Create Event
                        </Button>
                    )}
                </Box>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {events.length === 0 ? (
                    <Card>
                        <CardContent sx={{ textAlign: 'center', py: 6 }}>
                            <EventIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                No events found
                            </Typography>
                            <Typography color="textSecondary" paragraph>
                                Get started by creating your first event!
                            </Typography>
                            {(isOperationsManager || isAdmin) && (
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => navigate('/events/new')}
                                >
                                    Create Your First Event
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                        <Grid container spacing={3}>
                        {events.map((event) => (
                            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={event._id}>
                            <EventCard
                                event={event}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onViewGuests={handleViewGuests}
                                onCheckin={handleCheckin}
                            />
                            </Grid>
                        ))}
                        </Grid>
                )}
            </Box>
        </Container>
    );
};

export default EventsList;