import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  Tooltip,
  Divider,
  Stack,
  Grid
} from '@mui/material';
import { Delete as RemoveIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AvatarIcon from './AvatarIcon';

const DashboardEventCard = ({
  event,
  variant = 'standard', // 'standard', 'assigned', 'dialog'
  onRemove,
  onAdd,
  formatDate,
  formatStatusForDisplay,
  normalizeStatus,
  isEventActive,
  addingEvent = false
}) => {
  const navigate = useNavigate();
  const isActive = isEventActive ? isEventActive(event) : false;

  const renderHeader = () => {
    if (variant === 'dialog') {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography 
            variant="h6" 
            fontWeight={600}
            onClick={() => navigate(`/events/${event._id}`)}
            sx={{ 
              color: 'primary.main',
              cursor: 'pointer',
              flex: 1,
              pr: 1,
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            {event.eventName}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onAdd && onAdd(event._id)}
            disabled={addingEvent}
            startIcon={<AddIcon />}
          >
            Add
          </Button>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: variant === 'assigned' ? 2 : 2 }}>
        <Typography 
          variant="h6" 
          fontWeight={600}
          onClick={() => navigate(`/events/${event._id}`)}
          sx={{ 
            color: 'primary.main',
            cursor: 'pointer',
            flex: 1,
            pr: variant === 'assigned' ? 0 : 1,
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          {event.eventName}
        </Typography>
        {variant === 'standard' && onRemove && (
          <Tooltip title="Remove Event From My Board">
            <IconButton
              size="small"
              color="error"
              onClick={() => onRemove(event._id)}
            >
              <RemoveIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  };

  const renderStatusChip = () => {
    const statusColor = event.isArchived 
      ? 'default' 
      : normalizeStatus(event.status) === 'closed' 
        ? 'success' 
        : 'default';

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip 
          label={formatStatusForDisplay(event)} 
          size="small" 
          color={statusColor}
          sx={{ borderRadius: 1 }}
        />
        {isActive && (
          <Tooltip title={variant === 'dialog' ? 'Active Event' : 'Live Event - Currently Open'}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#393ce0',
                boxShadow: '0 0 6px #393ce0, 0 0 10px #393ce0',
                animation: 'pulse-glow 2s ease-in-out infinite',
                flexShrink: 0,
              }}
            />
          </Tooltip>
        )}
      </Box>
    );
  };

  const renderAllocatedTo = () => {
    if (variant !== 'assigned') return null;

    return (
      <>
        <Divider />
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            Allocated To
          </Typography>
          {event.allocatedToSecondaryEvent ? (
            <Typography variant="body2" color="primary.main" fontWeight={500}>
              {event.allocatedToSecondaryEvent.eventName}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Main Event
            </Typography>
          )}
        </Box>
      </>
    );
  };

  return (
    <Card 
      elevation={variant === 'dialog' ? 1 : 2}
      sx={{ 
        mb: 2,
        borderRadius: 2,
        transition: 'all 0.2s ease-in-out',
        '&:hover': { 
          boxShadow: variant === 'dialog' ? 3 : 4,
          transform: 'translateY(-2px)'
        }
      }}
    >
      <CardContent>
        {renderHeader()}

        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Contract #
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {event.eventContractNumber || 'N/A'}
              </Typography>
            </Box>
            {renderStatusChip()}
          </Box>

          <Divider />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Start Date
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {formatDate(event.eventStart)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                End Date
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {formatDate(event.eventEnd)}
              </Typography>
            </Grid>
          </Grid>

          {renderAllocatedTo()}

          {variant !== 'dialog' && (
            <>
              <Divider />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Created By:
                </Typography>
                <AvatarIcon 
                  user={event.createdBy || { username: 'Unknown' }} 
                  userId={event.createdBy?._id}
                  showTooltip={true}
                />
              </Box>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default DashboardEventCard;

