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
  Tooltip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TableSortLabel,
  Autocomplete
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
  Clear as ClearIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import GuestCheckIn from './GuestCheckIn';
import { useNavigate, useParams } from 'react-router-dom';

const GuestTable = ({ guests, onUploadGuests, event, onInventoryChange, onCheckInSuccess, inventory = [] }) => {
  const [checkInGuest, setCheckInGuest] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { isOperationsManager, isAdmin } = usePermissions();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { guestId } = useParams();
  
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
  
  // Determine permissions
  const canModifyEvents = isOperationsManager || isAdmin;
  const canPerformCheckins = isOperationsManager || isAdmin || currentUser?.role === 'staff';

  // Get all unique tags for filter dropdown
  const allTags = useMemo(() => {
    const tagSet = new Set();
    guests.forEach(guest => {
      guest.tags?.forEach(tag => tagSet.add(tag.name));
    });
    return Array.from(tagSet).sort();
  }, [guests]);

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
            <Typography variant="h6">
              Guest List ({filteredAndSortedGuests.length} of {guests.length})
            </Typography>
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={exportToCSV}
              >
                Export CSV File
              </Button>
            </Box>
          </Box>

          {/* Search and Filter Controls */}
          <Box mb={3}>
            <Grid container spacing={2} alignItems="flex-start">
              {/* Search Bar */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search guests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
              </Grid>

              {/* Status Filter */}
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="not-picked-up">Not Picked Up</MenuItem>
                    <MenuItem value="partially-picked-up">Partially Picked Up</MenuItem>
                    <MenuItem value="fully-picked-up">Fully Picked Up</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Type Filter */}
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    label="Type"
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="General">General</MenuItem>
                    {attendeeTypes.map(type => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Tag Filter */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tags</InputLabel>
                  <Autocomplete
                    multiple
                    size="small"
                    options={allTags}
                    value={tagFilter}
                    onChange={(event, newValue) => setTagFilter(newValue)}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Tags"
                        InputProps={{
                          ...params.InputProps,
                          style: { paddingTop: '8px', paddingBottom: '8px' }
                        }}
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option}
                          label={option}
                          size="small"
                          sx={{ borderRadius: 1, fontSize: '0.75rem' }}
                        />
                      ))
                    }
                    sx={{
                      '& .MuiAutocomplete-inputRoot': {
                        padding: '8px 12px'
                      }
                    }}
                  />
                </FormControl>
              </Grid>

              {/* Clear Filters */}
              <Grid item xs={12} sm={6} md={2}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={clearAllFilters}
                  startIcon={<ClearIcon />}
                  sx={{ 
                    minWidth: 'auto',
                    height: '40px',
                    mt: 0.5
                  }}
                >
                  Clear
                </Button>
              </Grid>
            </Grid>
          </Box>

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
                  <TableCell>Source</TableCell>
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
                      onClick={() => navigate(`/events/${event._id}/guests/${guest._id}`)}
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
                              
                              // For main event view, show event names with gift selections
                              if (event?.isMainEvent) {
                                return (
                                  <Typography 
                                    key={ev._id} 
                                    variant="body2" 
                                    sx={{ 
                                      fontSize: '0.8rem',
                                      color: index === 0 ? 'text.primary' : 'text.secondary'
                                    }}
                                  >
                                    {ev.eventName} - {giftSelection}
                                  </Typography>
                                );
                              } else {
                                // For secondary event view, show only the gift selection
                                return (
                                  <Typography 
                                    key={ev._id} 
                                    variant="body2" 
                                    sx={{ 
                                      fontSize: '0.9rem',
                                      color: 'text.primary'
                                    }}
                                  >
                                    {giftSelection}
                                  </Typography>
                                );
                              }
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
                      <TableCell>
                        {isInherited ? (
                          <Tooltip title={`From ${guest.originalEventName || 'Main Event'}`}>
                            <Chip
                              label={`${guest.originalEventName || 'Main Event'}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              icon={<InheritedIcon />}
                              sx={{ borderRadius: 1 }}
                            />
                          </Tooltip>
                        ) : (
                          <Chip
                            label="Direct"
                            size="small"
                            color="default"
                            variant="outlined"
                            sx={{ borderRadius: 1 }}
                          />
                        )}
                      </TableCell>
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
    </>
  );
};

export default GuestTable;