import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import theme from './styles/theme';

// Components
import ProtectedRoute from './components/layout/ProtectedRoute';
import EventsList from './components/Events/EventsList.jsx';
import CreateEvent from './components/Events/CreateEvent.jsx';
import EventDetails from './components/Events/EventDetails.jsx';
import UploadGuest from './components/guests/UploadGuest.jsx';
import DashboardLayout from './components/layout/DashboardLayout';
import EventDashboardWrapper from './components/Events/EventDashboardWrapper.jsx';
import InventoryPageWrapper from './components/Inventory/InventoryPage.jsx';
import AccountPage from "./pages/account/AccountPage.jsx";
import AccountEditPage from "./pages/account/AccountEditPage.jsx";
// import f from "./pages/user-management/UserManagement.jsx";
import UserProfile from "./pages/profile/UserProfile.jsx";
import AuthPage from "./pages/auth/AuthPage.jsx";
import AdvancedDashboard from './pages/Dashboard/AdvancedDashboard';
import HelpPage from "./pages/HelpPage";
import GuestDetailPage from './components/guests/GuestDetailPage';

// Analytics Test Components
import SpecificAnalyticsExamples from './components/analytics/SpecificAnalyticsExamples';
import ComprehensiveAnalytics from './components/analytics/ComprehensiveAnalytics';

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
            <Route path="/" element={<Navigate to="/auth?view=login" replace />} />
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
                <EventDashboardWrapper />
              </ProtectedRoute>
            } />
            <Route path="/events/:eventId/dashboard" element={
              <ProtectedRoute>
                <EventDashboardWrapper />
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
            <Route path="/events/:eventId/guests/:guestId" element={
              <ProtectedRoute>
                <GuestDetailPage />
              </ProtectedRoute>
            } />
            {/* Account Routes */}
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

            {/* Profile Routes */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />
            <Route path="/profile/:userId" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />
            <Route path="/profile/edit/:userId" element={
              <ProtectedRoute>
                <AccountEditPage />
              </ProtectedRoute>
            } />
            <Route path="/help" element={
              <ProtectedRoute>
                <HelpPage />
              </ProtectedRoute>
            } />
            {/* Remove duplicate routes - these are handled by the event-specific routes above */}

            {/* 🧪 TEST ROUTES for Analytics Components */}
            <Route path="/test-analytics/:eventId" element={
              <ProtectedRoute>
                <SpecificAnalyticsExamples />
              </ProtectedRoute>
            } />
            <Route path="/comprehensive-analytics/:eventId" element={
              <ProtectedRoute>
                <ComprehensiveAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/events/:eventId/analytics" element={
              <ProtectedRoute>
                <SpecificAnalyticsExamples />
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
// Updated Wed Jul 23 14:27:05 EDT 2025
