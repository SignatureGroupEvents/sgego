import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Alert, 
  CircularProgress, 
  TableContainer, 
  Table, 
  TableHead, 
  TableBody, 
  TableRow, 
  TableCell, 
  Paper, 
  Chip, 
  IconButton,
  Pagination,
  Stack,
  useTheme,
  useMediaQuery,
  Tooltip,
  TableSortLabel,
  Card,
  CardContent,
  Skeleton,
  Fade,
  useForkRef,
  TextField
} from '@mui/material';
import MainNavigation from '../layout/MainNavigation';
import { getEvents } from '../../services/events';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ExpandMore, 
  ExpandLess, 
  Search as SearchIcon, 
  CardGiftcard as GiftIcon, 
  CheckCircle as CheckCircleIcon, 
  Style as StyleIcon,
  Add as AddIcon,
  Event as EventIcon,
  CalendarToday as CalendarIcon,
  Business as BusinessIcon,
  Info as InfoIcon
} from '@mui/icons-material';

// Sorting function
const sortEvents = (events, sortBy, sortOrder) => {
  return [...events].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'eventName':
        aValue = a.eventName?.toLowerCase() || '';
        bValue = b.eventName?.toLowerCase() || '';
        break;
      case 'eventStart':
        aValue = new Date(a.eventStart || 0);
        bValue = new Date(b.eventStart || 0);
        break;
      case 'eventContractNumber':
        aValue = a.eventContractNumber?.toLowerCase() || '';
        bValue = b.eventContractNumber?.toLowerCase() || '';
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
};

// Loading skeleton for table rows
const TableRowSkeleton = ({ columns = 8 }) => (
  <TableRow>
    {Array.from({ length: columns }).map((_, index) => (
      <TableCell key={index}>
        <Skeleton variant="text" width="100%" height={24} />
      </TableCell>
    ))}
  </TableRow>
);

// Empty state component
const EmptyState = ({ searchTerm, onCreateEvent, canModifyEvents }) => (
  <Card sx={{ textAlign: 'center', py: 6, px: 3 }}>
    <CardContent>
      <EventIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" gutterBottom color="text.secondary">
        {searchTerm ? 'No events found' : 'No events yet'}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {searchTerm 
          ? `No events match "${searchTerm}". Try adjusting your search terms.`
          : canModifyEvents 
            ? 'Get started by creating your first event.'
            : 'No events are currently available for check-ins.'
        }
      </Typography>
      {!searchTerm && canModifyEvents && (
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={onCreateEvent}
          sx={{ mt: 2 }}
        >
          Create Your First Event
        </Button>
      )}
    </CardContent>
  </Card>
);

