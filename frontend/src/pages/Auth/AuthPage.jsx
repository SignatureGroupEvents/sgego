import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import LoginForm from '../../components/auth/LoginForm';
import RegisterForm from '../../components/auth/RegisterForm';
import ResetPasswordForm from '../../components/auth/ResetPasswordForm';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const view = searchParams.get('view') || 'login';
  const token = searchParams.get('token');

  const handleLoginSuccess = () => {
    navigate('/dashboard');
  };

  const handleRegisterSuccess = () => {
    navigate('/dashboard');
  };

  const handleResetSuccess = () => {
    setTimeout(() => navigate('/auth?view=login'), 3000);
  };

  const handleForgotPasswordSuccess = () => {};

  const handleBackToLogin = () => {
    navigate('/auth?view=login');
  };

  const handleForgotPassword = () => {
    navigate('/auth?view=forgot-password');
  };

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
      return (
        <LoginForm
          onSuccess={handleLoginSuccess}
          onForgotPassword={handleForgotPassword}
        />
      );
  }
};

export default AuthPage;
