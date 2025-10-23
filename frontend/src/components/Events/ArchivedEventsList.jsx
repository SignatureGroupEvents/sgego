// ArchivedEventsList component for viewing archived events
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
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import MainLayout from '../layout/MainLayout';
import { getArchivedEvents, unarchiveEvent } from '../../services/events';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../contexts/AuthContext';
import AvatarIcon from '../dashboard/AvatarIcon';

import {
  ExpandMore,
  ExpandLess,
  Search as SearchIcon,
  Add as AddIcon,
  Event as EventIcon,
  Unarchive as UnarchiveIcon,
  MoreVert as MoreVertIcon,
  Archive as ArchiveIcon
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
      case 'archivedAt':
        aValue = new Date(a.archivedAt || 0);
        bValue = new Date(b.archivedAt || 0);
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
const EmptyState = ({ searchTerm }) => (
  <Card sx={{ textAlign: 'center', py: 6, px: 3 }}>
    <CardContent>
      <ArchiveIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" gutterBottom color="text.secondary">
        {searchTerm ? 'No archived events found' : 'No archived events'}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {searchTerm
          ? `No archived events match "${searchTerm}". Try adjusting your search terms.`
          : 'There are no archived events at this time.'
        }
      </Typography>
    </CardContent>
  </Card>
);

const ArchivedEventsList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('archivedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEventForMenu, setSelectedEventForMenu] = useState(null);

  const rowsPerPage = isMobile ? 5 : isTablet ? 8 : 10;
  const { isOperationsManager, isAdmin } = usePermissions();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Determine if user can modify events
  const canModifyEvents = isOperationsManager || isAdmin;

  useEffect(() => {
    const fetchArchivedEvents = async () => {
      try {
        setLoading(true);
        const res = await getArchivedEvents();
        let allEvents = res.events || res;

        setEvents(allEvents);
      } catch (err) {
        setError('Failed to load archived events');
      } finally {
        setLoading(false);
      }
    };
    fetchArchivedEvents();
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

  const handleMenuOpen = (event, eventData) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedEventForMenu(eventData);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEventForMenu(null);
  };

  const handleUnarchiveEvent = async () => {
    if (!selectedEventForMenu) return;
    
    try {
      await unarchiveEvent(selectedEventForMenu._id);
      // Refresh events
      const res = await getArchivedEvents();
      setEvents(res.events || res);
      handleMenuClose();
    } catch (error) {
      setError('Failed to unarchive event');
    }
  };

  if (loading) {
    return (
      <MainLayout>
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
                  <TableCell sx={{ fontWeight: 600 }}>Archived Date</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Created By</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Secondary Events</TableCell>
                  {canModifyEvents && (
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                  )}
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
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
          Archived Events
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          View and manage archived events
        </Typography>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search archived events by name or contract number..."
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

      {/* Events Table */}
      {mainEvents.length === 0 ? (
        <EmptyState searchTerm={search} />
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
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'archivedAt'}
                      direction={sortBy === 'archivedAt' ? sortOrder : 'asc'}
                      onClick={() => handleSort('archivedAt')}
                      sx={{ fontWeight: 600 }}
                    >
                      Archived Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Created By</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Secondary Events</TableCell>
                  {canModifyEvents && (
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                  )}
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
                          <Typography variant="body2" color="text.secondary">
                            {event.archivedAt ? new Date(event.archivedAt).toLocaleDateString() : 'Unknown'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <AvatarIcon
                              user={event.createdBy || { username: 'Unknown' }}
                              userId={event.createdBy?._id}
                              showTooltip={true}
                            />
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
                        {canModifyEvents && (
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, event)}
                              sx={{ p: 0.5 }}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>

                      {/* Secondary Events */}
                      {isExpanded && hasSecondaryEvents && (
                        <TableRow>
                          <TableCell colSpan={canModifyEvents ? 9 : 8} sx={{ p: 0, border: 0 }}>
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

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleUnarchiveEvent}>
          <ListItemIcon>
            <UnarchiveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Unarchive Event</ListItemText>
        </MenuItem>
      </Menu>
    </MainLayout>
  );
};

export default ArchivedEventsList;
