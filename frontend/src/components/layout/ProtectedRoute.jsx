import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

/**
 * ProtectedRoute - Route-level access control based on RBAC capabilities
 * 
 * @param {React.ReactNode} children - The component to render if access is granted
 * @param {string|string[]} requiredCapability - Single capability or array of capabilities (user needs ANY)
 * @param {boolean} requireAny - If true, user needs ANY of the capabilities. If false (default), user needs ALL.
 * 
 * Usage:
 * <ProtectedRoute requiredCapability="MANAGE_EVENTS">...</ProtectedRoute>
 * <ProtectedRoute requiredCapability={["EDIT_ANY_USER", "EDIT_STAFF_ONLY"]} requireAny>...</ProtectedRoute>
 */
const ProtectedRoute = ({ children, requiredCapability, requireAny = true }) => {
  const { isAuthenticated, loading } = useAuth();
  const permissions = usePermissions();

  // Loading state - wait for auth to complete
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/auth?view=login" replace />;
  }

  // No capability requirement - allow all authenticated users
  if (!requiredCapability) {
    return children;
  }

  // Map capability names to usePermissions keys
  const capabilityToPermissionKey = {
    'MANAGE_EVENTS': 'canManageEvents',
    'VIEW_EVENTS': 'canViewEvents',
    'MANAGE_INVENTORY': 'canManageInventory',
    'CHECK_IN_GUESTS': 'canCheckInGuests',
    'ACCESS_ANALYTICS_FULL': 'canAccessAnalyticsFull',
    'ACCESS_ANALYTICS_BASIC': 'canAccessAnalyticsBasic',
    'EDIT_ANY_USER': 'canEditAnyUser',
    'EDIT_STAFF_ONLY': 'canEditStaffOnly',
    'EDIT_OWN_PROFILE': 'canEditOwnProfile',
    'DELETE_USER': 'canDeleteUsers',
    'INVITE_ADMIN': 'canInviteAdmin',
    'INVITE_OPS': 'canInviteOps',
    'INVITE_STAFF': 'canInviteStaff',
    'ASSIGN_ROLES': 'canAssignRoles',
  };

  // Check if user has required capability(ies)
  const hasAccess = (() => {
    const capabilities = Array.isArray(requiredCapability) 
      ? requiredCapability 
      : [requiredCapability];

    if (requireAny) {
      // User needs ANY of the capabilities
      return capabilities.some(cap => {
        const permissionKey = capabilityToPermissionKey[cap];
        return permissionKey && permissions[permissionKey] === true;
      });
    } else {
      // User needs ALL of the capabilities
      return capabilities.every(cap => {
        const permissionKey = capabilityToPermissionKey[cap];
        return permissionKey && permissions[permissionKey] === true;
      });
    }
  })();

  // User lacks required capability - show access denied
  if (!hasAccess) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={3}>
        <Alert severity="error" sx={{ maxWidth: 600 }}>
          <strong>Access Denied</strong>
          <Box component="div" sx={{ mt: 1 }}>
            You do not have permission to access this page. Please contact your administrator if you believe this is an error.
          </Box>
        </Alert>
      </Box>
    );
  }

  // Access granted
  return children;
};

export default ProtectedRoute;
