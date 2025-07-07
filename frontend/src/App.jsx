import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import theme from './styles/theme';

// Components
import Dashboard from './components/dashboard/Dashboard';
import ProtectedRoute from './components/layout/ProtectedRoute';
import EventsList from './components/events/EventsList';
import CreateEvent from './components/Events/CreateEvent';
import EventDetails from './components/Events/EventDetails';
import UploadGuest from './components/guests/UploadGuest';
import DashboardLayout from './components/layout/DashboardLayout';
import EventDashboard from './components/events/EventDashboard';
import InventoryPageWrapper from './components/inventory/InventoryPage';
import AccountPage from './pages/AccountPage';

import AccountEditPage from './pages/AccountEditPage.jsx';
import AuthPage from './pages/AuthPage';
import AdvancedDashboard from './pages/AdvancedDashboard';

function InviteRedirect() {
  const { token } = useParams();
  return <Navigate to={`/auth?view=register&token=${token}`} replace />;
}

function ResetPasswordTokenRedirect() {
  const { token } = useParams();
  return <Navigate to={`/auth?view=reset-password&token=${token}`} replace />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Auth routes */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<Navigate to="/auth?view=login" replace />} />
            <Route path="/invite/:token" element={<InviteRedirect />} />
            <Route path="/reset-password" element={<Navigate to="/auth?view=forgot-password" replace />} />
            <Route path="/reset-password/:token" element={<ResetPasswordTokenRedirect />} />

            {/* Dashboard + event routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute>
                <EventsList />
              </ProtectedRoute>
            } />
            <Route path="/events/new" element={
              <ProtectedRoute>
                <CreateEvent />
              </ProtectedRoute>
            } />
            <Route path="/events/:eventId" element={
              <ProtectedRoute>
                <EventDashboard />
              </ProtectedRoute>
            } />
            <Route path="/events/:eventId/dashboard" element={
              <ProtectedRoute>
                <EventDashboard />
              </ProtectedRoute>
            } />
            
            {/* ✅ NEW ROUTE for advanced view */}
            <Route path="/events/:eventId/dashboard/advanced" element={
              <ProtectedRoute>
                <AdvancedDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/events/:eventId/details" element={
              <ProtectedRoute>
                <EventDetails />
              </ProtectedRoute>
            } />
            <Route path="/events/:eventId/upload" element={
              <ProtectedRoute>
                <UploadGuest />
              </ProtectedRoute>
            } />
            <Route path="/events/:eventId/inventory" element={
              <ProtectedRoute>
                <InventoryPageWrapper />
              </ProtectedRoute>
            } />
            <Route path="/account" element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            } />
            <Route path="/account/:userId" element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            } />
            <Route path="/account/edit/:userId" element={
              <ProtectedRoute>
                <AccountEditPage />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Navigate to="/dashboard/advanced" replace />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/advanced" element={
              <ProtectedRoute>
                <AdvancedDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>

      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4caf50',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#f44336',
              secondary: '#fff',
            },
          },
        }}
      />
    </ThemeProvider>
  );
}

export default App;
