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
  Snackbar,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { validateResetToken, resetPassword } from '../services/api';

interface ResetValidation {
  email: string;
  status: 'valid' | 'expired';
  message: string;
}

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  // State for validation
  const [validation, setValidation] = useState<ResetValidation | null>(null);
  const [validating, setValidating] = useState(true);
  const [validationError, setValidationError] = useState('');
  
  // State for form
  const [formData, setFormData] = useState({
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

  // Validate reset token on page load
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidationError('No reset token provided');
        setValidating(false);
        return;
      }

      try {
        const response = await validateResetToken(token);
        const data = response.data;
        setValidation(data);
        
        if (data.status === 'expired') {
          showToast('This reset link has expired. Please request a new one.', 'warning');
        }
        
      } catch (err: any) {
        setValidationError(err.response?.data?.message || 'Failed to validate reset token');
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

  const handleSubmit = async (e: React.FormEvent) => {
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
      const response = await resetPassword(token!, formData.password);
      
      showToast('Your password has been set. Redirecting to login...', 'success');
      
      // Redirect to login after a short delay
      setTimeout(() => navigate('/login'), 3000);
      
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to reset password', 'error');
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
            <Typography variant="h6">Validating your reset link...</Typography>
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

  // Expired token state
  if (validation?.status === 'expired') {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#f9fafb">
        <Card sx={{ minWidth: 350, maxWidth: 400 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>Reset Link Expired</Typography>
            <Alert severity="warning" sx={{ mb: 3 }}>
              This password reset link has expired. Please contact your administrator for a new reset link.
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

  // Valid token - show reset form
  return (
    <>
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#f9fafb">
        <Card sx={{ minWidth: 350, maxWidth: 400 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>Reset Your Password</Typography>
            <Typography variant="body2" color="textSecondary" mb={3}>
              Set a new password for your account.
            </Typography>
            
            {validation?.email && (
              <Alert severity="info" sx={{ mb: 3 }}>
                Resetting password for: {validation.email}
              </Alert>
            )}
            
            <form onSubmit={handleSubmit}>
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
                {loading ? <CircularProgress size={24} /> : 'Reset Password'}
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

export default ResetPasswordPage; 