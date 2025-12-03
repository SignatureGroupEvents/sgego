# Profile Management System

This document describes the comprehensive profile management system implemented for the Event Check-in App.

## Features

### User Profile Management
- **Personal Profile View**: Users can view and edit their own profile information
- **Profile Editing**: Update email, username, and password
- **Role Display**: Shows current user role with color-coded chips
- **Last Login Tracking**: Displays when the user last logged in

### User Administration (Admin & Operations Manager)
- **User List**: View all active users in the system
- **Create Users**: Add new staff and operations manager accounts
- **Role Management**: Admins can update user roles
- **Event Assignment**: Assign staff to specific events/programs
- **User Deactivation**: Safely deactivate users (admin only)
- **User Deletion**: Permanently delete users (admin only)

### Staff Access Control
- **Event Filtering**: Staff only see events they are assigned to
- **Limited Permissions**: Staff can only check-in guests and log inventory
- **Assignment Management**: Managers can assign staff to multiple events

## User Roles & Permissions

### Administrator
- Full system access
- Can create, edit, and delete all users
- Can assign any role to users
- Can manage all events and data
- Can deactivate/delete users

### Operations Manager
- Can create staff and operations manager accounts
- Cannot create admin accounts
- Can assign staff to events
- Can manage events and inventory
- Cannot delete users (only admins can)

### Staff
- Can only view assigned events
- Can perform guest check-ins
- Can log inventory
- Can edit their own profile
- Cannot create users or manage events

## Backend Implementation

### New Models
- **UserAssignment**: Tracks which staff are assigned to which events
- **Enhanced User Model**: Includes role-based permissions

### API Endpoints
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users` - Get all users (admin/manager only)
- `POST /api/users` - Create new user (admin/manager only)
- `PUT /api/users/:userId/role` - Update user role (admin only)
- `PUT /api/users/:userId/assign-events` - Assign user to events
- `GET /api/users/:userId/assigned-events` - Get user's assigned events
- `GET /api/users/available-events` - Get events for assignment
- `PUT /api/users/:userId/deactivate` - Deactivate user (admin only)
- `DELETE /api/users/:userId` - Delete user (admin only)

### Security Features
- Role-based access control
- Password validation for profile updates
- Unique email/username validation
- Soft delete for users with activity history
- Assignment tracking for audit purposes

## Frontend Implementation

### Profile Page Component
- **Personal Profile Mode**: Shows user's own profile with edit capabilities
- **User Management Mode**: Shows all users with management tools
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Immediate feedback for all actions

### Navigation Integration
- Profile link added to TopNavBar
- Breadcrumb navigation
- Role-based menu visibility

### Event Filtering
- Staff users only see assigned events
- Automatic filtering in EventsList, SidebarEventsList, and Dashboard
- Seamless user experience with proper access control

## Usage Examples

### For Staff Users
1. Navigate to Profile to view/edit personal information
2. Only assigned events appear in the events list
3. Can perform check-ins and inventory logging for assigned events

### For Operations Managers
1. Access Profile to manage all users
2. Create new staff accounts
3. Assign staff to specific events
4. Manage events and inventory

### For Administrators
1. Full user management capabilities
2. Can create any type of user account
3. Can assign any role to users
4. Can deactivate or delete users
5. Complete system oversight

## Security Considerations

- All user management endpoints are protected with authentication
- Role-based middleware ensures proper access control
- Password changes require current password verification
- User deletion checks for existing activity before allowing
- Assignment tracking provides audit trail

## Database Schema

### UserAssignment Collection
```javascript
{
  userId: ObjectId (ref: User),
  eventId: ObjectId (ref: Event),
  assignedBy: ObjectId (ref: User),
  isActive: Boolean,
  assignedAt: Date,
  timestamps: true
}
```

### Enhanced User Collection
```javascript
{
  email: String (unique),
  username: String (unique),
  password: String (hashed),
  role: String (enum: ['admin', 'operations_manager', 'staff']),
  lastLogin: Date,
  isActive: Boolean,
  timestamps: true
}
```

## Error Handling

- Comprehensive error messages for all operations
- Validation for email/username uniqueness
- Graceful handling of permission errors
- User-friendly error display in UI
- Proper HTTP status codes for all responses 
- Alyssa's updates