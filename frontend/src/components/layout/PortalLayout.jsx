import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate, useParams } from 'react-router-dom';
import { clearPortalSession } from '../../services/portalApi';

export default function PortalLayout({ children, eventName = 'Event' }) {
  const navigate = useNavigate();
  const { eventId } = useParams();

  const handleSignOut = () => {
    clearPortalSession();
    navigate(`/portal/${eventId}/login`, { replace: true });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fdf9f6' }}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Typography variant="h6" fontWeight={600} color="primary.main">
          {eventName} — Client View
        </Typography>
        <Button startIcon={<LogoutIcon />} onClick={handleSignOut} size="small" color="inherit">
          Sign out
        </Button>
      </Box>
      {children}
    </Box>
  );
}
