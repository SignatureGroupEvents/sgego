import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { getEventActivityFeed } from '../../../services/api';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import GiftIcon from '@mui/icons-material/Redeem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InventoryIcon from '@mui/icons-material/Inventory';
import NoteIcon from '@mui/icons-material/Note';
import UndoIcon from '@mui/icons-material/Undo';

const ACTION_LABELS = {
  checkin: 'Guest check-in',
  undo_checkin: 'Check-in undone',
  inventory_update: 'Inventory updated',
  inventory_add: 'Inventory item added',
  allocation_update: 'Allocation updated',
  update_gifts: 'Gift selection updated',
  note: 'Note updated',
  event_create: 'Event created',
  event_update: 'Event updated',
  event_status_change: 'Event status changed',
  event_archive: 'Event archived',
  event_unarchive: 'Event unarchived',
  test: 'Test action',
  other: 'Other activity'
};

const getActionLabel = (type) => ACTION_LABELS[type] || (type ? type.replace(/_/g, ' ') : 'Activity');

const ActivityFeed = ({ refreshKey = 0 } = {}) => {
  const { eventId } = useParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    const fetchActivityFeed = async () => {
      if (!eventId) {
        setError('No event ID provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const filters = { limit };
        if (filterType !== 'all') filters.type = filterType;
        const response = await getEventActivityFeed(eventId, filters);
        setLogs(response.data?.logs || []);
      } catch (err) {
        console.error('Error fetching activity feed:', err);
        setError(`Failed to load activity feed: ${err.message || 'Unknown error'}`);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivityFeed();
  }, [eventId, filterType, limit, refreshKey]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'checkin':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'undo_checkin':
        return <UndoIcon color="action" fontSize="small" />;
      case 'inventory_update':
      case 'inventory_add':
      case 'allocation_update':
      case 'update_gifts':
        return <InventoryIcon color="primary" fontSize="small" />;
      case 'note':
        return <NoteIcon color="secondary" fontSize="small" />;
      case 'event_create':
      case 'event_update':
      case 'event_status_change':
      case 'event_archive':
      case 'event_unarchive':
        return <EventIcon color="info" fontSize="small" />;
      default:
        return <PersonIcon color="action" fontSize="small" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'checkin':
        return 'success';
      case 'undo_checkin':
        return 'warning';
      case 'inventory_update':
      case 'inventory_add':
      case 'allocation_update':
      case 'update_gifts':
        return 'primary';
      case 'event_create':
      case 'event_update':
      case 'event_status_change':
      case 'event_archive':
      case 'event_unarchive':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '—';
    const d = new Date(timestamp);
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              Activity Feed
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Who did what and when — action, person, date & time
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Filter by type</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="Filter by type"
              >
                <MenuItem value="all">All activities</MenuItem>
                <MenuItem value="checkin">Check-ins</MenuItem>
                <MenuItem value="undo_checkin">Undo check-in</MenuItem>
                <MenuItem value="inventory_update">Inventory update</MenuItem>
                <MenuItem value="inventory_add">Inventory add</MenuItem>
                <MenuItem value="allocation_update">Allocation update</MenuItem>
                <MenuItem value="update_gifts">Gift update</MenuItem>
                <MenuItem value="note">Note</MenuItem>
                <MenuItem value="event_update">Event update</MenuItem>
                <MenuItem value="event_status_change">Status change</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Limit</InputLabel>
              <Select value={limit} onChange={(e) => setLimit(Number(e.target.value))} label="Limit">
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
                <MenuItem value={200}>200</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : logs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No activity for this event yet.
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: 'background.default' }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: 'background.default' }}>Details</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: 'background.default' }}>Performed by</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: 'background.default' }}>Date & time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log, index) => (
                  <TableRow key={log._id || index} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getActivityIcon(log.type)}
                        <Typography variant="body2" fontWeight={500}>
                          {getActionLabel(log.type)}
                        </Typography>
                        <Chip
                          label={log.type || 'other'}
                          size="small"
                          color={getActivityColor(log.type)}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {log.details?.message || log.details?.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.performedBy?.username || log.performedBy?.email || (log.performedBy?.firstName && log.performedBy?.lastName
                          ? `${log.performedBy.firstName} ${log.performedBy.lastName}`
                          : 'System')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDateTime(log.timestamp)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityFeed; 