import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { getEventActivityFeed } from '../../../services/api';
import { getUserDisplayName } from '../../../utils/userDisplay';
import AvatarIcon from '../AvatarIcon';

/** Action phrase only (no name): "Updated inventory", "Checked in Miranda Lambert", etc. */
const getActionLine = (log) => {
  const guestName = log.details?.guestName;
  const msg = log.details?.message || log.details?.description;
  switch (log.type) {
    case 'checkin':
      return guestName ? `Checked in ${guestName}` : 'Checked in a guest';
    case 'undo_checkin':
      return guestName ? `Undid check-in for ${guestName}` : 'Undid a check-in';
    case 'update_gifts':
      return guestName ? `Updated gifts for ${guestName}` : 'Updated gift selection';
    case 'inventory_update':
      return msg || 'Updated inventory';
    case 'inventory_add':
      return msg || 'Added inventory item';
    case 'allocation_update':
      return msg || 'Updated allocation';
    case 'note':
      return msg || 'Added or updated a note';
    case 'event_create':
      return msg || 'Created event';
    case 'event_update':
      return msg || 'Updated event';
    case 'event_status_change':
      return msg || 'Changed event status';
    case 'event_archive':
      return msg || 'Archived event';
    case 'event_unarchive':
      return msg || 'Unarchived event';
    case 'test':
      return msg || 'Test action';
    case 'other':
    default:
      return msg || 'Activity';
  }
};

/** MUI color or hex for type (for color-coding the action) */
const getTypeColor = (type) => {
  switch (type) {
    case 'checkin':
      return 'success';
    case 'undo_checkin':
      return 'warning';
    case 'update_gifts':
      return 'primary';
    case 'inventory_update':
    case 'inventory_add':
    case 'allocation_update':
      return 'primary';
    case 'note':
      return 'secondary';
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

/** Notes/reason from details (check-in notes, undo reason, etc.) */
const getNotes = (log) => {
  const notes = log.details?.notes ?? log.details?.reason;
  return typeof notes === 'string' && notes.trim() ? notes.trim() : null;
};

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
              Activities by type — who did what and when
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
                <MenuItem value="update_gifts">Gift update</MenuItem>
                <MenuItem value="inventory_update">Inventory update</MenuItem>
                <MenuItem value="inventory_add">Inventory add</MenuItem>
                <MenuItem value="allocation_update">Allocation update</MenuItem>
                <MenuItem value="note">Note</MenuItem>
                <MenuItem value="event_create">Event created</MenuItem>
                <MenuItem value="event_update">Event update</MenuItem>
                <MenuItem value="event_status_change">Status change</MenuItem>
                <MenuItem value="event_archive">Event archived</MenuItem>
                <MenuItem value="event_unarchive">Event unarchived</MenuItem>
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
          <Box sx={{ maxHeight: 560, overflowY: 'auto' }}>
            {logs.map((log, index) => {
              const displayName = getUserDisplayName(log.performedBy, 'Someone');
              const actionLine = getActionLine(log);
              const notes = getNotes(log);
              return (
                <Box key={log._id || index}>
                  {index > 0 && <Divider sx={{ my: 1.5 }} />}
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', py: 0.5 }}>
                    {/* Avatar uses user's profile color (and name-based initials) via AvatarIcon; backend populates performedBy with profileColor */}
                    <Box sx={{ mt: 0.25, flexShrink: 0 }}>
                      <AvatarIcon
                        user={log.performedBy}
                        userId={log.performedBy?._id}
                        showTooltip={true}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" component="span" fontWeight={600}>
                        {displayName}
                      </Typography>
                      <Typography
                        variant="body2"
                        component="span"
                        color={getTypeColor(log.type)}
                        sx={{ ml: 0.5, fontWeight: 500 }}
                      >
                        {actionLine}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>
                        {formatDateTime(log.timestamp)}
                      </Typography>
                      {notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, fontStyle: 'italic' }}>
                          {notes}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityFeed; 