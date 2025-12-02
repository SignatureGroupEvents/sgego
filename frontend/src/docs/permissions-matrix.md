![RBAC Version](https://img.shields.io/badge/RBAC-v1.0.0-blue)

SGEGO Role-Based Access Control (RBAC) Permission Matrix

Last updated: 2025-02-27
Source of truth for UI permissions, backend enforcement, and user role expectations.

🎯 Overview

SGEGO uses a capability-based RBAC system.
Roles define what a user may do, not how the backend executes it.

Current system roles:
Role	Description
Admin	Full control of users, events, analytics, permissions, and system configuration
Operations Manager	Manages users (except Admin roles), events, inventory, check-ins, and basic analytics
Staff	Can be assigned to events, check in guests, and invite other staff only
🔐 Permissions by Capability

The table below defines which role can perform which action.

Capability	Admin	Ops Manager	Staff	Notes
INVITE_ADMIN	✔	✖	✖	Only Admins can create more Admins
INVITE_OPS	✔	✖	✖	Prevent privilege escalation
INVITE_STAFF	✔	✔	✔	Staff may only invite Staff (backend enforced)
RESEND_INVITE	✔	✔	✖	Staff cannot resend invites
DELETE_USER	✔	✔*	✖	Ops may delete staff only
EDIT_ANY_USER	✔	✖	✖	Only Admin can modify anyone
EDIT_STAFF_ONLY	✖	✔	✖	Ops can edit Staff and Ops (not Admins)
EDIT_OWN_PROFILE	✔	✔	✔	Staff may only edit name (email locked)
MANAGE_EVENTS	✔	✔	✖	Staff cannot modify event settings
VIEW_EVENTS	✔	✔	✔	All roles can view events assigned to them
MANAGE_INVENTORY	✔	✔	✖	Inventory is an Ops+Admin responsibility
CHECK_IN_GUESTS	✔	✔	✔	All operational roles can check attendees in
ACCESS_ANALYTICS_FULL	✔	✖	✖	Complete suite: exports, insights, etc.
ACCESS_ANALYTICS_BASIC	✔	✔	✖	Ops has dashboard viewing only
ASSIGN_ROLES	✔	✖	✖	Role changes restricted to Admin
🧩 Backend Controller Mapping

This section shows which backend functions are gated by each permission.

User Management
Backend Function	Capability
inviteUser	INVITE_*
resendInvite	RESEND_INVITE
getAllUsers	EDIT_ANY_USER / EDIT_STAFF_ONLY
getUserProfile	EDIT_ANY_USER / EDIT_OWN_PROFILE
updateUserProfile	EDIT_ANY_USER / EDIT_STAFF_ONLY / EDIT_OWN_PROFILE
createUser	ASSIGN_ROLES
updateUserRole	ASSIGN_ROLES
deactivateUser	DELETE_USER
deleteUser	DELETE_USER
resetUserPassword	EDIT_ANY_USER
sendPasswordResetLink	EDIT_ANY_USER
Events
Backend Function	Capability
assignUserToEvents	MANAGE_EVENTS
getEventAssignedUsers	MANAGE_EVENTS
removeUserFromEvent	MANAGE_EVENTS
updateUserAssignment	MANAGE_EVENTS
getAvailableEvents	VIEW_EVENTS
getUserAssignedEvents	VIEW_EVENTS
getMyAssignedEvents	VIEW_EVENTS
addToMyEvents	MANAGE_EVENTS
removeFromMyEvents	MANAGE_EVENTS
updateMyEventsPositions	MANAGE_EVENTS
Analytics & Other Modules
Module	Capability
Inventory Controller	MANAGE_INVENTORY
Check-in Controller	CHECK_IN_GUESTS
Analytics Controller	ACCESS_ANALYTICS_FULL / ACCESS_ANALYTICS_BASIC
🧠 RBAC Intent vs Backend Action

This system is intentionally layered:

Layer	Responsibility
Backend	Implements actions (e.g., deleteUser, assignEvents)
permissions.js	Defines who may do what
usePermissions.js	Exposes booleans for UI components
Components	Render buttons and routes based on permissions

The UI never checks role === "admin" — it checks capabilities.

🚨 Rules & Enforcement

Staff cannot escalate privileges — they may only invite Staff

Ops cannot assign roles or create Admins

Emails are immutable after registration

Name changes are allowed for all roles

Backend always enforces the above, even if UI is bypassed