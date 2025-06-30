import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, TextField, Button, Alert, CircularProgress, Card, CardContent } from '@mui/material';
import axios from 'axios';

const AcceptInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.post(`/api/auth/accept-invite/${token}`, { password });
      setSuccess('✅ Your account is ready! You can now log in.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept invite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#f9fafb">
      <Card sx={{ minWidth: 350, maxWidth: 400 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>Accept Your Invitation</Typography>
          <Typography variant="body2" color="textSecondary" mb={2}>
            Set your password to activate your account.
          </Typography>
          {success ? (
            <Alert severity="success">{success}</Alert>
          ) : (
            <form onSubmit={handleSubmit}>
              <TextField
                label="Password"
                type="password"
                fullWidth
                required
                margin="normal"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Activate Account'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AcceptInvitePage; 