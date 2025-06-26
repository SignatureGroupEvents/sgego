import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Avatar, Divider, useTheme } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import InventoryIcon from '@mui/icons-material/Inventory';
import NoteIcon from '@mui/icons-material/Note';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import { formatDistanceToNow } from 'date-fns';

const typeIconMap = {
  checkin: CheckCircleIcon,
  inventory_update: InventoryIcon,
  allocation_update: InventoryIcon,
  note: NoteIcon,
  event_create: EventIcon,
  event_update: EditIcon,
  test: InfoIcon,
  other: InfoIcon
};

const getTypeColors = (theme, type) => {
  switch (type) {
    case 'checkin':
      return {
        icon: '#00C853', // Bright green
        bg: theme.palette.mode === 'dark' ? '#1B5E20' : '#E8F5E8',
        text: theme.palette.mode === 'dark' ? '#4CAF50' : '#2E7D32'
      };
    case 'inventory_update':
      return {
        icon: '#2196F3', // Bright blue
        bg: theme.palette.mode === 'dark' ? '#1565C0' : '#E3F2FD',
        text: theme.palette.mode === 'dark' ? '#64B5F6' : '#1976D2'
      };
    case 'allocation_update':
      return {
        icon: '#9C27B0', // Bright purple
        bg: theme.palette.mode === 'dark' ? '#4A148C' : '#F3E5F5',
        text: theme.palette.mode === 'dark' ? '#BA68C8' : '#7B1FA2'
      };
    case 'note':
      return {
        icon: '#FF9800', // Bright orange
        bg: theme.palette.mode === 'dark' ? '#E65100' : '#FFF3E0',
        text: theme.palette.mode === 'dark' ? '#FFB74D' : '#F57C00'
      };
    case 'event_create':
      return {
        icon: '#4CAF50', // Bright green
        bg: theme.palette.mode === 'dark' ? '#1B5E20' : '#E8F5E8',
        text: theme.palette.mode === 'dark' ? '#81C784' : '#2E7D32'
      };
    case 'event_update':
      return {
        icon: '#FF5722', // Bright red-orange
        bg: theme.palette.mode === 'dark' ? '#BF360C' : '#FFEBEE',
        text: theme.palette.mode === 'dark' ? '#FF8A65' : '#D32F2F'
      };
    case 'test':
      return {
        icon: '#607D8B', // Blue grey
        bg: theme.palette.mode === 'dark' ? '#37474F' : '#ECEFF1',
        text: theme.palette.mode === 'dark' ? '#90A4AE' : '#546E7A'
      };
    default:
      return {
        icon: '#757575', // Grey
        bg: theme.palette.mode === 'dark' ? '#424242' : '#FAFAFA',
        text: theme.palette.mode === 'dark' ? '#BDBDBD' : '#616161'
      };
  }
};

const getActionText = (type, details) => {
  switch (type) {
    case 'checkin':
      return `checked in ${details?.guestName || 'a guest'}`;
    case 'inventory_update':
      return `updated inventory for ${details?.type} - ${details?.style}`;
    case 'allocation_update':
      return `updated allocation for ${details?.type} - ${details?.style}`;
    case 'note':
      return `added a note`;
    case 'event_create':
      return `created event "${details?.eventName}"`;
    case 'event_update':
      return `updated event details`;
    case 'test':
      return `created a test log`;
    default:
      return 'performed an action';
  }
};

const getDetailsText = (type, details) => {
  switch (type) {
    case 'checkin':
      if (details?.giftsDistributed?.length > 0) {
        const gifts = details.giftsDistributed.map(g => `${g.quantity}x ${g.type}`).join(', ');
        return `Distributed: ${gifts}`;
      }
      return details?.notes || '';
    case 'inventory_update':
      return `Quantity changed from ${details?.previousCount || 0} to ${details?.newCount || 0}`;
    case 'allocation_update':
      const prevCount = details?.previousAllocatedEvents?.length || 0;
      const newCount = details?.newAllocatedEvents?.length || 0;
      return `Allocated to ${newCount} events (was ${prevCount})`;
    case 'event_create':
      return `Contract: ${details?.eventContractNumber}`;
    case 'event_update':
      return 'Event information was modified';
    default:
      return details?.message || '';
  }
};

export default function ActivityFeedEntry({ log }) {
  const theme = useTheme();
  const { type, performedBy, details, timestamp } = log;
  const actionText = getActionText(type, details);
  const detailsText = getDetailsText(type, details);
  const colors = getTypeColors(theme, type);
  const IconComponent = typeIconMap[type] || PersonIcon;

  return (
    <Card 
      sx={{ 
        mb: 2, 
        borderRadius: 3, 
        boxShadow: theme.shadows[1],
        border: `1px solid ${theme.palette.divider}`,
        '&:hover': {
          boxShadow: theme.shadows[4],
          transform: 'translateY(-1px)',
          transition: 'all 0.2s ease-in-out'
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          {/* Avatar */}
          <Avatar 
            sx={{ 
              bgcolor: colors.bg,
              width: 48,
              height: 48,
              border: `2px solid ${theme.palette.background.paper}`,
              boxShadow: theme.shadows[1]
            }}
          >
            <IconComponent sx={{ color: colors.icon }} />
          </Avatar>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 600, 
                  color: theme.palette.text.primary,
                  fontSize: '0.95rem'
                }}
              >
                {performedBy?.username || performedBy?.email || 'Unknown User'}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: theme.palette.text.secondary,
                  fontSize: '0.85rem'
                }}
              >
                {actionText}
              </Typography>
            </Box>

            {/* Details */}
            {detailsText && (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: theme.palette.text.secondary,
                  mb: 1,
                  lineHeight: 1.4,
                  fontSize: '0.9rem'
                }}
              >
                {detailsText}
              </Typography>
            )}

            {/* Type Badge */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip 
                label={type.replace('_', ' ').toUpperCase()} 
                size="small"
                sx={{ 
                  bgcolor: colors.bg,
                  color: colors.text,
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  borderRadius: 2,
                  height: 20
                }}
              />
            </Box>

            {/* Timestamp */}
            <Typography 
              variant="caption" 
              sx={{ 
                color: theme.palette.text.disabled,
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
} 