import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  IconButton,
  Link
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

const LogoIcon = () => (
  <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 8C16 24 32 24 24 40" stroke="#00B2C0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </Box>
);

const InviteRegisterPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const validate = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`/api/auth/validate-invite/${token}`);
        if (res.data && res.data.status !== 'expired') {
          setEmail(res.data.email);
          setValid(true);
        } else {
          setExpired(true);
        }
      } catch (err) {
        setExpired(true);
      } finally {
        setLoading(false);
      }
    };
    validate();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`/api/auth/accept-invite/${token}`, { password });
      toast.success('Registration complete!');
      navigate('/events');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#fef8f4">
        <CircularProgress size={40} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Return to Login link */}
      <Box position="absolute" top={0} left={0} p={2}>
        <Button variant="text" size="small" onClick={() => navigate('/login')} sx={{ fontWeight: 700 }}>
          RETURN TO LOGIN
        </Button>
      </Box>
      <Box width="100%" py={6}>
        {valid ? (
          <Box component="form" onSubmit={handleSubmit}>
            <LogoIcon />
            <Typography variant="h4" align="center" fontWeight={600} mb={2}>
              Register
            </Typography>
            <TextField
              label="Email"
              value={email}
              fullWidth
              margin="normal"
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              required
              placeholder="Enter your password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(s => !s)}
                      edge="end"
                      tabIndex={-1}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <FormControlLabel
              control={<Checkbox checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />}
              label="Remember me"
              sx={{ mt: 1, mb: 2 }}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ backgroundColor: '#1bcddc', fontWeight: 700, letterSpacing: 1, py: 1.2, fontSize: 16, mt: 1, mb: 2, '&:hover': { backgroundColor: '#17b3c0' } }}
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={22} color="inherit" /> : 'REGISTER'}
            </Button>
          </Box>
        ) : expired ? (
          <Box textAlign="center" py={8}>
            <LogoIcon />
            <Typography variant="h5" fontWeight={600} mb={2}>
              This invitation link is invalid or has expired.
            </Typography>
            <Button
              variant="text"
              onClick={() => navigate('/login')}
              sx={{ mt: 2, fontWeight: 600 }}
            >
              Return to login
            </Button>
          </Box>
        ) : null}
      </Box>
    </Container>
  );
};

export default InviteRegisterPage; 