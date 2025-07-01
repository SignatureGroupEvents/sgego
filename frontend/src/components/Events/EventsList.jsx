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
  useForkRef
} from '@mui/material';
import MainNavigation from '../MainNavigation';
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

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainNavigation />
      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            fontWeight={700} 
            color="primary.main" 
            gutterBottom
          >
            Events
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ mb: 3, display: { xs: 'none', sm: 'block' } }}
          >
            {canModifyEvents 
              ? 'Manage and view all events in the system'
              : 'View events and perform guest check-ins'
            }
          </Typography>
        </Box>

        {/* Search and Actions Bar */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 3, 
          gap: 2, 
          flexWrap: 'wrap',
          p: { xs: 1.5, md: 2 },
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 1
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            bgcolor: 'grey.50', 
            borderRadius: 2, 
            px: 2, 
            py: 1,
            flex: 1,
            minWidth: { xs: '100%', sm: 300 }
          }}>
            <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
            <input
              type="text"
              placeholder={isMobile ? "Search events..." : "Search events by name or contract number..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ 
                border: 'none', 
                outline: 'none', 
                background: 'transparent', 
                fontSize: 16, 
                width: '100%',
                padding: '4px 0'
              }}
              aria-label="Search events"
            />
          </Box>
          {canModifyEvents && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              sx={{ 
                borderRadius: 2, 
                fontWeight: 600,
                px: { xs: 2, md: 3 },
                py: 1.5,
                minWidth: { xs: 'auto', sm: 'fit-content' }
              }} 
              onClick={handleCreateEvent}
              aria-label="Create new event"
            >
              {isMobile ? 'Create' : 'Create Event'}
            </Button>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* Events Table */}
        {mainEvents.length === 0 ? (
          <EmptyState searchTerm={search} onCreateEvent={handleCreateEvent} canModifyEvents={canModifyEvents} />
        ) : (
          <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell width={50}></TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <TableSortLabel
                        active={sortBy === 'eventName'}
                        direction={sortBy === 'eventName' ? sortOrder : 'asc'}
                        onClick={() => handleSort('eventName')}
                      >
                        Event Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <TableSortLabel
                        active={sortBy === 'eventContractNumber'}
                        direction={sortBy === 'eventContractNumber' ? sortOrder : 'asc'}
                        onClick={() => handleSort('eventContractNumber')}
                      >
                        Contract #
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <TableSortLabel
                        active={sortBy === 'eventStart'}
                        direction={sortBy === 'eventStart' ? sortOrder : 'asc'}
                        onClick={() => handleSort('eventStart')}
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
                  {paginatedMainEvents.map(parent => {
                    const children = secondaryEvents(parent._id);
                    const hasChildren = children.length > 0;
                    const isSelected = selectedEvent === parent._id;
                    
                    return [
                      <TableRow
                        key={parent._id}
                        hover
                        selected={isSelected}
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'grey.50'
                          },
                          '&.Mui-selected': {
                            bgcolor: 'primary.light',
                            '&:hover': {
                              bgcolor: 'primary.light'
                            }
                          }
                        }}
                        onClick={() => handleRowClick(parent._id)}
                        onKeyPress={(e) => handleRowKeyPress(e, parent._id)}
                        tabIndex={0}
                        role="button"
                        aria-label={`View details for ${parent.eventName}`}
                      >
                        <TableCell align="center">
                          {hasChildren ? (
                            <Tooltip title={expanded[parent._id] ? "Collapse secondary events" : "Expand secondary events"}>
                              <IconButton 
                                size="small" 
                                onClick={(e) => handleExpand(parent._id, e)}
                                sx={{ 
                                  color: 'primary.main',
                                  '&:hover': { bgcolor: 'primary.light', color: 'white' }
                                }}
                                aria-label={expanded[parent._id] ? "Collapse secondary events" : "Expand secondary events"}
                              >
                                {expanded[parent._id] ? <ExpandLess /> : <ExpandMore />}
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle1" fontWeight={600} color="primary.main">
                            {parent.eventName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {parent.eventContractNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {parent.eventStart} - {parent.eventEnd}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={parent.type || (parent.isMainEvent ? 'Main' : 'Secondary')} 
                            size="small" 
                            color={parent.isMainEvent ? 'primary' : 'secondary'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={parent.status || 'Active'} 
                            color={parent.status === 'Inactive' ? 'default' : 'success'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            {parent.hasGifts && (
                              <Tooltip title="This event has gifts configured">
                                <Chip 
                                  icon={<GiftIcon fontSize="small" />} 
                                  label="Gifts" 
                                  size="small" 
                                  variant="outlined" 
                                  color="secondary"
                                />
                              </Tooltip>
                            )}
                            {parent.includeStyles && (
                              <Tooltip title="Style selection is enabled for this event">
                                <Chip 
                                  icon={<StyleIcon fontSize="small" />} 
                                  label="Styles" 
                                  size="small" 
                                  variant="outlined" 
                                  color="primary"
                                />
                              </Tooltip>
                            )}
                            {parent.allowMultipleGifts && (
                              <Tooltip title="Multiple gift selection is allowed">
                                <Chip 
                                  icon={<CheckCircleIcon fontSize="small" />} 
                                  label="Multi-Gift" 
                                  size="small" 
                                  variant="outlined" 
                                  color="success"
                                />
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          {hasChildren && (
                            <Tooltip title={`${children.length} secondary event${children.length > 1 ? 's' : ''}`}>
                              <Chip 
                                label={children.length} 
                                color="secondary" 
                                size="small" 
                                sx={{ fontWeight: 600 }}
                              />
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>,
                      expanded[parent._id] && children.map(child => (
                        <TableRow
                          key={child._id}
                          hover
                          sx={{ 
                            bgcolor: 'grey.25',
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'grey.100'
                            }
                          }}
                          onClick={() => handleRowClick(child._id)}
                          onKeyPress={(e) => handleRowKeyPress(e, child._id)}
                          tabIndex={0}
                          role="button"
                          aria-label={`View details for ${child.eventName}`}
                        >
                          <TableCell></TableCell>
                          <TableCell sx={{ pl: 6 }}>
                            <Typography variant="subtitle2" fontWeight={600} color="secondary.main">
                              {child.eventName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {child.eventContractNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {child.eventStart} - {child.eventEnd}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={child.type || 'Secondary'} 
                              size="small" 
                              color="secondary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={child.status || 'Active'} 
                              color={child.status === 'Inactive' ? 'default' : 'secondary'} 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              {child.hasGifts && (
                                <Tooltip title="This event has gifts configured">
                                  <Chip 
                                    icon={<GiftIcon fontSize="small" />} 
                                    label="Gifts" 
                                    size="small" 
                                    variant="outlined" 
                                    color="secondary"
                                  />
                                </Tooltip>
                              )}
                              {child.includeStyles && (
                                <Tooltip title="Style selection is enabled for this event">
                                  <Chip 
                                    icon={<StyleIcon fontSize="small" />} 
                                    label="Styles" 
                                    size="small" 
                                    variant="outlined" 
                                    color="primary"
                                  />
                                </Tooltip>
                              )}
                              {child.allowMultipleGifts && (
                                <Tooltip title="Multiple gift selection is allowed">
                                  <Chip 
                                    icon={<CheckCircleIcon fontSize="small" />} 
                                    label="Multi-Gift" 
                                    size="small" 
                                    variant="outlined" 
                                    color="success"
                                  />
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell align="center"></TableCell>
                        </TableRow>
                      ))
                    ];
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={handlePageChange}
              color="primary"
              showFirstButton 
              showLastButton
              size={isMobile ? "small" : "medium"}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default EventsList;