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
    ListItemSecondaryAction
    // Autocomplete, (disabled - no backend endpoint)
    // FormHelperText (disabled - no backend endpoint)
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
    Add
    // LocalOffer (disabled - no backend endpoint)
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api, { undoCheckin, updateCheckinGifts } from '../../services/api';
import MainLayout from '../layout/MainLayout';

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
    
    // Tag management states - DISABLED (no backend endpoint)
    // const [availableTags, setAvailableTags] = useState([]);
    // const [selectedTags, setSelectedTags] = useState([]);
    // const [tagLoading, setTagLoading] = useState(false);
    
    // Undo and gift modification states
    const [undoDialogOpen, setUndoDialogOpen] = useState(false);
    const [giftModificationDialogOpen, setGiftModificationDialogOpen] = useState(false);
    const [selectedCheckin, setSelectedCheckin] = useState(null);
    const [undoReason, setUndoReason] = useState('');
    const [giftModificationReason, setGiftModificationReason] = useState('');
    const [availableInventory, setAvailableInventory] = useState([]);
    const [modifiedGifts, setModifiedGifts] = useState([]);
    const [undoLoading, setUndoLoading] = useState(false);
    const [giftModificationLoading, setGiftModificationLoading] = useState(false);

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
                
                // Set initial tags - DISABLED (no backend endpoint)
                // setSelectedTags(guestData.tags || []);
                
                // Fetch event details
                if (eventId) {
                    try {
                        const eventResponse = await api.get(`/events/${eventId}`);
                        setEvent(eventResponse.data);
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

    // Tag change handler - DISABLED (no backend endpoint)
    // const handleTagChange = (event, newValue) => {
    //     setSelectedTags(newValue);
    // };

    const handleSave = async () => {
        try {
            setSaving(true);
            // Save guest data (tags disabled - no backend endpoint)
            const response = await api.put(`/guests/${guestId}`, editedGuest);
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
            notes: guest?.notes || ''
        });
        // Tags disabled - no backend endpoint
        // setSelectedTags(guest?.tags || []);
        setIsEditing(false);
    };

    const handleBackToGuestList = () => {
        navigate(`/events/${eventId}`);
    };

    const handleUndoCheckin = async () => {
        if (!selectedCheckin) return;
        
        try {
            setUndoLoading(true);
            // Use the imported undoCheckin function
            await undoCheckin(selectedCheckin._id, undoReason);
            
            // Refresh guest data to reflect the deleted check-in
            const guestResponse = await api.get(`/guests/${guestId}`);
            setGuest(guestResponse.data);
            
            setUndoDialogOpen(false);
            setUndoReason('');
            setSelectedCheckin(null);
            setError(''); // Clear any previous errors
        } catch (err) {
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
            // Use the imported updateCheckinGifts function
            await updateCheckinGifts(selectedCheckin._id, modifiedGifts, giftModificationReason);
            
            // Refresh guest data
            const guestResponse = await api.get(`/guests/${guestId}`);
            setGuest(guestResponse.data);
            
            setGiftModificationDialogOpen(false);
            setGiftModificationReason('');
            setSelectedCheckin(null);
            setModifiedGifts([]);
            setError(''); // Clear any previous errors
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update gifts');
        } finally {
            setGiftModificationLoading(false);
        }
    };

    const openUndoDialog = (checkin) => {
        console.log('Opening undo dialog for checkin:', checkin); // DEBUG
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
            setAvailableInventory(inventoryResponse.data || []);
            
            // Initialize modified gifts with current gifts
            setModifiedGifts(checkin.giftsReceived.map(gift => ({
                inventoryId: gift.inventoryId._id || gift.inventoryId,
                quantity: gift.quantity || 1,
                notes: gift.notes || ''
            })));
            
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
                            eventName: checkin.eventId?.eventName || 'Unknown Event',
                            checkin: checkin
                        });
                    }
                });
            }
        });
        
        return gifts;
    };

    const giftSelections = getGiftSelections();

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

                                <Grid container spacing={3}>
                                    {/* Name */}
                                    <Grid item xs={12} md={6}>
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                                Full Name
                                            </Typography>
                                            {isEditing ? (
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <TextField
                                                        fullWidth
                                                        label="First Name"
                                                        value={editedGuest.firstName}
                                                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                                                        size="small"
                                                    />
                                                    <TextField
                                                        fullWidth
                                                        label="Last Name"
                                                        value={editedGuest.lastName}
                                                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                                                        size="small"
                                                    />
                                                </Box>
                                            ) : (
                                                <Typography variant="body1">
                                                    {guest.firstName} {guest.lastName}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Grid>

                                    {/* Email */}
                                    <Grid item xs={12} md={6}>
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
                                                />
                                            ) : (
                                                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                    {guest.email}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Grid>

                                    {/* Job Title */}
                                    <Grid item xs={12} md={4}>
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
                                                />
                                            ) : (
                                                <Typography variant="body1">
                                                    {guest.jobTitle || 'Not specified'}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Grid>

                                    {/* Company */}
                                    <Grid item xs={12} md={4}>
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
                                                />
                                            ) : (
                                                <Typography variant="body1">
                                                    {guest.company || 'Not specified'}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Grid>

                                    {/* Attendee Type */}
                                    <Grid item xs={12} md={4}>
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
                                                />
                                            ) : (
                                                <Typography variant="body1">
                                                    {guest.attendeeType || 'Not specified'}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Grid>

                                    {/* Tags - DISABLED (no backend endpoint) */}
                                    {/* 
                                    <Grid item xs={12}>
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                                Tags
                                            </Typography>
                                            {isEditing ? (
                                                <Autocomplete
                                                    multiple
                                                    options={availableTags}
                                                    getOptionLabel={(option) => option.name}
                                                    value={selectedTags}
                                                    onChange={handleTagChange}
                                                    renderTags={(value, getTagProps) =>
                                                        value.map((option, index) => (
                                                            <Chip
                                                                variant="outlined"
                                                                label={option.name}
                                                                {...getTagProps({ index })}
                                                                key={option._id || index}
                                                                sx={{
                                                                    backgroundColor: option.color,
                                                                    color: 'white',
                                                                    '& .MuiChip-deleteIcon': {
                                                                        color: 'white !important'
                                                                    }
                                                                }}
                                                            />
                                                        ))
                                                    }
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            placeholder="Select tags"
                                                            size="small"
                                                        />
                                                    )}
                                                />
                                            ) : (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                    {guest.tags && guest.tags.length > 0 ? (
                                                        guest.tags.map((tag, index) => (
                                                            <Chip
                                                                key={tag._id || index}
                                                                label={tag.name}
                                                                size="small"
                                                                sx={{
                                                                    backgroundColor: tag.color,
                                                                    color: 'white',
                                                                    fontSize: '0.75rem'
                                                                }}
                                                                icon={<LocalOffer sx={{ fontSize: 14 }} />}
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
                                    </Grid>
                                    */}
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* Additional Information */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'primary.main' }}>
                                    Additional Information
                                </Typography>

                                <Grid container spacing={3}>
                                    {/* Notes */}
                                    <Grid item xs={12} md={6}>
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
                                    </Grid>

                                    {/* Check-in Status */}
                                    <Grid item xs={12} md={6}>
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                                Check-in Status
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {guest.hasCheckedIn ? (
                                                    <>
                                                        <CheckCircle sx={{ color: 'success.main' }} />
                                                        <Typography variant="body1" sx={{ color: 'success.main', fontWeight: 500 }}>
                                                            Checked In
                                                        </Typography>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Star sx={{ color: 'warning.main' }} />
                                                        <Typography variant="body1" sx={{ color: 'warning.main', fontWeight: 500 }}>
                                                            Not Checked In
                                                        </Typography>
                                                    </>
                                                )}
                                            </Box>
                                        </Box>
                                    </Grid>

                                    {/* Gift Selections */}
                                    <Grid item xs={12}>
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                                Gift Selections ({giftSelections.length})
                                            </Typography>
                                            {giftSelections.length > 0 ? (
                                                <Stack spacing={1}>
                                                    {giftSelections.map((gift, index) => (
                                                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Chip
                                                                label={`${gift.eventName} - ${gift.name} (x${gift.quantity})`}
                                                                size="small"
                                                                variant="outlined"
                                                                color="primary"
                                                            />
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => openGiftModificationDialog(gift.checkin)}
                                                                title="Modify gifts"
                                                            >
                                                                <SwapHoriz fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    ))}
                                                </Stack>
                                            ) : (
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    No gift selections recorded
                                                </Typography>
                                            )}
                                        </Box>

                                        {/* Check-in Actions */}
                                        {guest.hasCheckedIn && guest.eventCheckins.length > 0 && (
                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                                    Check-in Actions
                                                </Typography>
                                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                                    {guest.eventCheckins.map((checkin, index) => (
                                                        <Button
                                                            key={index}
                                                            variant="outlined"
                                                            color="warning"
                                                            size="small"
                                                            startIcon={<Undo />}
                                                            onClick={() => openUndoDialog(checkin)}
                                                        >
                                                            Undo {checkin.eventId?.eventName || 'Check-in'}
                                                        </Button>
                                                    ))}
                                                </Stack>
                                            </Box>
                                        )}
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Stack>

                    {/* Undo Check-in Dialog */}
                    <Dialog open={undoDialogOpen} onClose={() => setUndoDialogOpen(false)} maxWidth="sm" fullWidth>
                        <DialogTitle>Undo Check-in</DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Are you sure you want to undo the check-in for {selectedCheckin?.eventId?.eventName || 'this event'}? 
                                This will restore any distributed gifts to inventory.
                            </Typography>
                            <TextField
                                fullWidth
                                label="Reason for undoing check-in"
                                value={undoReason}
                                onChange={(e) => setUndoReason(e.target.value)}
                                multiline
                                rows={3}
                                placeholder="Enter a reason for undoing this check-in..."
                                required
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setUndoDialogOpen(false)} disabled={undoLoading}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleUndoCheckin} 
                                color="warning" 
                                variant="contained"
                                disabled={undoLoading || !undoReason.trim()}
                                startIcon={undoLoading ? <CircularProgress size={20} /> : <Undo />}
                            >
                                {undoLoading ? 'Undoing...' : 'Undo Check-in'}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Gift Modification Dialog */}
                    <Dialog open={giftModificationDialogOpen} onClose={() => setGiftModificationDialogOpen(false)} maxWidth="md" fullWidth>
                        <DialogTitle>Modify Gifts for {selectedCheckin?.eventId?.eventName || 'Event'}</DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Modify the gifts distributed to this guest. Changes will be reflected in inventory.
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
                                                            {availableInventory.map((item) => (
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
        </MainLayout>
    );
}