import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ForgotPasswordForm = ({ onSuccess, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
      await api.post('/api/auth/request-reset-link', { email });
      setSuccess(true);
      toast.success('Password reset link sent!');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
      toast.error(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#f9fafb">
      <Card sx={{ minWidth: 350, maxWidth: 400 }}>
        <CardContent>
          {!success ? (
            <Box component="form" onSubmit={handleSubmit}>
              <Typography variant="h5" fontWeight={600} mb={2} align="center">
                Reset your password
              </Typography>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              <Button
                variant="text"
                fullWidth
                sx={{ mt: 1 }}
                onClick={onBackToLogin}
              >
                ← Back to Login
              </Button>
            </Box>
          ) : (
            <Box textAlign="center" py={8}>
              <Typography variant="h5" fontWeight={600} mb={2}>
                Check Your Email
              </Typography>
              <Typography variant="body1" color="textSecondary" mb={4}>
                If an account with this email exists, we've sent a password reset link to your email address. The link will expire in 24 hours.
              </Typography>
              <Button
                variant="text"
                onClick={onBackToLogin}
                sx={{ mt: 2, fontWeight: 600 }}
              >
                Return to login
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPasswordForm; 