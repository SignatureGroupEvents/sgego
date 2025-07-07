import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Placeholder logo icon (can be replaced with an SVG or image)
const LogoIcon = () => (
  <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 8C16 24 32 24 24 40" stroke="#00B2C0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </Box>
);

const LoginForm = ({ onSuccess, onForgotPassword }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleTogglePassword = () => setShowPassword((show) => !show);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password.');
      toast.error('Please enter both email and password.');
      setLoading(false);
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email)) {
      setError('Please enter a valid email address.');
      toast.error('Please enter a valid email address.');
      setLoading(false);
      return;
    }
    // Real login logic
    const result = await login(formData);
    setLoading(false);
    if (result.success) {
      toast.success('Signed in!');
      if (onSuccess) {
        onSuccess(result);
      }
    } else {
      setError(result.message);
      toast.error(result.message);
    }
  };

  return (
    <Box minHeight="100vh" bgcolor="#fef8f4" position="relative">
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Paper elevation={2} sx={{ px: { xs: 2, sm: 6 }, py: { xs: 4, sm: 6 }, maxWidth: 400, width: '100%' }}>
          <LogoIcon />
          <Typography variant="h4" align="center" fontWeight={500} mb={2}>
            Sign in
          </Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              margin="normal"
              autoComplete="email"
              required
              InputProps={{
                inputProps: { 'data-testid': 'email-input' }
              }}
            />
            <TextField
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              fullWidth
              margin="normal"
              autoComplete="current-password"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={handleTogglePassword}
                      edge="end"
                      tabIndex={-1}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                inputProps: { 'data-testid': 'password-input' }
              }}
            />
            {/* Error state */}
            {error && (
              <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
                {error}
              </Alert>
            )}
            {/* Forgot Password link and Sign In button */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mt={1} mb={1}>
              <Button
                variant="text"
                sx={{ textTransform: 'none', fontWeight: 600, pl: 0 }}
                onClick={onForgotPassword}
              >
                Forgot Password?
              </Button>
              <Button
                type="submit"
                variant="contained"
                sx={{ minWidth: 100, fontWeight: 600 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default LoginForm; 