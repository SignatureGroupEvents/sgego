import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TableSortLabel,
  Autocomplete,
  IconButton,
  Alert,
  CircularProgress,
  Box as MuiBox,
  Checkbox
} from '@mui/material';
import {
  CheckCircleOutline as CheckCircleIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  AccountTree as InheritedIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  LocalOffer as LocalOfferIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import GuestCheckIn from './GuestCheckIn';
import { useNavigate, useParams } from 'react-router-dom';
import api, { deleteGuest, bulkDeleteGuests } from '../../services/api';
import toast from 'react-hot-toast';

const GuestTable = ({ guests, onUploadGuests, event, onInventoryChange, onCheckInSuccess, inventory = [], onGuestsChange }) => {
  const [checkInGuest, setCheckInGuest] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { isOperationsManager, isAdmin } = usePermissions();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { guestId } = useParams();
  
  // Mass delete state
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Tag management state
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#1976d2');
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagDescription, setTagDescription] = useState('');
  const [savingTag, setSavingTag] = useState(false);
  const [tagError, setTagError] = useState('');
  const [availableTags, setAvailableTags] = useState(event?.availableTags || []);
  
  // Determine permissions
  const canModifyEvents = isOperationsManager || isAdmin;
  const canPerformCheckins = isOperationsManager || isAdmin || currentUser?.role === 'staff';
  
  const presetColors = [
    '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
    '#0288d1', '#c2185b', '#00796b', '#e64a19', '#5d4037',
    '#455a64', '#303f9f', '#512da8'
  ];

  // Get all unique tags for filter dropdown (from available tags, not just guest tags)
  const allTags = useMemo(() => {
    const tagSet = new Set();
    availableTags.forEach(tag => tagSet.add(tag.name));
    guests.forEach(guest => {
      guest.tags?.forEach(tag => tagSet.add(tag.name));
    });
    return Array.from(tagSet).sort();
  }, [guests, availableTags]);
  
  // Update available tags when event changes
  React.useEffect(() => {
    if (event?.availableTags) {
      setAvailableTags(event.availableTags);
    }
  }, [event?.availableTags]);

  // Get all unique attendee types for filter dropdown
  const attendeeTypes = useMemo(() => {
    const typeSet = new Set();
    guests.forEach(guest => {
      if (guest.attendeeType) typeSet.add(guest.attendeeType);
    });
    return Array.from(typeSet).sort();
  }, [guests]);

  const handleOpenCheckIn = (guest, event) => {
    event.stopPropagation();
    setCheckInGuest(guest);
    setModalOpen(true);
  };
  
  const handleCloseCheckIn = () => {
    setCheckInGuest(null);
    setModalOpen(false);
  };
  
  // Mass delete handlers
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const currentPageGuests = filteredAndSortedGuests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
      setSelectedGuests(prev => {
        const newSelected = [...prev];
        currentPageGuests.forEach(guest => {
          if (!newSelected.find(g => g._id === guest._id)) {
            newSelected.push(guest);
          }
        });
        return newSelected;
      });
    } else {
      const currentPageGuests = filteredAndSortedGuests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
      setSelectedGuests(prev => prev.filter(g => !currentPageGuests.find(cg => cg._id === g._id)));
    }
  };
  
  const handleSelectGuest = (guest, isSelected) => {
    if (isSelected) {
      setSelectedGuests(prev => [...prev, guest]);
    } else {
      setSelectedGuests(prev => prev.filter(g => g._id !== guest._id));
    }
  };
  
  const isGuestSelected = (guest) => {
    return selectedGuests.some(g => g._id === guest._id);
  };
  
  const isAllPageSelected = () => {
    const currentPageGuests = filteredAndSortedGuests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    return currentPageGuests.length > 0 && currentPageGuests.every(guest => isGuestSelected(guest));
  };
  
  const isIndeterminate = () => {
    const currentPageGuests = filteredAndSortedGuests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const selectedCount = currentPageGuests.filter(guest => isGuestSelected(guest)).length;
    return selectedCount > 0 && selectedCount < currentPageGuests.length;
  };
  
  const handleMassDelete = async () => {
    if (selectedGuests.length === 0) return;
    
    setDeleting(true);
    try {
      const guestIds = selectedGuests.map(g => g._id);
      await bulkDeleteGuests(event._id, guestIds);
      
      toast.success(`Successfully deleted ${selectedGuests.length} guest(s)`);
      setSelectedGuests([]);
      setDeleteDialogOpen(false);
      
      // Refresh guests list
      if (onGuestsChange) {
        onGuestsChange();
      } else {
        // Fallback: reload the page or refetch
        window.location.reload();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete guests');
    } finally {
      setDeleting(false);
    }
  };
  
  // Tag management handlers
  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      setTagError('Tag name is required');
      return;
    }
    
    // Check for duplicate names
    const existingTag = availableTags.find(
      t => t.name.toLowerCase() === newTagName.trim().toLowerCase()
    );
    if (existingTag) {
      setTagError('A tag with this name already exists');
      return;
    }
    
    setSavingTag(true);
    setTagError('');
    
    try {
      const updatedTags = [...availableTags, {
        name: newTagName.trim(),
        color: newTagColor,
        description: tagDescription.trim()
      }];
      
      const response = await api.put(`/events/${event._id}`, {
        availableTags: updatedTags
      });
      
      setAvailableTags(updatedTags);
      setNewTagName('');
      setNewTagColor('#1976d2');
      setTagDescription('');
      setTagDialogOpen(false);
      
      // Update event if there's an onEventUpdate callback
      if (event && typeof event === 'object') {
        // Event will be updated by parent component
      }
      
      toast.success('Tag created successfully');
    } catch (err) {
      setTagError(err.response?.data?.message || 'Failed to create tag');
      toast.error(err.response?.data?.message || 'Failed to create tag');
    } finally {
      setSavingTag(false);
    }
  };
  
  const handleEditTag = (tag) => {
    setEditingTag(tag);
    setNewTagName(tag.name || '');
    setNewTagColor(tag.color || '#1976d2');
    setTagDescription(tag.description || '');
    setTagError('');
    setTagDialogOpen(true);
  };
  
  const handleUpdateTag = async () => {
    if (!newTagName.trim()) {
      setTagError('Tag name is required');
      return;
    }
    
    // Check for duplicate names (excluding the tag being edited)
    const existingTag = availableTags.find(
      t => t.name.toLowerCase() === newTagName.trim().toLowerCase() && 
      (editingTag && (t._id !== editingTag._id && t.name !== editingTag.name))
    );
    if (existingTag) {
      setTagError('A tag with this name already exists');
      return;
    }
    
    setSavingTag(true);
    setTagError('');
    
    try {
      const updatedTags = availableTags.map(t => {
        if ((t._id && t._id === editingTag._id) || (!t._id && t.name === editingTag.name)) {
          return {
            ...t,
            name: newTagName.trim(),
            color: newTagColor,
            description: tagDescription.trim()
          };
        }
        return t;
      });
      
      const response = await api.put(`/events/${event._id}`, {
        availableTags: updatedTags
      });
      
      setAvailableTags(updatedTags);
      setEditingTag(null);
      setNewTagName('');
      setNewTagColor('#1976d2');
      setTagDescription('');
      setTagDialogOpen(false);
      
      toast.success('Tag updated successfully');
    } catch (err) {
      setTagError(err.response?.data?.message || 'Failed to update tag');
      toast.error(err.response?.data?.message || 'Failed to update tag');
    } finally {
      setSavingTag(false);
    }
  };
  
  const handleDeleteTag = async (tagToDelete) => {
    if (!window.confirm(`Are you sure you want to delete the tag "${tagToDelete.name}"? This will remove it from all guests that have this tag.`)) {
      return;
    }
    
    try {
      const updatedTags = availableTags.filter(t => 
        (t._id && t._id !== tagToDelete._id) || 
        (!t._id && t.name !== tagToDelete.name)
      );
      
      const response = await api.put(`/events/${event._id}`, {
        availableTags: updatedTags
      });
      
      setAvailableTags(updatedTags);
      toast.success('Tag deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete tag');
    }
  };
  
  const handleOpenTagDialog = () => {
    // If we already have a tag name from the input, keep it
    if (!newTagName.trim()) {
      setNewTagName('');
    }
    setEditingTag(null);
    if (!newTagName.trim()) {
      setNewTagColor('#1976d2');
      setTagDescription('');
    }
    setTagError('');
    setTagDialogOpen(true);
  };
  
  const handleCloseTagDialog = () => {
    setTagDialogOpen(false);
    setEditingTag(null);
    setNewTagName('');
    setNewTagColor('#1976d2');
    setTagDescription('');
    setTagError('');
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (column) => {
    const isAsc = sortBy === column && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(column);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setTagFilter([]);
    setSortBy('name');
    setSortOrder('asc');
    setPage(0);
  };

  // Export CSV function
  const exportToCSV = () => {
    const eventsToDisplay = getEventsToDisplay();
    
    // Create CSV headers
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Job Title',
      'Attendee Type',
      'Status',
      'Tags',
      'Source',
      ...eventsToDisplay.map(ev => `${ev.eventName} - Gift Selection`)
    ];
    
    // Create CSV data rows
    const csvData = guests.map(guest => {
      const checkInStatus = getGuestCheckInStatus(guest);
      const isInherited = guest.isInherited;
      
      const row = [
        guest.firstName || '',
        guest.lastName || '',
        guest.email || '',
        guest.jobTitle || '',
        guest.attendeeType || 'General',
        checkInStatus.label,
        guest.tags?.map(tag => tag.name).join('; ') || '',
        isInherited ? `${guest.originalEventName || 'Main Event'}` : 'Direct',
        ...eventsToDisplay.map(ev => formatGiftSelections(guest, ev._id, ev.eventName))
      ];
      
      return row;
    });
    
    // Combine headers and data
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `guests_export_${event?.eventName || 'event'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get gift selections for each event
  const getGiftSelectionsForEvent = (guest, eventId) => {
    const checkin = guest.eventCheckins?.find(ec => {
      // Handle both populated and unpopulated eventId
      let checkinEventId;
      if (ec.eventId && typeof ec.eventId === 'object') {
        // Populated eventId object - use _id property
        checkinEventId = ec.eventId._id || ec.eventId.toString();
      } else {
        // Unpopulated eventId string
        checkinEventId = ec.eventId;
      }
      
      return checkinEventId?.toString() === eventId?.toString();
    });
    
    return checkin?.giftsReceived || [];
  };

  // Calculate comprehensive check-in status for a guest
  const getGuestCheckInStatus = (guest) => {
    const eventsToCheck = getEventsToDisplay();
    
    let totalEvents = eventsToCheck.length;
    let checkedInEvents = 0;
    
    eventsToCheck.forEach(ev => {
      const gifts = getGiftSelectionsForEvent(guest, ev._id);
      if (gifts.length > 0) {
        checkedInEvents++;
      }
    });
    
    if (checkedInEvents === 0) {
      return {
        status: 'not-checked-in',
        label: 'Not Picked Up',
        color: 'default', // Grey
        icon: PersonIcon
      };
    } else if (checkedInEvents < totalEvents) {
      return {
        status: 'partially-checked-in',
        label: 'Partially Picked Up',
        color: 'warning', // Orange
        icon: PersonIcon
      };
    } else {
      return {
        status: 'fully-checked-in',
        label: 'Fully Picked Up',
        color: 'info', // Blue
        icon: CheckCircleIcon
      };
    }
  };

  // Determine check-in button state for a guest
  const getCheckInButtonState = (guest) => {
    if (event?.isMainEvent) {
      // Main event view - check if there are any pending gifts across all events
      const eventsToCheck = getEventsToDisplay();
      let hasPendingGifts = false;
      
      eventsToCheck.forEach(ev => {
        const gifts = getGiftSelectionsForEvent(guest, ev._id);
        if (gifts.length === 0) {
          hasPendingGifts = true;
        }
      });
      
      if (hasPendingGifts) {
        return {
          active: true,
          label: 'Pick Up',
          variant: 'contained',
          color: 'success'
        };
      } else {
        return {
          active: false,
          label: 'Fully Picked Up',
          variant: 'outlined',
          color: 'info'
        };
      }
    } else {
      // Secondary event view - check only this specific event
      const gifts = getGiftSelectionsForEvent(guest, event._id);
      
      if (gifts.length === 0) {
        return {
          active: true,
          label: 'Pick Up',
          variant: 'contained',
          color: 'success'
        };
      } else {
        return {
          active: false,
          label: 'Picked Up',
          variant: 'outlined',
          color: 'success'
        };
      }
    }
  };

  // Determine which events to show based on current view
  const getEventsToDisplay = () => {
    if (event?.isMainEvent) {
      // Main event view: only show secondary events if they exist, otherwise show main event
      const secondaryEvents = event?.secondaryEvents || [];
      return secondaryEvents.length > 0 ? secondaryEvents : [event];
    } else {
      // Secondary event view: show only this event
      return [event];
    }
  };

  // Format gift selections for display
  const formatGiftSelections = (guest, eventId, eventName) => {
    const gifts = getGiftSelectionsForEvent(guest, eventId);
    
    if (gifts.length === 0) {
      return `No gift selected`;
    }
    
    const giftDetails = gifts.map(gift => {
      // Handle both populated and unpopulated inventory items
      let inventoryItem;
      if (gift.inventoryId && typeof gift.inventoryId === 'object') {
        // Populated inventory item
        inventoryItem = gift.inventoryId;
      } else {
        // Unpopulated inventory item, find in inventory array
        inventoryItem = inventory.find(item => item._id === gift.inventoryId);
      }
      
      if (inventoryItem) {
        return `${inventoryItem.type}${inventoryItem.style ? ` (${inventoryItem.style})` : ''}${gift.quantity > 1 ? ` x${gift.quantity}` : ''}`;
      }
      return 'Unknown gift';
    }).join(', ');
    
    return giftDetails;
  };

  // Filter and sort guests
  const filteredAndSortedGuests = useMemo(() => {
    let filtered = guests.filter(guest => {
      // Search filter
      const searchMatch = searchQuery === '' || 
        `${guest.firstName} ${guest.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const statusMatch = statusFilter === 'all' || (() => {
        const guestStatus = getGuestCheckInStatus(guest);
        switch (statusFilter) {
          case 'not-picked-up':
            return guestStatus.status === 'not-checked-in';
          case 'partially-picked-up':
            return guestStatus.status === 'partially-checked-in';
          case 'fully-picked-up':
            return guestStatus.status === 'fully-checked-in';
          // Legacy support for old filter values
          case 'not-checked-in':
            return guestStatus.status === 'not-checked-in';
          case 'partially-checked-in':
            return guestStatus.status === 'partially-checked-in';
          case 'fully-checked-in':
            return guestStatus.status === 'fully-checked-in';
          case 'checked-in':
            return guestStatus.status === 'fully-checked-in';
          case 'pending':
            return guestStatus.status === 'not-checked-in';
          default:
            return true;
        }
      })();

      // Type filter
      const typeMatch = typeFilter === 'all' || 
        (guest.attendeeType || 'General') === typeFilter;

      // Tag filter
      const tagMatch = tagFilter.length === 0 || 
        tagFilter.some(filterTag => 
          guest.tags?.some(guestTag => guestTag.name === filterTag)
        );

      return searchMatch && statusMatch && typeMatch && tagMatch;
    });

    // Sort guests
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'type':
          aValue = (a.attendeeType || 'General').toLowerCase();
          bValue = (b.attendeeType || 'General').toLowerCase();
          break;
        case 'status':
          const aStatus = getGuestCheckInStatus(a);
          const bStatus = getGuestCheckInStatus(b);
          // Sort order: not-checked-in, partially-checked-in, fully-checked-in
          const statusOrder = { 'not-checked-in': 0, 'partially-checked-in': 1, 'fully-checked-in': 2 };
          aValue = statusOrder[aStatus.status] || 0;
          bValue = statusOrder[bStatus.status] || 0;
          break;
        default:
          aValue = a[sortBy] || '';
          bValue = b[sortBy] || '';
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [guests, searchQuery, statusFilter, typeFilter, tagFilter, sortBy, sortOrder]);

  if (guests.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <GroupsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No guests added yet
          </Typography>
          <Typography color="textSecondary" paragraph>
            Get started by uploading a guest list.
          </Typography>
          <Box display="flex" gap={2} justifyContent="center">
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={onUploadGuests}
            >
              Upload CSV/Excel
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const eventsToDisplay = getEventsToDisplay();

  return (
    <>
      <Card>
        <CardContent>
          {/* Header with title and actions */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h6">
                Guest List ({filteredAndSortedGuests.length} of {guests.length})
              </Typography>
              {canModifyEvents && selectedGuests.length > 0 && (
                <Chip
                  label={`${selectedGuests.length} selected`}
                  color="primary"
                  onDelete={() => setSelectedGuests([])}
                  deleteIcon={<ClearIcon />}
                />
              )}
            </Box>
            <Box display="flex" gap={2}>
              {canModifyEvents && selectedGuests.length > 0 && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Selected ({selectedGuests.length})
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={exportToCSV}
              >
                Export CSV File
              </Button>
            </Box>
          </Box>
        </CardContent>

          {/* Search and Filter Controls */}
          <Box 
            mb={3} 
            sx={{ 
              width: '100%',
              px: 3, // Match CardContent default padding (theme.spacing(3) = 24px)
              boxSizing: 'border-box'
            }}
          >
            <Box 
              sx={{ 
                display: 'flex',
                gap: 1.5,
                width: '100%',
                flexWrap: { xs: 'wrap', md: 'nowrap' },
                alignItems: 'flex-start'
              }}
            >
              {/* Search Bar */}
              <Box sx={{ flex: '0 0 20%', minWidth: 0 }}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                    Search
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search guests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{
                      '& .MuiInputBase-root': {
                        minWidth: 0
                      },
                      '& .MuiInputLabel-root': {
                        display: 'none'
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery && (
                        <InputAdornment position="end">
                          <Button
                            size="small"
                            onClick={() => setSearchQuery('')}
                            sx={{ minWidth: 'auto', p: 0.5 }}
                          >
                            <ClearIcon fontSize="small" />
                          </Button>
                        </InputAdornment>
                      )
                    }}
                  />
                </Box>
              </Box>

              {/* Status Filter */}
              <Box sx={{ flex: '0 0 18%', minWidth: 0 }}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                    Status
                  </Typography>
                  <FormControl fullWidth size="small" sx={{ minWidth: 0 }}>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 300
                          }
                        }
                      }}
                      sx={{
                        '& .MuiInputLabel-root': {
                          display: 'none'
                        }
                      }}
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="not-picked-up">Not Picked Up</MenuItem>
                      <MenuItem value="partially-picked-up">Partially Picked Up</MenuItem>
                      <MenuItem value="fully-picked-up">Fully Picked Up</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* Type Filter */}
              <Box sx={{ flex: '0 0 18%', minWidth: 0 }}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                    Type
                  </Typography>
                  <FormControl fullWidth size="small" sx={{ minWidth: 0 }}>
                    <Select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 300
                          }
                        }
                      }}
                      sx={{
                        '& .MuiInputLabel-root': {
                          display: 'none'
                        }
                      }}
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="General">General</MenuItem>
                      {attendeeTypes.map(type => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* Tag Filter */}
              <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                    Tags
                  </Typography>
                  <Autocomplete
                    multiple
                    size="small"
                    options={canModifyEvents ? [...allTags, '__CREATE_TAG__'] : allTags}
                    sx={{
                      '& .MuiAutocomplete-inputRoot': {
                        padding: '8px 12px',
                        minWidth: 0
                      },
                      '& .MuiAutocomplete-tag': {
                        maxWidth: 'calc(100% - 8px)',
                        '& .MuiChip-label': {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }
                      }
                    }}
                    value={tagFilter}
                    onChange={(event, newValue) => {
                      // Check if the create tag option was selected
                      if (newValue.includes('__CREATE_TAG__')) {
                        // Remove the create tag option from selection
                        const filtered = newValue.filter(v => v !== '__CREATE_TAG__');
                        setTagFilter(filtered);
                        // Open the create tag dialog
                        setNewTagName('');
                        handleOpenTagDialog();
                      } else {
                        setTagFilter(newValue);
                      }
                    }}
                    getOptionLabel={(option) => {
                      if (option === '__CREATE_TAG__') return '+ Create Tag';
                      return option;
                    }}
                    renderOption={(props, option) => {
                      if (option === '__CREATE_TAG__') {
                        return (
                          <Box
                            {...props}
                            key="__CREATE_TAG__"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              py: 1,
                              px: 2,
                              borderTop: '1px solid',
                              borderColor: 'divider',
                              mt: 1,
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'action.hover'
                              }
                            }}
                          >
                            <AddIcon fontSize="small" color="primary" />
                            <Typography variant="body2" color="primary">
                              + Create Tag
                            </Typography>
                          </Box>
                        );
                      }
                      
                      // Find the tag object to get its color
                      const tagObj = availableTags.find(t => t.name === option);
                      const tagColor = tagObj?.color || '#1976d2';
                      
                      return (
                        <Box
                          {...props}
                          key={option}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            py: 0.5,
                            px: 1
                          }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: tagColor,
                              flexShrink: 0
                            }}
                          />
                          <Typography variant="body2">{option}</Typography>
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        placeholder=""
                        InputProps={{
                          ...params.InputProps,
                          style: { paddingTop: '8px', paddingBottom: '8px' }
                        }}
                        inputProps={{
                          ...params.inputProps,
                          style: { 
                            padding: 0,
                            margin: 0
                          }
                        }}
                        sx={{
                          '& .MuiInputLabel-root': {
                            display: 'none'
                          }
                        }}
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        if (option === '__CREATE_TAG__') return null;
                        const tagObj = availableTags.find(t => t.name === option);
                        const tagColor = tagObj?.color || '#1976d2';
                        return (
                          <Chip
                            {...getTagProps({ index })}
                            key={option}
                            label={option}
                            size="small"
                            sx={{ 
                              borderRadius: 1, 
                              fontSize: '0.75rem',
                              backgroundColor: tagColor,
                              color: 'white',
                              '& .MuiChip-deleteIcon': {
                                color: 'white !important'
                              }
                            }}
                          />
                        );
                      })
                    }
                    isOptionEqualToValue={(option, value) => {
                      if (option === '__CREATE_TAG__' || value === '__CREATE_TAG__') {
                        return false;
                      }
                      return option === value;
                    }}
                    filterOptions={(options, params) => {
                      // Filter out __CREATE_TAG__ from regular filtering
                      const filtered = options.filter(option => {
                        if (option === '__CREATE_TAG__') return true;
                        return option.toLowerCase().includes(params.inputValue.toLowerCase());
                      });
                      
                      // Always show create tag option at the bottom if user can modify
                      if (canModifyEvents && !filtered.includes('__CREATE_TAG__')) {
                        filtered.push('__CREATE_TAG__');
                      }
                      
                      return filtered;
                    }}
                  />
                </Box>
              </Box>

              {/* Clear Filters */}
              <Box sx={{ flex: '0 0 10%', minWidth: 0 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={clearAllFilters}
                  startIcon={<ClearIcon />}
                  fullWidth
                  sx={{ 
                    height: '40px',
                    mt: 0.5
                  }}
                >
                  Clear
                </Button>
              </Box>
            </Box>
          </Box>

        <CardContent sx={{ pt: 0 }}>
          {/* Table */}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'name'}
                      direction={sortBy === 'name' ? sortOrder : 'asc'}
                      onClick={() => handleSort('name')}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'email'}
                      direction={sortBy === 'email' ? sortOrder : 'asc'}
                      onClick={() => handleSort('email')}
                    >
                      Email
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Gift Selections</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'type'}
                      direction={sortBy === 'type' ? sortOrder : 'asc'}
                      onClick={() => handleSort('type')}
                    >
                      Type
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'status'}
                      direction={sortBy === 'status' ? sortOrder : 'asc'}
                      onClick={() => handleSort('status')}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Tags</TableCell>
                  {canModifyEvents && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={isIndeterminate()}
                        checked={isAllPageSelected()}
                        onChange={handleSelectAll}
                        color="primary"
                      />
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAndSortedGuests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((guest) => {
                  const isInherited = guest.isInherited;
                  const checkInStatus = getGuestCheckInStatus(guest);
                  const buttonState = getCheckInButtonState(guest);
                  const StatusIcon = checkInStatus.icon;
                  
                  return (
                    <TableRow 
                      key={guest._id} 
                      hover 
                      onClick={(e) => {
                        // Don't navigate if clicking checkbox
                        if (e.target.type !== 'checkbox' && !e.target.closest('button')) {
                          navigate(`/events/${event._id}/guests/${guest._id}`);
                        }
                      }}
                      sx={{
                        '&:hover': {
                          cursor: 'pointer',
                          backgroundColor: 'action.hover',
                          ...(isInherited && {
                            backgroundColor: 'rgba(25, 118, 210, 0.04)',
                            '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' }
                          })
                        }
                      }}
                    >
                      <TableCell>
                        <Button
                          variant={buttonState.variant}
                          color={buttonState.color}
                          size="small"
                          sx={{ 
                            justifyContent: 'center', 
                            width: '100%', 
                            borderRadius: 2, 
                            fontWeight: 600,
                            ...(buttonState.variant === 'outlined' && buttonState.color === 'success' && {
                              color: 'success.main'
                            }),
                            ...(buttonState.variant === 'outlined' && buttonState.color === 'info' && {
                              color: 'info.main'
                            })
                          }}
                          startIcon={<CheckCircleIcon />}
                          onClick={(e) => buttonState.active ? handleOpenCheckIn(guest, e) : null}
                          disabled={!buttonState.active || !canPerformCheckins}
                        >
                          {buttonState.label}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2">{guest.firstName} {guest.lastName}</Typography>
                        </Box>
                        {guest.jobTitle && (
                          <Typography variant="caption" color="textSecondary">
                            {guest.jobTitle}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{guest.email || 'No email'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {eventsToDisplay.length > 0 ? (
                            eventsToDisplay.map((ev, index) => {
                              const giftSelection = formatGiftSelections(guest, ev._id, ev.eventName);
                              
                              // Only show event name if there are multiple events, otherwise just show the gift
                              const showEventName = eventsToDisplay.length > 1;
                              
                              return (
                                <Typography 
                                  key={ev._id} 
                                  variant="body2" 
                                  sx={{ 
                                    fontSize: '0.9rem',
                                    color: 'text.primary'
                                  }}
                                >
                                  {showEventName ? `${ev.eventName} - ${giftSelection}` : giftSelection}
                                </Typography>
                              );
                            })
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              No event information available
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{guest.attendeeType || 'General'}</TableCell>
                      <TableCell>
                        <Chip
                          label={checkInStatus.label}
                          color={checkInStatus.color}
                          size="small"
                          icon={<StatusIcon />}
                          sx={{ borderRadius: 1 }}
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
                                fontSize: '0.7rem',
                                borderRadius: 1
                              }}
                            />
                          ))}
                        </Box>
                      </TableCell>
                      {canModifyEvents && (
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isGuestSelected(guest)}
                            onChange={(e) => handleSelectGuest(guest, e.target.checked)}
                            color="primary"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* No results message */}
          {filteredAndSortedGuests.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <FilterIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No guests match your filters
              </Typography>
              <Typography color="text.secondary" paragraph>
                Try adjusting your search or filter criteria
              </Typography>
              <Button variant="outlined" onClick={clearAllFilters}>
                Clear all filters
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
      
      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredAndSortedGuests.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Guests per page"
        sx={{ mt: 2 }}
      />
      
      {/* Check-in Modal */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseCheckIn}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minWidth: 400
          }
        }}
      >
        <DialogTitle>
          Guest Pickup
        </DialogTitle>
        <DialogContent>
          {checkInGuest && (
            <GuestCheckIn
              event={event}
              guest={checkInGuest}
              onClose={handleCloseCheckIn}
              onInventoryChange={onInventoryChange}
              onCheckinSuccess={onCheckInSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Mass Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Guests</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedGuests.length} guest(s)? This action cannot be undone.
          </Typography>
          {selectedGuests.length > 0 && (
            <Box sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Guests to be deleted:
              </Typography>
              {selectedGuests.map((guest) => (
                <Typography key={guest._id} variant="body2" sx={{ mb: 0.5 }}>
                  • {guest.firstName} {guest.lastName} {guest.email ? `(${guest.email})` : ''}
                </Typography>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleMassDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tag Create/Edit Dialog */}
      <Dialog 
        open={tagDialogOpen} 
        onClose={handleCloseTagDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingTag ? 'Edit Tag' : 'Create New Tag'}
        </DialogTitle>
        <DialogContent>
          {tagError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {tagError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Tag Name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              required
              placeholder="e.g., VIP, Speaker, Sponsor"
            />

            <TextField
              fullWidth
              label="Description (optional)"
              value={tagDescription}
              onChange={(e) => setTagDescription(e.target.value)}
              multiline
              rows={2}
              placeholder="Add a description for this tag"
            />

            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Tag Color
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    backgroundColor: newTagColor,
                    borderRadius: 1,
                    border: '2px solid',
                    borderColor: 'divider',
                    flexShrink: 0
                  }}
                />
                <TextField
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  placeholder="#1976d2"
                  size="small"
                  sx={{ flex: 1 }}
                  helperText="Enter hex color code (e.g., #1976d2)"
                />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {presetColors.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    sx={{
                      width: 32,
                      height: 32,
                      backgroundColor: color,
                      borderRadius: 1,
                      border: newTagColor === color ? '3px solid' : '1px solid',
                      borderColor: newTagColor === color ? 'primary.main' : 'divider',
                      cursor: 'pointer',
                      '&:hover': {
                        opacity: 0.8,
                        transform: 'scale(1.1)'
                      },
                      transition: 'all 0.2s'
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTagDialog} disabled={savingTag}>
            Cancel
          </Button>
          <Button
            onClick={editingTag ? handleUpdateTag : handleAddTag}
            variant="contained"
            disabled={savingTag || !newTagName.trim()}
            startIcon={savingTag ? <CircularProgress size={20} /> : null}
          >
            {savingTag ? 'Saving...' : editingTag ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GuestTable;