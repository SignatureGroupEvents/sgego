# User Sections Documentation

This document provides a comprehensive overview of all User Sections in the Event Check-in App, including their functionality, features, and usage.

## Table of Contents

1. [User Management Settings Page](#user-management-settings-page)
2. [User Profile Page](#user-profile-page)
3. [Account Edit Page](#account-edit-page)
4. [Invite User Form](#invite-user-form)
5. [Account Filters Component](#account-filters-component)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Navigation & Routes](#navigation--routes)

---

## User Management Settings Page

**Route:** `/account`  
**Component:** `AccountPage.jsx`  
**Access:** Admin, Operations Manager, Staff (view-only for Staff)

### Overview
The User Management Settings page is the central hub for managing all users in the system. It provides a comprehensive view of all users with filtering, searching, and management capabilities.

### Features

#### 1. User List Table
- **Displays:**
  - User Name (username or name)
  - Email Address
  - Role (with color-coded chips)
  - Account Status (Active/Pending)
  - Action buttons (Edit/Delete)

#### 2. Invite Users
- **Button:** "INVITE USERS" (top right)
- **Functionality:**
  - Opens a modal dialog with the Invite User Form
  - Allows inviting new users via email
  - Supports assigning roles during invitation
  - Sends invitation email to the user

#### 3. Filtering & Search
- **Status Tabs:**
  - **All:** Shows all users regardless of status
  - **Pending:** Shows users who have been invited but haven't activated their account
  - **Expired:** Shows users with expired invitations
- **Role Filter:**
  - Filter by: All, Admin, Operations Manager, Staff
- **Search:**
  - Real-time search by username/name or email
  - Debounced search (300ms delay)

#### 4. Pagination
- Configurable rows per page: 5, 10, 25
- Page navigation controls
- Shows total count of filtered users

#### 5. User Actions
- **Edit Button:**
  - Available to Admin and Operations Manager
  - Navigates to Account Edit Page (`/account/edit/:userId`)
- **Delete Button:**
  - Available only to Admin
  - Permanently deletes user (with confirmation dialog)
  - Cannot delete yourself

### Role-Based Access

| Role | View Users | Invite Users | Edit Users | Delete Users |
|------|-----------|--------------|------------|--------------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Operations Manager | ✅ | ✅ | ✅ | ❌ |
| Staff | ✅ | ❌ | ❌ | ❌ |

---

## User Profile Page

**Route:** `/profile` or `/profile/:userId`  
**Component:** `UserProfile.jsx`  
**Access:** All authenticated users

### Overview
The User Profile page displays detailed information about a user's account. Users can view their own profile or admins/managers can view other users' profiles.

### Features

#### 1. Profile Card (Left Side)
- **Avatar Display:**
  - Shows user's profile avatar with color
  - Uses AvatarIcon component
- **User Information:**
  - Username (or "No username set")
  - Email address
- **Role Display:**
  - Color-coded role chip
  - Role colors:
    - Admin: `#CB1033` (Red)
    - Staff: `#FAA951` (Orange)
    - Operations Manager: `#31365E` (Navy)
- **Account Status:**
  - Active/Inactive indicator
- **Last Login:**
  - Displays formatted date and time of last login
  - Shows "Not available" if never logged in
- **Member Since:**
  - Account creation date

#### 2. Account Information Card (Right Side)
- **Email Address:**
  - Full email with icon
- **Username:**
  - Username or "Not set"
- **Status Alerts:**
  - Info alert for invited users (pending activation)
  - Warning alert for inactive accounts

#### 3. Edit Profile Button
- **Visibility:**
  - Own profile: Always visible
  - Other users: Only visible to Admin and Operations Manager
- **Action:** Navigates to Account Edit Page

### Display Format
- **Date Formatting:**
  - Last Login: Full date and time (e.g., "January 15, 2025, 10:30 AM")
  - Member Since: Full date (e.g., "January 15, 2025")

---

## Account Edit Page

**Route:** `/account/edit/:userId` or `/profile/edit/:userId`  
**Component:** `AccountEditPage.jsx`  
**Access:** Admin, Operations Manager, or own profile

### Overview
The Account Edit Page allows users to edit account information. The editable fields and permissions vary based on the user's role and whether they're editing their own profile.

### Features

#### 1. Editable Fields

##### First Name & Last Name
- **Who can edit:**
  - Admin: Can edit any user
  - Operations Manager: Can edit any user
  - Users: Cannot edit their own name (read-only)
- **Auto-generation:**
  - If name fields are empty but username exists, username is split into first/last name
  - Username is automatically updated when name changes

##### Email Address
- **Who can edit:**
  - Admin: Can edit any user
  - Operations Manager: Can edit any user
  - Users: Cannot edit their own email (read-only)

##### Role
- **Who can edit:**
  - Admin: Can edit any user's role (except their own)
  - Operations Manager: Cannot edit roles
  - Users: Cannot edit their own role
- **Available Roles:**
  - Administrator
  - Operations Manager
  - Staff
- **Restrictions:**
  - Admins cannot change their own role
  - Operations Managers cannot create Admin accounts

##### Profile Color
- **Who can edit:**
  - Only available when editing your own profile
  - Not available when editing other users
- **Features:**
  - Color picker with 24 predefined colors
  - Visual preview with avatar
  - Option to reset to auto-generated color
  - Colors include brand colors and additional options

#### 2. Account Status Display
- Shows current account status (Active/Pending)
- Displays below Role field

#### 3. Resend Invite
- **Visibility:** Only for invited users who haven't activated
- **Who can use:** Admin and Operations Manager
- **Functionality:**
  - Resends invitation email
  - Button appears below Role field
  - Shows loading state while sending

#### 4. Password Management

##### Send Password Reset Link
- **Visibility:** Only visible to Admin
- **Functionality:**
  - Sends password reset link to user's email
  - User receives email with reset token
  - Separate section at bottom of page

#### 5. Save Changes
- **Button State:**
  - Disabled when no changes made (dirty checking)
  - Shows "Saving..." during save operation
- **Validation:**
  - Validates all fields before saving
  - Shows error messages for validation failures
- **Success Feedback:**
  - Toast notification on successful save
  - Page refreshes user data after save

#### 6. Navigation
- **Return Button:**
  - "RETURN TO PROFILE" (if accessed from profile page)
  - "RETURN TO ACCOUNT PAGE" (if accessed from account page)
  - Navigates back to previous page

### Field Permissions Summary

| Field | Own Profile | Admin Editing Others | Ops Manager Editing Others |
|-------|-------------|---------------------|---------------------------|
| First Name | ❌ Read-only | ✅ Editable | ✅ Editable |
| Last Name | ❌ Read-only | ✅ Editable | ✅ Editable |
| Email | ❌ Read-only | ✅ Editable | ✅ Editable |
| Role | ❌ Read-only | ✅ Editable* | ❌ Read-only |
| Profile Color | ✅ Editable | ❌ Not available | ❌ Not available |
| Password Reset | ❌ Not available | ✅ Available | ❌ Not available |

*Admin cannot change their own role

---

## Invite User Form

**Component:** `InviteUserForm.jsx`  
**Usage:** Modal dialog within Account Page

### Overview
The Invite User Form allows administrators and operations managers to invite new users to the system via email.

### Form Fields

#### 1. Email (Required)
- **Type:** Email input
- **Validation:**
  - Required field
  - Email format validation
  - Checks for duplicate emails
- **Error Messages:**
  - "User with this email already exists"
  - "Please enter a valid email address"
  - "Failed to send invite" (general error)

#### 2. Name (Optional)
- **Type:** Text input
- **Placeholder:** "Enter full name (optional)"
- **Usage:** Pre-fills user's name when they accept invitation

#### 3. Role (Required)
- **Type:** Dropdown select
- **Options:**
  - Staff
  - Operations Manager
  - Administrator (Admin only)
- **Default:** Staff
- **Restrictions:**
  - Operations Managers cannot invite Administrators

### Form Behavior

#### Submission
- **Loading State:**
  - Shows "Sending..." on submit button
  - Displays circular progress indicator
  - Disables form during submission
- **Success:**
  - Closes modal
  - Refreshes user list
  - Shows success toast notification
- **Error Handling:**
  - Displays error messages below relevant fields
  - Shows general error alert at top of form
  - Form remains open for correction

#### Cancellation
- **Cancel Button:**
  - Closes modal without saving
  - Discards all form data

### Invitation Flow
1. Admin/Manager fills out form
2. System sends invitation email with unique token
3. User receives email with invitation link
4. User clicks link and is redirected to registration page
5. User completes registration with token
6. Account is activated

---

## Account Filters Component

**Component:** `AccountFilters.jsx`  
**Usage:** Embedded in Account Page

### Overview
The Account Filters component provides filtering and search capabilities for the user list table.

### Filter Options

#### 1. Status Tabs
- **All:**
  - Shows all users regardless of status
  - Default selection
- **Pending:**
  - Shows users with `isInvited: true` and `isActive: false`
  - Users who haven't completed registration
- **Expired:**
  - Shows users with expired invitations
  - `isInvited: true`, `isActive: false`, and `inviteExpired: true`

#### 2. Role Filter Dropdown
- **Options:**
  - All (default)
  - Admin
  - Operations Manager
  - Staff
- **Behavior:**
  - Filters users by selected role
  - Can be combined with status filter

#### 3. Search Field
- **Placeholder:** "Search User"
- **Functionality:**
  - Real-time search with 300ms debounce
  - Searches both username/name and email
  - Case-insensitive search
  - Updates results as you type

### Filter Combination
All filters work together:
- Status + Role + Search = Combined filter results
- Pagination resets when filters change
- Filter state persists during session

---

## User Roles & Permissions

### Role Definitions

#### Administrator (Admin)
- **Color:** `#CB1033` (Red)
- **Label:** "Admin"
- **Permissions:**
  - Full system access
  - Create, edit, and delete all users
  - Assign any role to users
  - Manage all events and data
  - Send password reset links
  - Cannot change own role
  - Cannot delete own account

#### Operations Manager
- **Color:** `#31365E` (Navy)
- **Label:** "Ops Manager" or "Operations Manager"
- **Permissions:**
  - Create staff and operations manager accounts
  - Cannot create admin accounts
  - Can edit user information (except roles)
  - Can assign staff to events
  - Can manage events and inventory
  - Cannot delete users
  - Cannot change user roles

#### Staff
- **Color:** `#FAA951` (Orange)
- **Label:** "Staff"
- **Permissions:**
  - View all users (read-only)
  - Can only view assigned events
  - Can perform guest check-ins
  - Can log inventory
  - Can edit own profile (limited)
  - Cannot create users
  - Cannot manage events

### Permission Matrix

| Action | Admin | Operations Manager | Staff |
|--------|-------|-------------------|-------|
| View all users | ✅ | ✅ | ✅ |
| Invite users | ✅ | ✅ | ❌ |
| Edit user info | ✅ | ✅ | ❌ |
| Change user role | ✅ | ❌ | ❌ |
| Delete users | ✅ | ❌ | ❌ |
| Edit own profile | ✅ | ✅ | ✅ (limited) |
| Change own role | ❌ | ❌ | ❌ |
| Send password reset | ✅ | ❌ | ❌ |

---

## Navigation & Routes

### User-Related Routes

#### Account Routes
- `/account` - User Management Settings (main page)
- `/account/:userId` - User Management Settings (specific user context)
- `/account/edit/:userId` - Edit user account

#### Profile Routes
- `/profile` - View own profile
- `/profile/:userId` - View specific user profile
- `/profile/edit/:userId` - Edit user profile (same as account edit)

### Navigation Access

#### Main Navigation
- **Account/User Management:**
  - Accessible from main navigation menu
  - Visible to Admin, Operations Manager, and Staff
- **Profile:**
  - Accessible from top navigation bar
  - Visible to all authenticated users
  - Shows current user's profile by default

#### Breadcrumbs
- Breadcrumb navigation available on all user pages
- Shows current page and parent pages
- Clickable navigation path

---

## Common User Actions

### For Administrators

1. **Invite New User:**
   - Navigate to `/account`
   - Click "INVITE USERS" button
   - Fill out form (email, name, role)
   - Submit invitation

2. **Edit User Account:**
   - Navigate to `/account`
   - Find user in table
   - Click "Edit" button
   - Make changes
   - Click "Save Changes"

3. **Delete User:**
   - Navigate to `/account`
   - Find user in table
   - Click "Delete" button
   - Confirm deletion

4. **View User Profile:**
   - Navigate to `/account`
   - Click on user name (if linked) or navigate to `/profile/:userId`

5. **Send Password Reset:**
   - Navigate to `/account/edit/:userId`
   - Scroll to "SEND PASSWORD RESET LINK" section
   - Click "Send Reset Password Link"

### For Operations Managers

1. **Invite Staff:**
   - Navigate to `/account`
   - Click "INVITE USERS"
   - Select "Staff" or "Operations Manager" role
   - Cannot invite Administrators

2. **Edit User Information:**
   - Can edit names and emails
   - Cannot change roles
   - Cannot delete users

### For Staff

1. **View All Users:**
   - Navigate to `/account`
   - View-only access to user list
   - Can search and filter

2. **View Own Profile:**
   - Navigate to `/profile`
   - View account information
   - Limited editing capabilities

---

## Technical Details

### Components Structure

```
frontend/src/
├── pages/
│   ├── account/
│   │   ├── AccountPage.jsx          # Main user management page
│   │   └── AccountEditPage.jsx     # User editing page
│   └── profile/
│       └── UserProfile.jsx         # Profile viewing page
└── components/
    └── account/
        ├── InviteUserForm.jsx      # Invitation form component
        └── AccountFilters.jsx      # Filter component
```

### API Endpoints Used

- `GET /api/users/profile/:userId` - Get user profile
- `PUT /api/users/profile/:userId` - Update user profile
- `GET /api/users` - Get all users
- `POST /api/users/invite` - Invite new user
- `PUT /api/users/:userId/role` - Update user role
- `DELETE /api/users/:userId` - Delete user
- `POST /api/users/:userId/resend-invite` - Resend invitation
- `POST /api/users/:userId/send-reset-link` - Send password reset link

### State Management

- Uses React hooks (useState, useEffect)
- Context API for authentication (`AuthContext`)
- Custom hook for permissions (`usePermissions`)
- Toast notifications for user feedback

### Error Handling

- Form validation with error messages
- API error handling with user-friendly messages
- Loading states for async operations
- Confirmation dialogs for destructive actions

---

## Best Practices

### For Administrators

1. **User Invitations:**
   - Always verify email addresses before inviting
   - Assign appropriate roles based on user responsibilities
   - Follow up with users who haven't activated accounts

2. **Role Management:**
   - Be cautious when changing user roles
   - Ensure at least one admin account exists
   - Document role changes for audit purposes

3. **User Deletion:**
   - Only delete users when absolutely necessary
   - Consider deactivating instead of deleting
   - Verify user has no critical data before deletion

### For Operations Managers

1. **Staff Management:**
   - Only invite staff members who need access
   - Assign appropriate roles (Staff or Operations Manager)
   - Monitor pending invitations

2. **User Information:**
   - Keep user information up to date
   - Verify email addresses are correct
   - Update names when users request changes

### For All Users

1. **Profile Management:**
   - Keep profile information current
   - Use profile color for easy identification
   - Report any account issues to administrators

---

## Troubleshooting

### Common Issues

#### "User with this email already exists"
- **Cause:** Email is already registered in the system
- **Solution:** Check if user already has an account, or use a different email

#### "Failed to send invite"
- **Cause:** Email service issue or invalid email
- **Solution:** Verify email address, check email service configuration

#### "You cannot change your own role"
- **Cause:** Admin trying to change their own role
- **Solution:** Have another admin change your role, or contact system administrator

#### User not appearing in list
- **Cause:** User filtered out or pagination
- **Solution:** Check filters, search terms, and pagination settings

#### Cannot edit certain fields
- **Cause:** Insufficient permissions
- **Solution:** Verify your role has permission to edit the field

---

## Future Enhancements

Potential improvements for User Sections:

1. **Bulk Operations:**
   - Bulk invite users via CSV
   - Bulk role changes
   - Bulk user activation/deactivation

2. **Advanced Filtering:**
   - Filter by last login date
   - Filter by account creation date
   - Filter by assigned events

3. **User Activity:**
   - View user activity log
   - Track user actions
   - Login history

4. **Export Functionality:**
   - Export user list to CSV
   - Export user reports

5. **User Groups:**
   - Create user groups
   - Assign permissions to groups
   - Bulk assign to events

---

## Related Documentation

- [Profile Management README](./PROFILE_MANAGEMENT_README.md) - Comprehensive profile management system
- [Testing Guide](./TESTING_GUIDE.md) - Testing procedures for user features
- [README](./README.md) - General application documentation

---

**Last Updated:** January 2025  
**Version:** 1.0

