// SGEGO Role Permission Capabilities
// This file maps directly to src/docs/permissions-matrix.md
// If this file changes, update the matrix before merging.

export const PERMISSIONS = {
    INVITE_ADMIN: ['admin'], // Only Admin may create Admin users
  
    INVITE_OPS: ['admin', 'operations_manager'], // Admin and Ops can invite Operations Managers
  
    INVITE_STAFF: ['admin', 'operations_manager', 'staff'],
    // Admin → Staff
    // Ops → Staff
    // Staff → Staff only (restricted in UI and backend)
  
    RESEND_INVITE: ['admin', 'operations_manager'],
  
    DELETE_USER: ['admin'], // Admin can delete any user
    DELETE_STAFF: ['admin', 'operations_manager'], // Admin and Ops can delete staff users
  
    EDIT_ANY_USER: ['admin'],
    EDIT_STAFF_ONLY: ['operations_manager'],
  
    EDIT_OWN_PROFILE: ['admin', 'operations_manager'],
    // Staff can edit name only during registration (backend rule)
  
    MANAGE_EVENTS: ['admin', 'operations_manager'],
    VIEW_EVENTS: ['admin', 'operations_manager', 'staff'],
  
    MANAGE_INVENTORY: ['admin', 'operations_manager'],
    VIEW_INVENTORY: ['admin', 'operations_manager', 'staff'],
    CHECK_IN_GUESTS: ['admin', 'operations_manager', 'staff'],
  
    ACCESS_ANALYTICS_FULL: ['admin', 'operations_manager'], // Complete analytics suite - Admin and Ops
    ACCESS_ANALYTICS_BASIC: ['admin', 'operations_manager'], // Staff excluded
  
    ASSIGN_ROLES: ['admin'], // Ops cannot change roles
  };
  