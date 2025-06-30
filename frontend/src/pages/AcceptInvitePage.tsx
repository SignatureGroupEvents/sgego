import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Alert, 
  CircularProgress, 
  Card, 
  CardContent,
  Divider,
  Snackbar,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { validateInviteToken } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface InviteValidation {
  email: string;
  role: string;
  status: 'new' | 'pending' | 'active' | 'expired';
  message: string;
}

const AcceptInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // State for validation
  const [validation, setValidation] = useState<InviteValidation | null>(null);
  const [validating, setValidating] = useState(true);
  const [validationError, setValidationError] = useState('');
  
  // State for forms
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Validate invite token on page load
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidationError('No invite token provided');
        setValidating(false);
        return;
      }

      try {
        const response = await validateInviteToken(token);
        const data = response.data;
        setValidation(data);
        
        // Pre-fill email if available
        if (data.email) {
          setFormData(prev => ({ ...prev, email: data.email }));
        }

        // Show status-specific toast messages
        if (data.status === 'active') {
          showToast('Your account is already active. Please log in.', 'info');
        } else if (data.status === 'expired') {
          showToast('This invite link has expired. Please contact support.', 'warning');
        }
        
      } catch (err: any) {
        setValidationError(err.response?.data?.message || 'Failed to validate invite');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const showToast = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setToast({
      open: true,
      message,
      severity
    });
  };

  const handleCloseToast = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/auth/accept-invite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          password: formData.password,
          name: formData.name 
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to accept invite');
      }
      
      showToast('Your account has been activated. Redirecting to login...', 'success');
      
      // Auto-login if possible
      try {
        await login({ email: formData.email, password: formData.password });
        navigate('/events');
      } catch (loginErr) {
        // If auto-login fails, redirect to login after a short delay
        setTimeout(() => navigate('/login'), 3000);
      }
      
    } catch (err: any) {
      showToast(err.message || 'Failed to accept invite', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePendingUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/auth/accept-invite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: formData.password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to set password');
      }
      
      showToast('Your account has been activated. Redirecting to login...', 'success');
      
      // Auto-login if possible
      try {
        await login({ email: validation?.email || '', password: formData.password });
        navigate('/events');
      } catch (loginErr) {
        // If auto-login fails, redirect to login after a short delay
        setTimeout(() => navigate('/login'), 3000);
      }
      
    } catch (err: any) {
      showToast(err.message || 'Failed to set password', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#f9fafb">
        <Card sx={{ minWidth: 350, maxWidth: 400 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="h6">Validating your invite...</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Error state
  if (validationError) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#f9fafb">
        <Card sx={{ minWidth: 350, maxWidth: 400 }}>
          <CardContent>
            <Alert severity="error" sx={{ mb: 2 }}>
              {validationError}
            </Alert>
            <Button 
              variant="outlined" 
              fullWidth 
              onClick={() => navigate('/login')}
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Render different views based on status
  const renderContent = () => {
    if (!validation) return null;

    switch (validation.status) {
      case 'new':
        return (
          <>
            <Typography variant="h5" gutterBottom>Complete Your Registration</Typography>
            <Typography variant="body2" color="textSecondary" mb={3}>
              Welcome! Please complete your account setup.
            </Typography>
            
            <form onSubmit={handleNewUserSubmit}>
              <TextField
                label="Full Name"
                fullWidth
                required
                margin="normal"
                value={formData.name}
                onChange={handleInputChange('name')}
                disabled={loading}
                autoComplete="name"
                aria-describedby="name-helper-text"
                inputProps={{
                  'aria-label': 'Full name'
                }}
              />
              
              <TextField
                label="Account Email"
                type="email"
                fullWidth
                required
                margin="normal"
                value={formData.email}
                disabled
                helperText="Email is pre-filled from your invite"
                autoComplete="email"
                aria-describedby="email-helper-text"
                inputProps={{
                  'aria-label': 'Account email (read-only)'
                }}
              />
              
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                required
                margin="normal"
                value={formData.password}
                onChange={handleInputChange('password')}
                disabled={loading}
                helperText="Minimum 6 characters"
                autoComplete="new-password"
                aria-describedby="password-helper-text"
                inputProps={{
                  'aria-label': 'Password'
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                        tabIndex={-1}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                fullWidth
                required
                margin="normal"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                disabled={loading}
                autoComplete="new-password"
                aria-describedby="confirm-password-helper-text"
                inputProps={{
                  'aria-label': 'Confirm password'
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        onClick={handleToggleConfirmPasswordVisibility}
                        edge="end"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 3 }}
                disabled={loading}
                aria-describedby="submit-helper-text"
              >
                {loading ? <CircularProgress size={24} /> : 'Create Account'}
              </Button>
              
              <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => navigate('/login')}
                disabled={loading}
              >
                Return to Login
              </Button>
            </form>
          </>
        );

      case 'pending':
        return (
          <>
            <Typography variant="h5" gutterBottom>Set New Password</Typography>
            <Typography variant="body2" color="textSecondary" mb={3}>
              Your account is almost ready. Please set a new password.
            </Typography>
            
            <form onSubmit={handlePendingUserSubmit}>
              <TextField
                label="Account Email"
                type="email"
                fullWidth
                margin="normal"
                value={validation.email}
                disabled
                helperText="Your email address"
                autoComplete="email"
                aria-describedby="email-helper-text"
                inputProps={{
                  'aria-label': 'Account email (read-only)'
                }}
              />
              
              <TextField
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                required
                margin="normal"
                value={formData.password}
                onChange={handleInputChange('password')}
                disabled={loading}
                helperText="Minimum 6 characters"
                autoComplete="new-password"
                aria-describedby="password-helper-text"
                inputProps={{
                  'aria-label': 'New password'
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                        tabIndex={-1}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                fullWidth
                required
                margin="normal"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                disabled={loading}
                autoComplete="new-password"
                aria-describedby="confirm-password-helper-text"
                inputProps={{
                  'aria-label': 'Confirm new password'
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        onClick={handleToggleConfirmPasswordVisibility}
                        edge="end"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 3 }}
                disabled={loading}
                aria-describedby="submit-helper-text"
              >
                {loading ? <CircularProgress size={24} /> : 'Set Password'}
              </Button>
              
              <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => navigate('/login')}
                disabled={loading}
              >
                Return to Login
              </Button>
            </form>
          </>
        );

      case 'active':
        return (
          <>
            <Typography variant="h5" gutterBottom>Account Already Active</Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Your account is already active. Please log in to continue.
            </Alert>
            <Button 
              variant="contained" 
              fullWidth 
              onClick={() => navigate('/login')}
            >
              Return to Login
            </Button>
          </>
        );

      case 'expired':
        return (
          <>
            <Typography variant="h5" gutterBottom>Invite Expired</Typography>
            <Alert severity="warning" sx={{ mb: 3 }}>
              This invite link has expired. Please contact support for a new invitation.
            </Alert>
            <Button 
              variant="outlined" 
              fullWidth 
              onClick={() => navigate('/login')}
            >
              Return to Login
            </Button>
          </>
        );

      default:
        return (
          <Alert severity="error">
            Unknown invite status. Please contact support.
          </Alert>
        );
    }
  };

  return (
    <>
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#f9fafb">
        <Card sx={{ minWidth: 350, maxWidth: 400 }}>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </Box>

      {/* Toast Notifications */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            minWidth: '300px',
            maxWidth: '90vw'
          }
        }}
      >
        <Alert 
          onClose={handleCloseToast} 
          severity={toast.severity} 
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AcceptInvitePage; 