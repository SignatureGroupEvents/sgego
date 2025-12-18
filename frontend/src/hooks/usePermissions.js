import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS } from '../constants/permissions';

export const usePermissions = () => {
  const { user } = useAuth();
  const role = user?.role || 'staff';
  
  // Normalize role name: backend uses 'operations_manager', permissions.js uses 'operationsManager'
  const normalizedRole = role === 'operations_manager' ? 'operationsManager' : role;

  const can = (capability) => PERMISSIONS[capability].includes(normalizedRole);

  return {
    role,
    user,
    userId: user?.id ?? null,

    // INVITES
    canInviteAdmin: can('INVITE_ADMIN'),
    canInviteOps: can('INVITE_OPS'),
    canInviteStaff: can('INVITE_STAFF'),
    canInviteUsers: can('INVITE_ADMIN') || can('INVITE_OPS') || can('INVITE_STAFF'), // Can invite any user type
    canResendInvite: can('RESEND_INVITE'),

    // USER MANAGEMENT
    canDeleteUsers: can('DELETE_USER'),
    canEditAnyUser: can('EDIT_ANY_USER'),
    canEditStaffOnly: can('EDIT_STAFF_ONLY'),
    canEditOwnProfile: can('EDIT_OWN_PROFILE'),

    // 🟢 LEGACY SUPPORT for existing UI EDIT BUTTON logic
    canManageUsers: can('EDIT_ANY_USER') || can('EDIT_STAFF_ONLY'),

    // EVENTS
    canManageEvents: can('MANAGE_EVENTS'),
    canViewEvents: can('VIEW_EVENTS'),

    // INVENTORY
    canManageInventory: can('MANAGE_INVENTORY'),
    canViewInventory: can('VIEW_INVENTORY'),

    // CHECK-IN
    canCheckInGuests: can('CHECK_IN_GUESTS'),

    // ANALYTICS
    canAccessAnalyticsFull: can('ACCESS_ANALYTICS_FULL'),
    canAccessAnalyticsBasic: can('ACCESS_ANALYTICS_BASIC'),

    // ROLES
    canAssignRoles: can('ASSIGN_ROLES'),

    // ROLE FLAGS
    isAdmin: role === 'admin',
    isOperationsManager: role === 'operations_manager',
    isStaff: role === 'staff',
  };
};
