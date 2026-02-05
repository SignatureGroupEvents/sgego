import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Card, CardContent, Alert, CircularProgress } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { portalLogin, setPortalSession } from '../../services/portalApi';
import toast from 'react-hot-toast';

export default function PortalLoginPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [closedMessage, setClosedMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setClosedMessage('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
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
          {closedMessage ? (
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
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign in'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
