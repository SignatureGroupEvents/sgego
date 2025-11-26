// src/hooks/usePermissions.ts
import { useAuth } from '../contexts/AuthContext';

const ROLE_PERMISSIONS = {
  admin: {
    canInviteUsers: true,
    canResendInvite: true,
    canDeleteUsers: true,
    canManageUsers: true,       // edit/update any user
    canManageEvents: true,
    canViewEvents: true,
    canAccessAnalytics: true,
  },

  operations_manager: {
    canInviteUsers: true,
    canResendInvite: true,
    canDeleteUsers: false,
    canManageUsers: true,       // can edit Staff + Ops
    canManageEvents: true,
    canViewEvents: true,
    canAccessAnalytics: true,
  },

  staff: {
    canInviteUsers: true,       // can add Staff only
    canResendInvite: false,
    canDeleteUsers: false,
    canManageUsers: false,      // can edit ONLY themselves (enforced backend)
    canManageEvents: false,
    canViewEvents: true,
    canAccessAnalytics: false,
  },
};

export const usePermissions = () => {
  const { user } = useAuth();
  const role = user?.role || 'staff';

  return {
    ...ROLE_PERMISSIONS[role],

    role,
    isAdmin: role === 'admin',
    isOperationsManager: role === 'operations_manager',
    isStaff: role === 'staff',
    userId: user?.id ?? null,
    user,
  };
};
