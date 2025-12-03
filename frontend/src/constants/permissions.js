// SGEGO Role Permission Capabilities
// This file maps directly to src/docs/permissions-matrix.md
// If this file changes, update the matrix before merging.

export const PERMISSIONS = {
    INVITE_ADMIN: ['admin'], // Only Admin may create Admin users
  
    INVITE_OPS: ['admin', 'operationsManager'], // Admin and Ops can invite Operations Managers
  
    INVITE_STAFF: ['admin', 'operationsManager', 'staff'],
    // Admin → Staff
    // Ops → Staff
    // Staff → Staff only (restricted in UI and backend)
  
    RESEND_INVITE: ['admin', 'operationsManager'],
  
    DELETE_USER: ['admin'], // Only Admin can delete users
  
    EDIT_ANY_USER: ['admin'],
    EDIT_STAFF_ONLY: ['operationsManager'],
  
    EDIT_OWN_PROFILE: ['admin', 'operationsManager'],
    // Staff can edit name only during registration (backend rule)
  
    MANAGE_EVENTS: ['admin', 'operationsManager'],
    VIEW_EVENTS: ['admin', 'operationsManager', 'staff'],
  
    MANAGE_INVENTORY: ['admin', 'operationsManager'],
    CHECK_IN_GUESTS: ['admin', 'operationsManager', 'staff'],
  
    ACCESS_ANALYTICS_FULL: ['admin'], // Complete analytics suite
    ACCESS_ANALYTICS_BASIC: ['admin', 'operationsManager'], // Staff excluded
  
    ASSIGN_ROLES: ['admin'], // Ops cannot change roles
  };
  