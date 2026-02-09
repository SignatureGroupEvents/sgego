import React, { useState } from 'react';
import { Box, Container, Typography, Button, Link, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate, useParams } from 'react-router-dom';
import { clearPortalSession } from '../../services/portalApi';

const DATA_USE_NOTICE =
  'By accessing this portal, you acknowledge that guest information (including names, emails, shipping addresses, and order details) is provided solely for event and fulfillment purposes. Please do not share login credentials or distribute personal information outside your organization. Do not use guest information for marketing or unrelated communications. Access may be limited to event dates and disabled after the program closes. If you need extended access, contact your operations manager.';

export default function PortalLayout({ children, eventName = 'Event' }) {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  const handleSignOut = () => {
    clearPortalSession();
    navigate(`/portal/${eventId}/login`, { replace: true });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fdf9f6', display: 'flex', flexDirection: 'column' }}>
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
          {eventName} — Client Portal
        </Typography>
        <Button startIcon={<LogoutIcon />} onClick={handleSignOut} size="small" color="inherit">
          Sign out
        </Button>
      </Box>
      <Box sx={{ flex: 1 }}>
        <Container
          maxWidth="xl"
          sx={{
            py: 3,
            px: { xs: 2, sm: 3, md: 4 },
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}
        >
          {children}
        </Container>
      </Box>
      <Box
        component="footer"
        sx={{
          px: 2,
          py: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          textAlign: 'center'
        }}
      >
        <Link
          component="button"
          type="button"
          variant="caption"
          onClick={() => setPrivacyModalOpen(true)}
          sx={{ cursor: 'pointer', color: 'text.secondary' }}
        >
          Privacy &amp; Data Use
        </Link>
      </Box>

      <Dialog open={privacyModalOpen} onClose={() => setPrivacyModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Privacy &amp; Data Use</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
            {DATA_USE_NOTICE}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrivacyModalOpen(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
