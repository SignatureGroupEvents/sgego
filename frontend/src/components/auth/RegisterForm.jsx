import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Alert, 
  CircularProgress, 
  Card, 
  CardContent,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { validateInviteToken } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const RegisterForm = ({ token, onSuccess, onBackToLogin }) => {
  const { login } = useAuth();
  
  // State for validation
  const [validation, setValidation] = useState(null);
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



  // Validate invite token on component mount
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
          toast('Your account is already active. Please log in.', { icon: 'ℹ️' });
        } else if (data.status === 'expired') {
          toast('This invite link has expired. Please contact support.', { icon: '⚠️' });
        }
        
      } catch (err) {
        setValidationError(err.response?.data?.message || 'Failed to validate invite');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);



  const handleInputChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleNewUserSubmit = async (e) => {
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
      const response = await api.post(`/auth/accept-invite/${token}`, {
        password: formData.password,
        name: formData.name 
      });
      
      const data = response.data;
      
      toast.success('Your account has been activated. Redirecting to login...');
      
      // Auto-login if possible
      try {
        await login({ email: formData.email, password: formData.password });
        if (onSuccess) {
          onSuccess(data);
        }
      } catch (loginErr) {
        // If auto-login fails, redirect to login after a short delay
        setTimeout(() => {
          if (onBackToLogin) {
            onBackToLogin();
          }
        }, 3000);
      }
      
    } catch (err) {
      toast.error(err.message || 'Failed to accept invite');
    } finally {
      setLoading(false);
    }
  };

  const handlePendingUserSubmit = async (e) => {
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
      const response = await api.post(`/auth/accept-invite/${token}`, {
        password: formData.password
      });
      
      const data = response.data;
      
      toast.success('Your password has been set. Redirecting to login...');
      
      // Auto-login if possible
      try {
        await login({ email: formData.email, password: formData.password });
        if (onSuccess) {
          onSuccess(data);
        }
      } catch (loginErr) {
        // If auto-login fails, redirect to login after a short delay
        setTimeout(() => {
          if (onBackToLogin) {
            onBackToLogin();
          }
        }, 3000);
      }
      
    } catch (err) {
      toast.error(err.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (validation?.status === 'active') {
      return (
        <Box textAlign="center" py={8}>
          <Typography variant="h5" fontWeight={600} mb={2}>
            Account Already Active
          </Typography>
          <Typography variant="body1" color="textSecondary" mb={4}>
            Your account is already active. Please log in with your credentials.
          </Typography>
          <Button
            variant="contained"
            onClick={onBackToLogin}
            sx={{ mt: 2, fontWeight: 600 }}
          >
            Go to Login
          </Button>
        </Box>
      );
    }

    if (validation?.status === 'expired') {
      return (
        <Box textAlign="center" py={8}>
          <Typography variant="h5" fontWeight={600} mb={2}>
            Invite Link Expired
          </Typography>
          <Typography variant="body1" color="textSecondary" mb={4}>
            This invite link has expired. Please contact your administrator for a new invite.
          </Typography>
          <Button
            variant="outlined"
            onClick={onBackToLogin}
            sx={{ mt: 2, fontWeight: 600 }}
          >
            Return to Login
          </Button>
        </Box>
      );
    }

    // Show registration form for new or pending users
    return (
      <Box component="form" onSubmit={validation?.status === 'new' ? handleNewUserSubmit : handlePendingUserSubmit}>
        <Typography variant="h5" fontWeight={600} mb={2} align="center">
          {validation?.status === 'new' ? 'Complete Your Registration' : 'Set Your Password'}
        </Typography>
        
        {validation?.email && (
          <TextField
            fullWidth
            label="Email"
            value={formData.email}
            disabled
            margin="normal"
            sx={{ mb: 3 }}
          />
        )}
        
        {validation?.status === 'new' && (
          <TextField
            label="Full Name"
            value={formData.name}
            onChange={handleInputChange('name')}
            fullWidth
            required
            margin="normal"
            placeholder="Enter your full name"
          />
        )}
        
        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleInputChange('password')}
          fullWidth
          required
          margin="normal"
          helperText="Minimum 6 characters"
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
          value={formData.confirmPassword}
          onChange={handleInputChange('confirmPassword')}
          fullWidth
          required
          margin="normal"
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
          sx={{ mt: 3, backgroundColor: '#1bcddc', '&:hover': { backgroundColor: '#17b3c0' } }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 
            validation?.status === 'new' ? 'Complete Registration' : 'Set Password'}
        </Button>
        
        <Button
          variant="outlined"
          fullWidth
          sx={{ mt: 2 }}
          onClick={onBackToLogin}
          disabled={loading}
        >
          Return to Login
        </Button>
      </Box>
    );
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
              onClick={onBackToLogin}
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <>
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#f9fafb">
        <Card sx={{ minWidth: 350, maxWidth: 400 }}>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </Box>


    </>
  );
};

export default RegisterForm; 