import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Card, CardContent, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Link } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { portalLogin, setPortalSession } from '../../services/portalApi';
import toast from 'react-hot-toast';

const DATA_USE_NOTICE =
  'By accessing this portal, you acknowledge that guest information (including names, emails, shipping addresses, and order details) is provided solely for event and fulfillment purposes. Please do not share login credentials or distribute personal information outside your organization. Do not use guest information for marketing or unrelated communications. Access may be limited to event dates and disabled after the program closes. If you need extended access, contact your operations manager.';

const isValidEventId = (id) => typeof id === 'string' && id.length === 24 && /^[a-fA-F0-9]+$/.test(id);

export default function PortalLoginPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [closedMessage, setClosedMessage] = useState('');
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  const invalidEventId = !eventId || !isValidEventId(eventId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setClosedMessage('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    if (invalidEventId) {
      setError('Invalid event link. Use the exact URL from your event’s Client Portal settings.');
      return;
    }
    setLoading(true);
    try {
      const data = await portalLogin(eventId, email.trim(), password);
      if (data.token) {
        setPortalSession(data.token, data.eventId || eventId);
        toast.success('Signed in successfully');
        navigate(`/portal/${eventId}/dashboard`, { replace: true });
      }
    } catch (err) {
      const res = err.response?.data;
      if (res?.code === 'PORTAL_CLOSED') {
        setClosedMessage(res.message || 'This event portal has closed. Contact your operations manager to reopen this event.');
      } else {
        setError(res?.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
        p: 2
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom align="center">
            Client Portal
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
            Sign in to view event analytics
          </Typography>
          {invalidEventId ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              Invalid event link. Open the portal using the <strong>exact URL</strong> from your event’s Client Portal settings (e.g. from the Operations team). Do not use a URL that contains the placeholder &quot;&lt;eventId&gt;&quot;.
            </Alert>
          ) : closedMessage ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {closedMessage}
            </Alert>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                autoComplete="email"
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                autoComplete="current-password"
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || invalidEventId}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign in'}
              </Button>
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.4 }}>
                  By signing in, you acknowledge that guest information is provided for event and fulfillment purposes only. Do not share credentials or use guest data for marketing. Access may be limited to event dates.
                </Typography>
                <Link
                  component="button"
                  type="button"
                  variant="caption"
                  onClick={() => setPrivacyModalOpen(true)}
                  sx={{ mt: 0.5, display: 'inline-block', cursor: 'pointer' }}
                >
                  Privacy &amp; Data Use
                </Link>
              </Box>
            </form>
          )}
        </CardContent>
      </Card>

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