const EventsList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('eventStart');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const rowsPerPage = isMobile ? 5 : isTablet ? 8 : 10;
  const { isOperationsManager, isAdmin, user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Determine if user can create/modify events
  const canModifyEvents = isOperationsManager || isAdmin;
  // Staff can view all events but cannot modify them
  const canViewEvents = isOperationsManager || isAdmin || currentUser?.role === 'staff';

  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        setLoading(true);
        const res = await getEvents();
        let allEvents = res.events || res;
        
        // Staff can view all events, but operations managers and admins can view all events
        // The filtering for assigned events is no longer needed since staff should see all events
        setEvents(allEvents);
      } catch (err) {
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    fetchAllEvents();
  }, [isOperationsManager, isAdmin]);

  // Filtering and search
  const filteredEvents = events.filter(ev => {
    const matchesSearch =
      ev.eventName?.toLowerCase().includes(search.toLowerCase()) ||
      ev.eventContractNumber?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  // Sorting
  const sortedEvents = sortEvents(filteredEvents, sortBy, sortOrder);

  // Grouping
  const mainEvents = sortedEvents.filter(ev => ev.isMainEvent);
  const secondaryEvents = parentId => sortedEvents.filter(ev => ev.parentEventId === parentId);

  // Pagination
  const totalPages = Math.ceil(mainEvents.length / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedMainEvents = mainEvents.slice(startIndex, endIndex);

  const handleExpand = (eventId, event) => {
    event.stopPropagation();
    setExpanded(prev => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    setSelectedEvent(null);
  };

  const handleSort = (property) => {
    const isAsc = sortBy === property && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(property);
    setPage(1);
  };

  const handleRowClick = (eventId) => {
    setSelectedEvent(eventId);
    navigate(`/events/${eventId}/dashboard`);
  };

  const handleRowKeyPress = (event, eventId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleRowClick(eventId);
    }
  };

  const handleCreateEvent = () => {
    navigate('/events/new');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <MainNavigation />
        <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
          {/* Header Skeleton */}
          <Box sx={{ mb: 4 }}>
            <Skeleton variant="text" width={200} height={40} sx={{ mb: 1 }} />
            <Skeleton variant="text" width={300} height={24} />
          </Box>
          
          {/* Search Bar Skeleton */}
          <Box sx={{ mb: 3 }}>
            <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 2 }} />
          </Box>
          
          {/* Table Skeleton */}
          <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell width={50}></TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Event Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Contract #</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Dates</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Features</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Secondary Events</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.from({ length: rowsPerPage }).map((_, index) => (
                    <TableRowSkeleton key={index} />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <MainNavigation />
        <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainNavigation />
      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
            Events
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage and view all your events
          </Typography>
        </Box>

        {/* Search and Create */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          gap: 2, 
          mb: 3,
          alignItems: { xs: 'stretch', sm: 'center' }
        }}>
          <Box sx={{ flex: 1, position: 'relative' }}>
            <TextField
              fullWidth
              placeholder="Search events by name or contract number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: 'background.paper',
                }
              }}
            />
          </Box>
          {canModifyEvents && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateEvent}
              sx={{ 
                borderRadius: 2, 
                fontWeight: 600,
                minWidth: { xs: '100%', sm: 'auto' }
              }}
            >
              Create Event
            </Button>
          )}
        </Box>

        {/* Events Table */}
        {mainEvents.length === 0 ? (
          <EmptyState 
            searchTerm={search} 
            onCreateEvent={handleCreateEvent}
            canModifyEvents={canModifyEvents}
          />
        ) : (
          <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell width={50}></TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'eventName'}
                        direction={sortBy === 'eventName' ? sortOrder : 'asc'}
                        onClick={() => handleSort('eventName')}
                        sx={{ fontWeight: 600 }}
                      >
                        Event Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'eventContractNumber'}
                        direction={sortBy === 'eventContractNumber' ? sortOrder : 'asc'}
                        onClick={() => handleSort('eventContractNumber')}
                        sx={{ fontWeight: 600 }}
                      >
                        Contract #
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'eventStart'}
                        direction={sortBy === 'eventStart' ? sortOrder : 'asc'}
                        onClick={() => handleSort('eventStart')}
                        sx={{ fontWeight: 600 }}
                      >
                        Dates
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Features</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Secondary Events</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedMainEvents.map((event) => {
                    const hasSecondaryEvents = secondaryEvents(event._id).length > 0;
                    const isExpanded = expanded[event._id];
                    
                    return (
                      <React.Fragment key={event._id}>
                        <TableRow 
                          hover 
                          onClick={() => handleRowClick(event._id)}
                          onKeyPress={(e) => handleRowKeyPress(e, event._id)}
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'action.hover' },
                            ...(selectedEvent === event._id && {
                              backgroundColor: 'primary.light',
                              '&:hover': { backgroundColor: 'primary.light' }
                            })
                          }}
                          tabIndex={0}
                        >
                          <TableCell>
                            {hasSecondaryEvents && (
                              <IconButton
                                size="small"
                                onClick={(e) => handleExpand(event._id, e)}
                                sx={{ p: 0.5 }}
                              >
                                {isExpanded ? <ExpandLess /> : <ExpandMore />}
                              </IconButton>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {event.eventName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {event.eventContractNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {new Date(event.eventStart).toLocaleDateString()}
                              </Typography>
                              {event.eventEnd && event.eventEnd !== event.eventStart && (
                                <Typography variant="caption" color="text.secondary">
                                  to {new Date(event.eventEnd).toLocaleDateString()}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={event.isMainEvent ? 'Main Event' : 'Secondary Event'} 
                              size="small" 
                              color={event.isMainEvent ? 'primary' : 'secondary'}
                              sx={{ borderRadius: 1 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={event.status || 'Active'} 
                              size="small" 
                              color={event.status === 'Completed' ? 'success' : 'default'}
                              sx={{ borderRadius: 1 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              {event.hasGifts && (
                                <Tooltip title="Has Gift Management">
                                  <GiftIcon color="primary" fontSize="small" />
                                </Tooltip>
                              )}
                              {event.hasCheckins && (
                                <Tooltip title="Has Check-in System">
                                  <CheckCircleIcon color="success" fontSize="small" />
                                </Tooltip>
                              )}
                              {event.hasInventory && (
                                <Tooltip title="Has Inventory Management">
                                  <StyleIcon color="info" fontSize="small" />
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            {hasSecondaryEvents ? (
                              <Chip 
                                label={`${secondaryEvents(event._id).length} events`} 
                                size="small" 
                                color="secondary"
                                sx={{ borderRadius: 1 }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                        
                        {/* Secondary Events */}
                        {isExpanded && hasSecondaryEvents && (
                          <TableRow>
                            <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                              <Box sx={{ pl: 4, pr: 2, py: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="subtitle2" fontWeight={600} mb={2}>
                                  Secondary Events:
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                  {secondaryEvents(event._id).map((secondaryEvent) => (
                                    <Button
                                      key={secondaryEvent._id}
                                      variant="outlined"
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/events/${secondaryEvent._id}/dashboard`);
                                      }}
                                      sx={{
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontSize: '0.8rem'
                                      }}
                                    >
                                      {secondaryEvent.eventName}
                                    </Button>
                                  ))}
                                </Stack>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                <Pagination 
                  count={totalPages} 
                  page={page} 
                  onChange={handlePageChange}
                  color="primary"
                  size={isMobile ? 'small' : 'medium'}
                />
              </Box>
            )}
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default EventsList; 