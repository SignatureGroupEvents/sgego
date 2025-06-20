import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import EventsList from './components/Events/EventsList';
import CreateEvent from './components/Events/CreateEvent';
import EventDetails from './components/Events/EventDetails';
import UploadGuest from './components/Guest/UploadGuest'
import DashboardLayout from './components/DashboardLayout';
import EventDashboard from './components/Events/EventDashboard';
import InventoryPageWrapper from './components/Inventory/InventoryPage';
import ProfilePage from './components/Profile/ProfilePage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#00B2C0',      // Your main brand color
      contrastText: '#FFFAF6', // For text on primary backgrounds
    },
    secondary: {
      main: '#31365E',      // Your dark brand color
      contrastText: '#FFFAF6',
    },
    background: {
      default: '#FFFAF6',   // Your background color
      paper: '#FFFFFF',
    },
    warning: {
      main: '#CB1033',      // Your warning color
    },
    success: {
      main: '#00B2C0',      // You can use your main color or another for success
    },
    info: {
      main: '#FAA951',      // Accent as info, or adjust as needed
    },
    accent: {
      main: '#FAA951',      // Not standard in MUI, but you can use it in your custom components
    },
    text: {
      primary: '#31365E',   // Your font color
      secondary: '#31365E',
    },
  },
  typography: {
    fontFamily: "'Work Sans', Arial, sans-serif",
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
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
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/profile/:userId" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to="/events" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;