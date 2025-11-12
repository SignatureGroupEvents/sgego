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
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Autocomplete
} from '@mui/material';
import {
    ArrowBack,
    Edit,
    Save,
    Cancel,
    Email,
    CheckCircle,
    Star,
    Undo,
    SwapHoriz,
    Delete,
    Add,
    LocalOffer
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api, { undoCheckin, updateCheckinGifts, deleteGuest } from '../../services/api';
import MainLayout from '../layout/MainLayout';
import toast from 'react-hot-toast';

// Undo reason options - these map to string values sent to backend
const UNDO_REASONS = [
    { value: 'duplicate_checkin', label: 'Duplicate Check-in' },
    { value: 'wrong_guest', label: 'Wrong Guest' },
    { value: 'incorrect_gifts', label: 'Incorrect Gifts Distributed' },
    { value: 'guest_cancelled', label: 'Guest Cancelled' },
    { value: 'system_error', label: 'System Error' },
    { value: 'staff_mistake', label: 'Staff Mistake' },
    { value: 'other', label: 'Other' }
];

export default function GuestDetailPage() {
    const { eventId, guestId } = useParams();
    const navigate = useNavigate();
    const [guest, setGuest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedGuest, setEditedGuest] = useState({});
    const [saving, setSaving] = useState(false);
    const [event, setEvent] = useState(null);
    
    // Tag management states
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    
    // Undo and gift modification states
    const [undoDialogOpen, setUndoDialogOpen] = useState(false);
    const [giftModificationDialogOpen, setGiftModificationDialogOpen] = useState(false);
    const [selectedCheckin, setSelectedCheckin] = useState(null);
    const [undoReason, setUndoReason] = useState('');
    const [selectedUndoReason, setSelectedUndoReason] = useState('');
    const [customUndoReason, setCustomUndoReason] = useState('');
    const [giftModificationReason, setGiftModificationReason] = useState('');
    const [availableInventory, setAvailableInventory] = useState([]);
    const [modifiedGifts, setModifiedGifts] = useState([]);
    const [undoLoading, setUndoLoading] = useState(false);
    const [giftModificationLoading, setGiftModificationLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

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
                    notes: guestData.notes || '',
                    qrCodeData: guestData.qrCodeData || ''
                });
                
                // Set initial tags
                setSelectedTags(guestData.tags || []);
                
                // Fetch event details
                if (eventId) {
                    try {
                        const eventResponse = await api.get(`/events/${eventId}`);
                        const eventData = eventResponse.data.event || eventResponse.data;
                        setEvent(eventData);
                        // Set available tags from event
                        setAvailableTags(eventData?.availableTags || []);
                    } catch (eventErr) {
                        console.warn('Failed to fetch event details:', eventErr);
                    }
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch guest details');
            } finally {
                setLoading(false);
            }
        };

        if (guestId) {
            fetchGuest();
        }
    }, [guestId, eventId]);

    const handleInputChange = (field, value) => {
        setEditedGuest(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Tag change handler
    const handleTagChange = (event, newValue) => {
        setSelectedTags(newValue);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            // Save guest data including tags
            const updateData = {
                ...editedGuest,
                tags: selectedTags.length > 0 ? selectedTags.map(tag => ({
                    name: tag.name || tag,
                    color: tag.color || '#1976d2'
                })) : []
            };
            const response = await api.put(`/guests/${guestId}`, updateData);
            setGuest(response.data);
            setIsEditing(false);
            setError(''); // Clear any previous errors
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
            notes: guest?.notes || '',
            qrCodeData: guest?.qrCodeData || ''
        });
        setSelectedTags(guest?.tags || []);
        setIsEditing(false);
    };

    const handleBackToGuestList = () => {
        navigate(`/events/${eventId}`);
    };
    
    const handleDeleteGuest = async () => {
        if (!guest) return;
        
        setDeleting(true);
        try {
            await deleteGuest(guestId);
            toast.success('Guest deleted successfully');
            navigate(`/events/${eventId}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete guest');
        } finally {
            setDeleting(false);
            setDeleteDialogOpen(false);
        }
    };

    const handleUndoCheckin = async () => {
        if (!selectedCheckin) return;
        
        try {
            setUndoLoading(true);
            
            // Determine the final reason to send to backend
            let finalReason = selectedUndoReason;
            if (selectedUndoReason === 'other' && customUndoReason.trim()) {
                finalReason = customUndoReason.trim();
            }
            
            // Pass additional data to help backend find the correct checkin
            await undoCheckin(selectedCheckin._id, finalReason, guestId, selectedCheckin.eventId._id);
            
            // Refresh guest data to reflect the deleted check-in
            const guestResponse = await api.get(`/guests/${guestId}`);
            setGuest(guestResponse.data);
            
            setUndoDialogOpen(false);
            setSelectedUndoReason('');
            setCustomUndoReason('');
            setUndoReason('');
            setSelectedCheckin(null);
            setError(''); // Clear any previous errors
        } catch (err) {
            console.error('Undo checkin error:', err); // DEBUG
            setError(err.response?.data?.message || 'Failed to undo check-in');
        } finally {
            setUndoLoading(false);
        }
    };

    const handleModifyGifts = async () => {
        if (!selectedCheckin || !giftModificationReason.trim()) {
            setError('Please provide a reason for modifying gifts');
            return;
        }
        
        try {
            setGiftModificationLoading(true);
            // Use the imported updateCheckinGifts function - pass additional data to help backend find the correct checkin
            await updateCheckinGifts(selectedCheckin._id, modifiedGifts, giftModificationReason, guestId, selectedCheckin.eventId._id);
            
            // Refresh guest data
            const guestResponse = await api.get(`/guests/${guestId}`);
            setGuest(guestResponse.data);
            
            setGiftModificationDialogOpen(false);
            setGiftModificationReason('');
            setSelectedCheckin(null);
            setModifiedGifts([]);
            setError(''); // Clear any previous errors
        } catch (err) {
            let errorMessage = 'Failed to update gifts';
            
            if (err.response?.data?.message) {
                if (err.response.data.message.includes('Insufficient inventory')) {
                    errorMessage = `${err.response.data.message}. Note: When modifying gifts, inventory is checked after restoring the original gifts.`;
                } else {
                    errorMessage = err.response.data.message;
                }
            }
            
            setError(errorMessage);
        } finally {
            setGiftModificationLoading(false);
        }
    };

    const openUndoDialog = (checkin) => {
        setSelectedCheckin(checkin);
        setUndoReason('');
        setUndoDialogOpen(true);
    };

    const openGiftModificationDialog = async (checkin) => {
        setSelectedCheckin(checkin);
        setGiftModificationReason('');
        
        // Fetch available inventory for the event
        try {
            const inventoryResponse = await api.get(`/events/${checkin.eventId._id || checkin.eventId}/inventory`);
            
            // Ensure we always have an array - show all items but indicate availability
            let inventory = [];
            if (Array.isArray(inventoryResponse.data)) {
                inventory = inventoryResponse.data;
            } else if (inventoryResponse.data && typeof inventoryResponse.data === 'object') {
                // If it's an object, it might have inventory in a nested property
                inventory = inventoryResponse.data.inventory || inventoryResponse.data.items || [];
            }
            
            setAvailableInventory(inventory);
            
            // Initialize modified gifts with current gifts
            const currentGifts = (checkin.giftsReceived || []).map(gift => ({
                inventoryId: gift.inventoryId?._id || gift.inventoryId || '',
                quantity: gift.quantity || 1,
                notes: gift.notes || ''
            }));
            setModifiedGifts(currentGifts);
            
            setGiftModificationDialogOpen(true);
        } catch (err) {
            setError('Failed to fetch available inventory');
        }
    };

    const addGift = () => {
        setModifiedGifts([...modifiedGifts, { inventoryId: '', quantity: 1, notes: '' }]);
    };

    const removeGift = (index) => {
        setModifiedGifts(modifiedGifts.filter((_, i) => i !== index));
    };

    const updateGift = (index, field, value) => {
        const updated = [...modifiedGifts];
        updated[index] = { ...updated[index], [field]: value };
        setModifiedGifts(updated);
    };

    if (loading) {
        return (
            <MainLayout eventName={event?.eventName} userName={guest?.firstName + ' ' + guest?.lastName}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                    <CircularProgress />
                </Box>
            </MainLayout>
        );
    }

    if (error && !guest) {
        return (
            <MainLayout eventName={event?.eventName} userName={guest?.firstName + ' ' + guest?.lastName}>
                <Box sx={{ p: 3 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                    <Button onClick={handleBackToGuestList} startIcon={<ArrowBack />}>
                        Back to Guest List
                    </Button>
                </Box>
            </MainLayout>
        );
    }

    if (!guest) {
        return (
            <MainLayout eventName={event?.eventName}>
                <Box sx={{ p: 3 }}>
                    <Alert severity="warning" sx={{ mb: 2 }}>Guest not found</Alert>
                    <Button onClick={handleBackToGuestList} startIcon={<ArrowBack />}>
                        Back to Guest List
                    </Button>
                </Box>
            </MainLayout>
        );
    }

    // Get gift selections for display - REMOVED (now handled in the new table format)

    return (
        <MainLayout eventName={event?.eventName} userName={guest.firstName + ' ' + guest.lastName}>
            <Box sx={{ minHeight: '100vh', py: 4, px: 2 }}>
                <Box sx={{ maxWidth: 1200, mx: 'auto', backgroundColor: 'background.paper', borderRadius: 2, p: 4}}>
                    {/* Error Alert */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}

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
                            <Box>
                                <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
                                    {guest.firstName} {guest.lastName}
                                </Typography>
                                {(() => {
                                    // Calculate check-in status - exclude main events when secondary events exist
                                    const hasSecondaryEvents = event?.secondaryEvents && event.secondaryEvents.length > 0;
                                    const eventsToCheck = hasSecondaryEvents ? event.secondaryEvents : [event];
                                    const totalEvents = eventsToCheck.length;
                                    const checkedInEvents = guest.eventCheckins?.length || 0;
                                    const isFullyCheckedIn = checkedInEvents >= totalEvents;
                                    const isPartiallyCheckedIn = checkedInEvents > 0 && checkedInEvents < totalEvents;
                                    
                                    if (isFullyCheckedIn) {
                                        return (
                                            <Chip
                                                label="Fully Picked Up"
                                                color="success"
                                                size="small"
                                                icon={<CheckCircle />}
                                                sx={{ fontWeight: 600 }}
                                            />
                                        );
                                    } else if (isPartiallyCheckedIn) {
                                        return (
                                            <Chip
                                                label="Partial"
                                                color="warning"
                                                size="small"
                                                icon={<Star />}
                                                sx={{ fontWeight: 600 }}
                                            />
                                        );
                                    } else {
                                        return (
                                            <Chip
                                                label="Not Picked Up"
                                                color="default"
                                                size="small"
                                                icon={<Star />}
                                                sx={{ fontWeight: 600 }}
                                            />
                                        );
                                    }
                                })()}
                            </Box>

                            {!isEditing ? (
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        onClick={() => setIsEditing(true)}
                                        startIcon={<Edit />}
                                        variant="contained"
                                        size="large"
                                    >
                                        Edit Guest
                                    </Button>
                                    <Button
                                        onClick={() => setDeleteDialogOpen(true)}
                                        startIcon={<Delete />}
                                        variant="outlined"
                                        color="error"
                                        size="large"
                                    >
                                        Delete Guest
                                    </Button>
                                </Stack>
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
                                        size="large"
                                    >
                                        Cancel
                                    </Button>
                                </Stack>
                            )}
                        </Box>
                    </Box>

                    {/* Guest Information */}
                    <Stack spacing={3}>
                        {/* Basic Information */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'primary.main' }}>
                                    Basic Information
                                </Typography>

                                <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
                                    {/* Left Column */}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Stack spacing={2.5}>
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
                                                        size="small"
                                                        placeholder="Select attendee type"
                                                    />
                                                ) : (
                                                    <Typography variant="body1">
                                                        {guest.attendeeType || 'Not specified'}
                                                    </Typography>
                                                )}
                                            </Box>

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
                                                        size="small"
                                                        placeholder="Enter first name"
                                                    />
                                                ) : (
                                                    <Typography variant="body1">
                                                        {guest.firstName}
                                                    </Typography>
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
                                                        size="small"
                                                        placeholder="Enter last name"
                                                    />
                                                ) : (
                                                    <Typography variant="body1">
                                                        {guest.lastName}
                                                    </Typography>
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
                                                        size="small"
                                                        placeholder="Enter email"
                                                    />
                                                ) : (
                                                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                        {guest.email || 'Not specified'}
                                                    </Typography>
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
                                                        size="small"
                                                        placeholder="Enter job title"
                                                    />
                                                ) : (
                                                    <Typography variant="body1">
                                                        {guest.jobTitle || 'Not specified'}
                                                    </Typography>
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
                                                        size="small"
                                                        placeholder="Enter company"
                                                    />
                                                ) : (
                                                    <Typography variant="body1">
                                                        {guest.company || 'Not specified'}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Stack>
                                    </Box>

                                    {/* Right Column */}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Stack spacing={2.5}>
                                            {/* Tags */}
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                                    Tags
                                                </Typography>
                                                {isEditing ? (
                                                    availableTags.length > 0 ? (
                                                        <Autocomplete
                                                            multiple
                                                            options={availableTags}
                                                            getOptionLabel={(option) => option.name || option}
                                                            value={selectedTags}
                                                            onChange={handleTagChange}
                                                            renderTags={(value, getTagProps) =>
                                                                value.map((option, index) => {
                                                                    const tag = typeof option === 'string' 
                                                                        ? availableTags.find(t => t.name === option) || { name: option, color: '#1976d2' }
                                                                        : option;
                                                                    return (
                                                                        <Chip
                                                                            {...getTagProps({ index })}
                                                                            key={tag.name || index}
                                                                            label={tag.name || tag}
                                                                            sx={{
                                                                                backgroundColor: tag.color || '#1976d2',
                                                                                color: 'white',
                                                                                '& .MuiChip-deleteIcon': {
                                                                                    color: 'white !important'
                                                                                }
                                                                            }}
                                                                            icon={<LocalOffer sx={{ color: 'white !important', fontSize: 14 }} />}
                                                                        />
                                                                    );
                                                                })
                                                            }
                                                            renderInput={(params) => (
                                                                <TextField
                                                                    {...params}
                                                                    placeholder="Add tags"
                                                                    size="small"
                                                                />
                                                            )}
                                                        />
                                                    ) : (
                                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                            No tags available for this event
                                                        </Typography>
                                                    )
                                                ) : (
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                        {guest.tags && guest.tags.length > 0 ? (
                                                            guest.tags.map((tag, index) => (
                                                                <Chip
                                                                    key={tag._id || tag.name || index}
                                                                    label={tag.name}
                                                                    size="small"
                                                                    sx={{
                                                                        backgroundColor: tag.color || '#1976d2',
                                                                        color: 'white',
                                                                        fontSize: '0.75rem'
                                                                    }}
                                                                    icon={<LocalOffer sx={{ color: 'white !important', fontSize: 14 }} />}
                                                                />
                                                            ))
                                                        ) : (
                                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                                No tags assigned
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
                                                        size="small"
                                                        placeholder="Add any notes about this guest..."
                                                    />
                                                ) : (
                                                    <Typography variant="body1">
                                                        {guest.notes || 'No notes available'}
                                                    </Typography>
                                                )}
                                            </Box>

                                            {/* QR Code */}
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                                    QR Code
                                                </Typography>
                                                {isEditing ? (
                                                    <TextField
                                                        fullWidth
                                                        value={editedGuest.qrCodeData}
                                                        onChange={(e) => handleInputChange('qrCodeData', e.target.value)}
                                                        size="small"
                                                        placeholder="QR code data"
                                                    />
                                                ) : (
                                                    <Typography variant="body1">
                                                        {guest.qrCodeData || 'Not specified'}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Stack>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Additional Information */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'primary.main' }}>
                                    Gifts & Check-ins
                                </Typography>

                                {/* Gifts Table */}
                                {guest.eventCheckins && guest.eventCheckins.length > 0 ? (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                            Check-in Details
                                        </Typography>
                                        <Stack spacing={2}>
                                            {guest.eventCheckins.map((checkin, index) => (
                                                <Card key={index} variant="outlined" sx={{ p: 2 }}>
                                                    <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' } }}>
                                                        {/* Event Info */}
                                                        <Box sx={{ flex: '0 0 200px', minWidth: 0 }}>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                                {checkin.eventId?.eventName || 'Unknown Event'}
                                                            </Typography>
                                                            <Typography variant="caption" color="textSecondary">
                                                                {new Date(checkin.checkedInAt).toLocaleDateString()} at{' '}
                                                                {new Date(checkin.checkedInAt).toLocaleTimeString([], { 
                                                                    hour: '2-digit', 
                                                                    minute: '2-digit' 
                                                                })}
                                                            </Typography>
                                                        </Box>

                                                        {/* Gifts */}
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                                                                Gifts Received
                                                            </Typography>
                                                            {checkin.giftsReceived && checkin.giftsReceived.length > 0 ? (
                                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                                    {checkin.giftsReceived.map((gift, giftIndex) => (
                                                                        <Chip
                                                                            key={giftIndex}
                                                                            label={`${gift.inventoryId?.type || 'Unknown'} ${gift.inventoryId?.style ? `(${gift.inventoryId.style})` : ''} x${gift.quantity}`}
                                                                            size="small"
                                                                            variant="outlined"
                                                                            color="primary"
                                                                        />
                                                                    ))}
                                                                </Box>
                                                            ) : (
                                                                <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                                                                    No gifts selected
                                                                </Typography>
                                                            )}
                                                        </Box>

                                                        {/* Actions */}
                                                        <Box sx={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                            <Button
                                                                variant="contained"
                                                                color="primary"
                                                                size="small"
                                                                startIcon={<SwapHoriz />}
                                                                onClick={() => openGiftModificationDialog(checkin)}
                                                                sx={{ 
                                                                    minWidth: 'auto',
                                                                    fontWeight: 600,
                                                                    textTransform: 'none'
                                                                }}
                                                            >
                                                                Modify Gifts
                                                            </Button>
                                                            <Button
                                                                variant="outlined"
                                                                color="warning"
                                                                size="small"
                                                                startIcon={<Undo />}
                                                                onClick={() => openUndoDialog(checkin)}
                                                                sx={{ 
                                                                    minWidth: 'auto',
                                                                    fontWeight: 600,
                                                                    textTransform: 'none'
                                                                }}
                                                            >
                                                                Undo
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                </Card>
                                            ))}
                                        </Stack>
                                    </Box>
                                ) : (
                                    <Box sx={{ textAlign: 'center', py: 4 }}>
                                        <Star sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                        <Typography variant="h6" color="textSecondary">
                                            No Check-ins Yet
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            This guest hasn't been checked into any events
                                        </Typography>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Stack>

                    {/* Undo Check-in Dialog */}
                    <Dialog open={undoDialogOpen} onClose={() => {
                        setUndoDialogOpen(false);
                        setSelectedUndoReason('');
                        setCustomUndoReason('');
                        setUndoReason('');
                    }} maxWidth="sm" fullWidth>
                        <DialogTitle>Undo Check-in</DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Are you sure you want to undo the check-in for {selectedCheckin?.eventId?.eventName || 'this event'}? 
                                This will restore any distributed gifts to inventory.
                            </Typography>
                            
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Reason for undoing check-in</InputLabel>
                                <Select
                                    value={selectedUndoReason}
                                    onChange={(e) => setSelectedUndoReason(e.target.value)}
                                    label="Reason for undoing check-in"
                                >
                                    {UNDO_REASONS.map((reason) => (
                                        <MenuItem key={reason.value} value={reason.value}>
                                            {reason.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            
                            {selectedUndoReason === 'other' && (
                                <TextField
                                    fullWidth
                                    label="Please specify the reason"
                                    value={customUndoReason}
                                    onChange={(e) => setCustomUndoReason(e.target.value)}
                                    multiline
                                    rows={2}
                                    placeholder="Enter the specific reason..."
                                    required
                                />
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => {
                                setUndoDialogOpen(false);
                                setSelectedUndoReason('');
                                setCustomUndoReason('');
                                setUndoReason('');
                            }} disabled={undoLoading}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleUndoCheckin} 
                                color="warning" 
                                variant="contained"
                                disabled={undoLoading || !selectedUndoReason || (selectedUndoReason === 'other' && !customUndoReason.trim())}
                                startIcon={undoLoading ? <CircularProgress size={20} /> : <Undo />}
                            >
                                {undoLoading ? 'Undoing...' : 'Undo Check-in'}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Gift Modification Dialog */}
                    <Dialog 
                        open={giftModificationDialogOpen} 
                        onClose={() => setGiftModificationDialogOpen(false)} 
                        maxWidth="md" 
                        fullWidth
                    >
                        <DialogTitle>Modify Gifts for {selectedCheckin?.eventId?.eventName || 'Event'}</DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Modify the gifts distributed to this guest. Changes will be reflected in inventory.
                            </Typography>
                            
                            <Typography variant="body2" sx={{ mb: 2, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                                💡 <strong>Note:</strong> When modifying gifts, the system first restores the original gifts to inventory, then distributes the new gifts. Items showing "Out of Stock" may become available after the original gifts are restored.
                            </Typography>
                            
                            <TextField
                                fullWidth
                                label="Reason for modification"
                                value={giftModificationReason}
                                onChange={(e) => setGiftModificationReason(e.target.value)}
                                multiline
                                rows={2}
                                placeholder="Enter a reason for modifying gifts..."
                                sx={{ mb: 3 }}
                                required
                            />

                            <Typography variant="subtitle2" sx={{ mb: 2 }}>
                                Gifts ({modifiedGifts.length})
                            </Typography>

                            {modifiedGifts.length > 0 ? (
                                <List>
                                    {modifiedGifts.map((gift, index) => (
                                        <ListItem key={index} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                        <FormControl size="small" sx={{ minWidth: 200 }}>
                                                            <InputLabel>Gift</InputLabel>
                                                            <Select
                                                                value={gift.inventoryId}
                                                                onChange={(e) => updateGift(index, 'inventoryId', e.target.value)}
                                                                label="Gift"
                                                            >
                                                                {(Array.isArray(availableInventory) ? availableInventory : []).map((item) => (
                                                                    <MenuItem key={item._id} value={item._id}>
                                                                        {item.type} - {item.style} ({item.size})
                                                                    </MenuItem>
                                                                ))}
                                                            </Select>
                                                        </FormControl>
                                                        <TextField
                                                            type="number"
                                                            label="Quantity"
                                                            value={gift.quantity}
                                                            onChange={(e) => updateGift(index, 'quantity', parseInt(e.target.value) || 1)}
                                                            size="small"
                                                            sx={{ width: 100 }}
                                                            inputProps={{ min: 1 }}
                                                        />
                                                    </Box>
                                                }
                                            />
                                            <ListItemSecondaryAction>
                                                <IconButton 
                                                    edge="end" 
                                                    onClick={() => removeGift(index)}
                                                    color="error"
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                                    No gifts to modify. Click "Add Gift" to add new gifts.
                                </Typography>
                            )}

                            <Button 
                                onClick={addGift} 
                                variant="outlined" 
                                startIcon={<Add />}
                                sx={{ mt: 2 }}
                            >
                                Add Gift
                            </Button>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setGiftModificationDialogOpen(false)} disabled={giftModificationLoading}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleModifyGifts} 
                                color="primary" 
                                variant="contained"
                                disabled={giftModificationLoading || !giftModificationReason.trim()}
                                startIcon={giftModificationLoading ? <CircularProgress size={20} /> : <SwapHoriz />}
                            >
                                {giftModificationLoading ? 'Updating...' : 'Update Gifts'}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Box>
            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => !deleting && setDeleteDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Delete Guest</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete {guest?.firstName} {guest?.lastName}? This action cannot be undone.
                    </Typography>
                    {guest?.email && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Email: {guest.email}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteGuest}
                        color="error"
                        variant="contained"
                        disabled={deleting}
                        startIcon={deleting ? <CircularProgress size={20} /> : <Delete />}
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </MainLayout>
    );
}