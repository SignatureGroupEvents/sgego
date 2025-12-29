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
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { getEventActivityFeed } from '../../../services/api';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import GiftIcon from '@mui/icons-material/Redeem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ActivityFeed = () => {
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
        const filters = {};
        if (filterType !== 'all') {
          filters.type = filterType;
        }
        filters.limit = limit;

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
  }, [eventId, filterType, limit]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'checkin':
        return <CheckCircleIcon color="success" />;
      case 'gift':
        return <GiftIcon color="primary" />;
      case 'event':
        return <EventIcon color="info" />;
      default:
        return <PersonIcon color="action" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'checkin':
        return 'success';
      case 'gift':
        return 'primary';
      case 'event':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              Activity Feed
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time activity log and event updates
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Filter Type</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="Filter Type"
              >
                <MenuItem value="all">All Activities</MenuItem>
                <MenuItem value="checkin">Check-ins</MenuItem>
                <MenuItem value="gift">Gifts</MenuItem>
                <MenuItem value="event">Events</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Limit</InputLabel>
              <Select
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                label="Limit"
              >
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
                <MenuItem value={200}>200</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : logs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No activity logs found for this event.
            </Typography>
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ maxHeight: '600px', overflow: 'auto' }}>
            <List>
              {logs.map((log, index) => (
                <React.Fragment key={log._id || index}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'transparent' }}>
                        {getActivityIcon(log.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle2" component="span">
                            {log.details?.message || log.type || 'Activity'}
                          </Typography>
                          <Chip
                            label={log.type || 'unknown'}
                            size="small"
                            color={getActivityColor(log.type)}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {log.performedBy?.username || log.performedBy?.email || 'System'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(log.timestamp)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < logs.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityFeed; 