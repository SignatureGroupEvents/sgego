import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
  useSearchParams,
  useNavigate,
} from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import theme from './styles/theme';

// Components
import ProtectedRoute from './components/layout/ProtectedRoute';
import EventsList from './components/Events/EventsList.jsx';
import ArchivedEventsList from './components/Events/ArchivedEventsList.jsx';
import CreateEvent from './components/Events/CreateEvent.jsx';
import EventDetails from './components/Events/EventDetails.jsx';
import UploadGuest from './components/guests/UploadGuest.jsx';
import UploadInventory from './components/Inventory/UploadInventory.jsx';
import DashboardLayout from './components/layout/DashboardLayout';
import EventDashboardWrapper from './components/Events/EventDashboardWrapper.jsx';
import InventoryPageWrapper from './components/Inventory/InventoryPage.jsx';
import ManageTeamWrapper from './components/Events/ManageTeam.jsx';
import ClientPortalSettings from './pages/Events/ClientPortalSettings.jsx';
import PortalLoginPage from './pages/Portal/PortalLoginPage.jsx';
import PortalDashboardPage from './pages/Portal/PortalDashboardPage.jsx';
import PortalAdvancedPage from './pages/Portal/PortalAdvancedPage.jsx';
import AccountPage from "./pages/Account/AccountPage.jsx";
import AccountEditPage from "./pages/Account/AccountEditPage.jsx";
// import f from "./pages/user-management/UserManagement.jsx";
import UserProfile from "./pages/profile/UserProfile.jsx";
import AuthPage from "./pages/Auth/AuthPage.jsx";
import AdvancedDashboard from './pages/Dashboard/AdvancedDashboard';
import HelpPage from "./pages/HelpPage";
import GuestDetailPage from './components/guests/GuestDetailPage';

// Analytics Test Components
import SpecificAnalyticsExamples from './components/analytics/SpecificAnalyticsExamples';
import ComprehensiveAnalytics from './components/analytics/ComprehensiveAnalytics';

function InviteRedirect() {
  const { token } = useParams();
  // Ensure token is present and redirect to register form
  if (!token) {
    return <Navigate to="/auth?view=login" replace />;
  }
  return <Navigate to={`/auth?view=register&token=${token}`} replace />;
}

function ResetPasswordTokenRedirect() {
  const { token } = useParams();
  return <Navigate to={`/auth?view=reset-password&token=${token}`} replace />;
}

/** Root `/`: send restored sessions to the app; otherwise to login. */
function RootRedirect() {
  const { user, loading } = useAuth();
  const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('token');

  if (loading && hasToken) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#fef8f4">
        <CircularProgress />
      </Box>
    );
  }
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/auth?view=login" replace />;
}

/**
 * `/auth`: if internal user is already restored, skip the login screen (handled in App per routing).
 */
function InternalAuthRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const view = searchParams.get('view') || 'login';
  const inviteToken = searchParams.get('token');
  const shouldShowRegister = view === 'register' && inviteToken;

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (shouldShowRegister) return;
    if (view !== 'login') return;
    navigate('/dashboard', { replace: true });
  }, [loading, user, view, shouldShowRegister, navigate]);

  const restoringSession =
    loading &&
    view === 'login' &&
    !shouldShowRegister &&
    typeof localStorage !== 'undefined' &&
    !!localStorage.getItem('token');

  if (restoringSession) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#fef8f4">
        <CircularProgress />
      </Box>
    );
  }

  return <AuthPage />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            {/* Auth routes */}
            <Route path="/auth" element={<InternalAuthRoute />} />
            <Route path="/login" element={<Navigate to="/auth?view=login" replace />} />
            <Route path="/invite/:token" element={<InviteRedirect />} />
            <Route path="/reset-password" element={<Navigate to="/auth?view=forgot-password" replace />} />
            <Route path="/reset-password/:token" element={<ResetPasswordTokenRedirect />} />

            {/* Client Portal (no normal auth; portal token only) */}
            <Route path="/portal/:eventId/login" element={<PortalLoginPage />} />
            <Route path="/portal/:eventId/dashboard" element={<PortalDashboardPage />} />
            <Route path="/portal/:eventId/advanced" element={<PortalAdvancedPage />} />

            {/* Dashboard + event routes */}
            {/* VIEW_EVENTS: Admin, Ops, Staff - all authenticated users */}
            <Route path="/dashboard" element={
              <ProtectedRoute requiredCapability="VIEW_EVENTS">
                <DashboardLayout />
              </ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute requiredCapability="VIEW_EVENTS">
                <EventsList />
              </ProtectedRoute>
            } />
            <Route path="/events/archived" element={
              <ProtectedRoute requiredCapability="VIEW_EVENTS">
                <ArchivedEventsList />
              </ProtectedRoute>
            } />
            
            {/* MANAGE_EVENTS: Admin, Ops only */}
            <Route path="/events/new" element={
              <ProtectedRoute requiredCapability="MANAGE_EVENTS">
                <CreateEvent />
              </ProtectedRoute>
            } />
            
            {/* VIEW_EVENTS: Admin, Ops, Staff */}
            <Route path="/events/:eventId" element={
              <ProtectedRoute requiredCapability="VIEW_EVENTS">
                <EventDashboardWrapper />
              </ProtectedRoute>
            } />
            <Route path="/events/:eventId/dashboard" element={
              <ProtectedRoute requiredCapability="VIEW_EVENTS">
                <EventDashboardWrapper />
              </ProtectedRoute>
            } />

            {/* ACCESS_ANALYTICS_FULL: Admin and Ops only */}
            <Route path="/events/:eventId/dashboard/advanced" element={
              <ProtectedRoute requiredCapability="ACCESS_ANALYTICS_FULL">
                <AdvancedDashboard />
              </ProtectedRoute>
            } />

            {/* VIEW_EVENTS: Admin, Ops, Staff */}
            <Route path="/events/:eventId/details" element={
              <ProtectedRoute requiredCapability="VIEW_EVENTS">
                <EventDetails />
              </ProtectedRoute>
            } />
            
            {/* CHECK_IN_GUESTS: Admin, Ops, Staff */}
            <Route path="/events/:eventId/upload" element={
              <ProtectedRoute requiredCapability="CHECK_IN_GUESTS">
                <UploadGuest />
              </ProtectedRoute>
            } />
            
            {/* VIEW_INVENTORY: Admin, Ops, Staff - Staff can view but not modify */}
            <Route path="/events/:eventId/inventory" element={
              <ProtectedRoute requiredCapability={["VIEW_INVENTORY", "MANAGE_INVENTORY"]} requireAny>
                <InventoryPageWrapper />
              </ProtectedRoute>
            } />
            <Route path="/events/:eventId/inventory/upload" element={
              <ProtectedRoute requiredCapability="MANAGE_INVENTORY">
                <UploadInventory />
              </ProtectedRoute>
            } />
            
            {/* MANAGE_EVENTS: Admin, Ops only */}
            <Route path="/events/:eventId/team" element={
              <ProtectedRoute requiredCapability="MANAGE_EVENTS">
                <ManageTeamWrapper />
              </ProtectedRoute>
            } />
            <Route path="/events/:eventId/client-portal" element={
              <ProtectedRoute requiredCapability="MANAGE_EVENTS">
                <ClientPortalSettings />
              </ProtectedRoute>
            } />
            
            {/* CHECK_IN_GUESTS: Admin, Ops, Staff */}
            <Route path="/events/:eventId/guests/:guestId" element={
              <ProtectedRoute requiredCapability="CHECK_IN_GUESTS">
                <GuestDetailPage />
              </ProtectedRoute>
            } />
            {/* Account Routes */}
            {/* EDIT_ANY_USER, EDIT_STAFF_ONLY, or INVITE_STAFF: Admin/Ops can manage users, Staff can invite */}
            <Route path="/account" element={
              <ProtectedRoute requiredCapability={["EDIT_ANY_USER", "EDIT_STAFF_ONLY", "INVITE_STAFF"]} requireAny>
                <AccountPage />
              </ProtectedRoute>
            } />
            <Route path="/account/:userId" element={
              <ProtectedRoute requiredCapability={["EDIT_ANY_USER", "EDIT_STAFF_ONLY", "INVITE_STAFF"]} requireAny>
                <AccountPage />
              </ProtectedRoute>
            } />
            {/* Component-level checks handle who can edit which user */}
            <Route path="/account/edit/:userId" element={
              <ProtectedRoute>
                <AccountEditPage />
              </ProtectedRoute>
            } />

            {/* Profile Routes */}
            {/* Component handles own profile vs others - no route restriction needed */}
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
            
            {/* Help - All authenticated users */}
            <Route path="/help" element={
              <ProtectedRoute>
                <HelpPage />
              </ProtectedRoute>
            } />
            {/* Remove duplicate routes - these are handled by the event-specific routes above */}

            {/* 🧪 TEST ROUTES for Analytics Components */}
            {/* ACCESS_ANALYTICS_FULL: Admin and Ops only */}
            <Route path="/test-analytics/:eventId" element={
              <ProtectedRoute requiredCapability="ACCESS_ANALYTICS_FULL">
                <SpecificAnalyticsExamples />
              </ProtectedRoute>
            } />
            <Route path="/comprehensive-analytics/:eventId" element={
              <ProtectedRoute requiredCapability="ACCESS_ANALYTICS_FULL">
                <ComprehensiveAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/events/:eventId/analytics" element={
              <ProtectedRoute requiredCapability="ACCESS_ANALYTICS_FULL">
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
