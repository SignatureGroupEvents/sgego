import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import LoginForm from '../../components/Auth/LoginForm';
import RegisterForm from '../../components/Auth/RegisterForm';
import ResetPasswordForm from '../../components/Auth/ResetPasswordForm';
import ForgotPasswordForm from '../../components/Auth/ForgotPasswordForm';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const view = searchParams.get('view') || 'login';
  const token = searchParams.get('token');

  const handleLoginSuccess = (result) => {
    // Redirect to events page after successful login
    navigate('/events');
  };

  const handleRegisterSuccess = (result) => {
    // Redirect to events page after successful registration
    navigate('/events');
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