import React, { useState, useEffect } from 'react';
import {
    Button,
    TextField,
    Typography,
    Card,
    CardContent,
    Grid,
    Box,
    IconButton,
    Chip,
    Stack,
    Divider,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    ArrowBack,
    Edit,
    Save,
    Cancel,
    Email,
    CheckCircle,
    Star
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function GuestDetailPage() {
    const { eventId, guestId } = useParams();
    const navigate = useNavigate();
    const [guest, setGuest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedGuest, setEditedGuest] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchGuest = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/guests/${guestId}`);
                const guestData = response.data;
                setGuest(guestData);
                setEditedGuest({
                    firstName: guestData.firstName || '',
                    lastName: guestData.lastName || '',
                    email: guestData.email || '',
                    jobTitle: guestData.jobTitle || '',
                    company: guestData.company || '',
                    attendeeType: guestData.attendeeType || '',
                    notes: guestData.notes || ''
                });
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch guest details');
            } finally {
                setLoading(false);
            }
        };

        if (guestId) {
            fetchGuest();
        }
    }, [guestId]);

    const handleInputChange = (field, value) => {
        setEditedGuest(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await api.put(`/guests/${guestId}`, editedGuest);
            setGuest(response.data);
            setIsEditing(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update guest');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditedGuest({
            firstName: guest?.firstName || '',
            lastName: guest?.lastName || '',
            email: guest?.email || '',
            jobTitle: guest?.jobTitle || '',
            company: guest?.company || '',
            attendeeType: guest?.attendeeType || '',
            notes: guest?.notes || ''
        });
        setIsEditing(false);
    };

    const handleBackToGuestList = () => {
        navigate(`/events/${eventId}`);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                <Button onClick={handleBackToGuestList} startIcon={<ArrowBack />}>
                    Back to Guest List
                </Button>
            </Box>
        );
    }

    if (!guest) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>Guest not found</Alert>
                <Button onClick={handleBackToGuestList} startIcon={<ArrowBack />}>
                    Back to Guest List
                </Button>
            </Box>
        );
    }

    // Get gift selections for display
    const getGiftSelections = () => {
        if (!guest.eventCheckins || guest.eventCheckins.length === 0) {
            return [];
        }
        
        const gifts = [];
        guest.eventCheckins.forEach(checkin => {
            if (checkin.giftsReceived && checkin.giftsReceived.length > 0) {
                checkin.giftsReceived.forEach(gift => {
                    const inventoryItem = gift.inventoryId;
                    if (inventoryItem) {
                        gifts.push({
                            name: `${inventoryItem.type}${inventoryItem.style ? ` (${inventoryItem.style})` : ''}`,
                            quantity: gift.quantity,
                            eventName: checkin.eventId?.eventName || 'Unknown Event'
                        });
                    }
                });
            }
        });
        
        return gifts;
    };

    const giftSelections = getGiftSelections();

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', py: 4, px: 2 }}>
            <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Button
                        onClick={handleBackToGuestList}
                        startIcon={<ArrowBack />}
                        sx={{ mb: 2, color: 'text.secondary' }}
                    >
                        Back to Guest List
                    </Button>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                            {guest.firstName} {guest.lastName}
                        </Typography>

                        {!isEditing ? (
                            <Button
                                onClick={() => setIsEditing(true)}
                                startIcon={<Edit />}
                                variant="contained"
                                size="large"
                            >
                                Edit Guest
                            </Button>
                        ) : (
                            <Stack direction="row" spacing={1}>
                                <Button
                                    onClick={handleSave}
                                    startIcon={<Save />}
                                    variant="contained"
                                    color="success"
                                    size="large"
                                    disabled={saving}
                                >
                                    {saving ? <CircularProgress size={24} color="inherit" /> : 'Save'}
                                </Button>
                                <Button
                                    onClick={handleCancel}
                                    startIcon={<Cancel />}
                                    variant="outlined"
                                    color="error"
                                    size="large"
                                >
                                    Cancel
                                </Button>
                            </Stack>
                        )}
                    </Box>
                </Box>

                {/* Guest Information Card */}
                <Card sx={{ mb: 4 }}>
                    <CardContent sx={{ p: 4 }}>
                        <Grid container spacing={4}>
                            {/* Left Column */}
                            <Grid item xs={12} md={6}>
                                <Stack spacing={3}>
                                    {/* First Name */}
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            First Name
                                        </Typography>
                                        {isEditing ? (
                                            <TextField
                                                fullWidth
                                                value={editedGuest.firstName}
                                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                                variant="outlined"
                                            />
                                        ) : (
                                            <Typography variant="h6">{guest.firstName}</Typography>
                                        )}
                                    </Box>

                                    {/* Last Name */}
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            Last Name
                                        </Typography>
                                        {isEditing ? (
                                            <TextField
                                                fullWidth
                                                value={editedGuest.lastName}
                                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                                variant="outlined"
                                            />
                                        ) : (
                                            <Typography variant="h6">{guest.lastName}</Typography>
                                        )}
                                    </Box>

                                    {/* Email */}
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            Email
                                        </Typography>
                                        {isEditing ? (
                                            <TextField
                                                fullWidth
                                                type="email"
                                                value={editedGuest.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                variant="outlined"
                                            />
                                        ) : (
                                            <Typography variant="h6">{guest.email || 'No email'}</Typography>
                                        )}
                                    </Box>

                                    {/* Job Title */}
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            Job Title
                                        </Typography>
                                        {isEditing ? (
                                            <TextField
                                                fullWidth
                                                value={editedGuest.jobTitle}
                                                onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                                                variant="outlined"
                                            />
                                        ) : (
                                            <Typography variant="h6">{guest.jobTitle || 'No job title'}</Typography>
                                        )}
                                    </Box>

                                    {/* Company */}
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            Company
                                        </Typography>
                                        {isEditing ? (
                                            <TextField
                                                fullWidth
                                                value={editedGuest.company}
                                                onChange={(e) => handleInputChange('company', e.target.value)}
                                                variant="outlined"
                                            />
                                        ) : (
                                            <Typography variant="h6">{guest.company || 'No company'}</Typography>
                                        )}
                                    </Box>
                                </Stack>
                            </Grid>

                            {/* Right Column */}
                            <Grid item xs={12} md={6}>
                                <Stack spacing={3}>
                                    {/* Attendee Type */}
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            Attendee Type
                                        </Typography>
                                        {isEditing ? (
                                            <TextField
                                                fullWidth
                                                value={editedGuest.attendeeType}
                                                onChange={(e) => handleInputChange('attendeeType', e.target.value)}
                                                variant="outlined"
                                            />
                                        ) : (
                                            <Typography variant="h6">{guest.attendeeType || 'General'}</Typography>
                                        )}
                                    </Box>

                                    {/* Check-in Status */}
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            Check-in Status
                                        </Typography>
                                        <Chip
                                            label={guest.hasCheckedIn ? 'Checked In' : 'Pending'}
                                            color={guest.hasCheckedIn ? 'success' : 'default'}
                                            icon={guest.hasCheckedIn ? <CheckCircle /> : <Star />}
                                            sx={{ borderRadius: 1 }}
                                        />
                                    </Box>

                                    {/* Gifts Selected */}
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            Gifts Selected
                                        </Typography>
                                        {isEditing ? (
                                            <Box>
                                                <Typography variant="body2" color="textSecondary">
                                                    Gift selections are managed during check-in
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Box>
                                                {giftSelections.length > 0 ? (
                                                    <Stack direction="row" flexWrap="wrap" gap={1}>
                                                        {giftSelections.map((gift, index) => (
                                                            <Chip
                                                                key={index}
                                                                label={`${gift.name} (x${gift.quantity})`}
                                                                variant="outlined"
                                                                color="primary"
                                                                size="small"
                                                            />
                                                        ))}
                                                    </Stack>
                                                ) : (
                                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                                        No gifts selected
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}
                                    </Box>

                                    {/* Notes */}
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            Notes
                                        </Typography>
                                        {isEditing ? (
                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={4}
                                                value={editedGuest.notes}
                                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                                placeholder="Add any notes about this guest..."
                                                variant="outlined"
                                            />
                                        ) : (
                                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                                {guest.notes || (
                                                    <span style={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                                        No notes
                                                    </span>
                                                )}
                                            </Typography>
                                        )}
                                    </Box>
                                </Stack>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* Additional Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Card sx={{ width: '100%', maxWidth: 400 }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', fontWeight: 600 }}>
                                Quick Actions
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Stack spacing={2}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    startIcon={<Email />}
                                    size="large"
                                >
                                    Send Email
                                </Button>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    color="success"
                                    startIcon={<CheckCircle />}
                                    size="large"
                                >
                                    Mark as Confirmed
                                </Button>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    color="warning"
                                    startIcon={<Star />}
                                    size="large"
                                >
                                    Add to Special List
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </Box>
    );
}