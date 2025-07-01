import React, { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Link
} from '@mui/material';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ResetPasswordRequestForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (val) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Email is required.');
      toast.error('Email is required.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      toast.error('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      // TODO: Replace with your real backend call
      // Example: await api.post(`/auth/send-reset-link`, { email });
      await new Promise((res) => setTimeout(res, 1200));
      setSuccess(true);
      toast.success('Reset link sent!');
    } catch (err) {
      setError('Failed to send reset link.');
      toast.error('Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box width="100%" py={6}>
        {!success ? (
          <Box component="form" onSubmit={handleSubmit}>
            <Typography variant="h5" fontWeight={600} mb={2} align="center">
              Reset your password
            </Typography>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email address"
              fullWidth
              required
              margin="normal"
              autoFocus
              error={!!error}
              helperText={error}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2, backgroundColor: '#1bcddc', '&:hover': { backgroundColor: '#17b3c0' } }}
              disabled={loading}
              size="large"
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'NEXT'}
            </Button>
          </Box>
        ) : (
          <Box textAlign="center" py={8}>
            <Typography variant="h5" fontWeight={600} mb={2}>
              Check your email
            </Typography>
            <Typography variant="body1" color="textSecondary" mb={4}>
              Please check your email to reset your password.
            </Typography>
            <Button
              variant="text"
              onClick={() => navigate('/login')}
              sx={{ mt: 2, fontWeight: 600 }}
            >
              Return to login
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default ResetPasswordRequestForm; 