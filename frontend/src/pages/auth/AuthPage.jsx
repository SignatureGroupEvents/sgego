import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from '../../components/auth/LoginForm';
import RegisterForm from '../../components/auth/RegisterForm';
import ResetPasswordForm from '../../components/auth/ResetPasswordForm';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const view = searchParams.get('view') || 'login';
  const token = searchParams.get('token');

  // Redirect all users to dashboard after login
  const getRedirectPath = (userRole) => {
    return '/dashboard';
  };

  const handleLoginSuccess = (result) => {
    // User data is included in result from login function
    const userRole = result?.user?.role || user?.role;
    navigate(getRedirectPath(userRole));
  };

  const handleRegisterSuccess = (result) => {
    // User data is included in result from RegisterForm's auto-login
    const userRole = result?.user?.role || user?.role;
    navigate(getRedirectPath(userRole));
  };

  const handleResetSuccess = (result) => {
    // Redirect to login page after successful password reset
    setTimeout(() => navigate('/auth?view=login'), 3000);
  };

  const handleForgotPasswordSuccess = () => {
    // Stay on the same page, success message is shown
  };

  const handleBackToLogin = () => {
    navigate('/auth?view=login');
  };

  const handleForgotPassword = () => {
    navigate('/auth?view=forgot-password');
  };

  // Render the appropriate form based on the view parameter
  switch (view) {
    case 'login':
      return (
        <LoginForm 
          onSuccess={handleLoginSuccess}
          onForgotPassword={handleForgotPassword}
        />
      );
    
    case 'register':
      return (
        <RegisterForm 
          token={token}
          onSuccess={handleRegisterSuccess}
          onBackToLogin={handleBackToLogin}
        />
      );
    
    case 'reset-password':
      return (
        <ResetPasswordForm 
          token={token}
          onSuccess={handleResetSuccess}
          onBackToLogin={handleBackToLogin}
        />
      );
    
    case 'forgot-password':
      return (
        <ForgotPasswordForm 
          onSuccess={handleForgotPasswordSuccess}
          onBackToLogin={handleBackToLogin}
        />
      );
    
    default:
      // Default to login if view is not recognized
      return (
        <LoginForm 
          onSuccess={handleLoginSuccess}
          onForgotPassword={handleForgotPassword}
        />
      );
  }
};

export default AuthPage; 