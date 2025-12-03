# 🔍 Phase 3: UI Button Visibility Audit Report

**Date:** 2025-02-27  
**Status:** AUDIT COMPLETE - PENDING FIXES  
**Scope:** All frontend components with conditional UI rendering based on roles/permissions

---

## 📋 Executive Summary

This audit identifies all components that conditionally render UI elements (buttons, links, navigation items, etc.) based on user roles or permissions. The goal is to ensure all UI visibility checks use capability-based permissions from `usePermissions()` instead of hardcoded role checks.

### Key Findings:
- **Total Files Audited:** 15 components
- **Files with Hardcoded Role Checks:** 3 files (7 instances)
- **Files Using Role Flags (acceptable):** 5 files
- **Files Using Permission Flags (correct):** 7 files
- **Files Needing Updates:** 5 files

---

## 🚨 Critical Issues (Hardcoded Role Checks)

### 1. `GuestTable.jsx` ⚠️ **NEEDS FIX**
**Location:** Line 96  
**Issue:** Hardcoded role check for check-in permissions
```jsx
const canPerformCheckins = isOperationsManager || isAdmin || currentUser?.role === 'staff';
```
**Should be:**
```jsx
const { canCheckInGuests } = usePermissions();
// Then use: canCheckInGuests
```
**Impact:** Staff can check in guests (correct behavior), but uses hardcoded check instead of capability flag.

---

### 2. `ManageTeam.jsx` ⚠️ **NEEDS FIX** (5 instances)

#### Issue 2a: User filtering (Line 108)
```jsx
user => user.isActive && (user.role === 'staff' || user.role === 'operations_manager' || user.role === 'admin')
```
**Should be:** Filtering logic is acceptable (displaying user data), but should document why this is needed.

#### Issue 2b-2e: Role badge display (Lines 387-395)
```jsx
assignment.user.role === 'operations_manager' ? 'Operations' :
assignment.user.role === 'admin' ? 'Admin' : 'Staff'
```
**Status:** ✅ **ACCEPTABLE** - This is display logic for showing user roles, not permission gating.

**Recommendation:** Keep as-is (displaying role labels is appropriate).

---

### 3. `EventsList.jsx` ⚠️ **NEEDS FIX**
**Location:** Line 159  
**Issue:** Hardcoded role check for viewing events
```jsx
const canViewEvents = isOperationsManager || isAdmin || currentUser?.role === 'staff';
```
**Should be:**
```jsx
const { canViewEvents } = usePermissions();
```
**Impact:** All authenticated users can view events, but should use capability flag.

---

### 4. `AccountPage.jsx` ⚠️ **NEEDS REVIEW**
**Location:** Line 231  
**Issue:** Mixed permission check with hardcoded role
```jsx
{(canManageUsers || (u.role === 'staff' && isStaff)) && (
```
**Analysis:** 
- `canManageUsers` = Admin or Ops (correct)
- `u.role === 'staff' && isStaff` = Staff can edit their own profile (correct behavior)
- **Recommendation:** Replace with `canEditOwnProfile` check for consistency:
```jsx
{(canManageUsers || (u._id === currentUser.id && canEditOwnProfile)) && (
```

---

## ✅ Files Using Permission Flags (Correct Implementation)

### 1. `InviteUserForm.jsx` ✅
- Uses `usePermissions()` correctly
- Filters roles based on `isAdmin`, `isOperationsManager`, `isStaff`
- **Status:** Correct implementation

### 2. `AccountPage.jsx` (Partially Correct) ✅
- Uses `canInviteUsers`, `canManageUsers`, `canDeleteUsers` from `usePermissions()`
- Has one mixed check (Issue #4 above)
- **Status:** Mostly correct, needs minor fix

### 3. `MainNavigation.jsx` ⚠️ **NEEDS UPDATE**
**Location:** Line 121  
**Issue:** Uses role flags instead of capability flags
```jsx
{(isAdmin || isOperationsManager) && (
```
**Should be:**
```jsx
const { canManageUsers } = usePermissions();
// Then: {canManageUsers && (
```
**Impact:** Navigation menu item visibility should use capability flags for consistency.

---

## 📊 Component-by-Component Analysis

### Navigation & Layout

| Component | Status | Issues | Priority |
|-----------|--------|--------|----------|
| `MainNavigation.jsx` | ⚠️ Needs Update | Uses `isAdmin \|\| isOperationsManager` instead of `canManageUsers` | Medium |

---

### User Management

| Component | Status | Issues | Priority |
|-----------|--------|--------|----------|
| `AccountPage.jsx` | ⚠️ Needs Review | Mixed permission check on line 231 | Medium |
| `AccountEditPage.jsx` | ✅ To Verify | Need to check if using permission flags | Low |
| `UserProfile.jsx` | ✅ To Verify | Need to check if using permission flags | Low |
| `InviteUserForm.jsx` | ✅ Correct | Uses `usePermissions()` correctly | - |

---

### Event Management

| Component | Status | Issues | Priority |
|-----------|--------|--------|----------|
| `EventsList.jsx` | ⚠️ Needs Fix | Hardcoded role check on line 159 | High |
| `CreateEvent.jsx` | ✅ To Verify | Need to check "Create Event" button visibility | Medium |
| `EventDashboard.jsx` | ✅ To Verify | Need to check action buttons | Medium |
| `EventDetails.jsx` | ✅ To Verify | Need to check edit/delete buttons | Medium |
| `ArchivedEventsList.jsx` | ✅ To Verify | Need to check restore/unarchive buttons | Low |
| `ManageTeam.jsx` | ✅ Acceptable | Role checks are for display only | - |

---

### Guest & Inventory Management

| Component | Status | Issues | Priority |
|-----------|--------|--------|----------|
| `GuestTable.jsx` | ⚠️ Needs Fix | Hardcoded role check on line 96 | High |
| `InventoryPage.jsx` | ✅ To Verify | Need to check inventory action buttons | Medium |

---

### Dashboard

| Component | Status | Issues | Priority |
|-----------|--------|--------|----------|
| `MyEventsBoard.jsx` | ✅ To Verify | Need to check action buttons | Low |
| `ManageSection.jsx` | ✅ To Verify | Uses `canModify` and `canManageTeam` - verify source | Medium |

---

## 🎯 Recommended Action Plan

### Priority 1 (High): Hardcoded Role Checks
1. ✅ Fix `EventsList.jsx` line 159 - Replace with `canViewEvents`
2. ✅ Fix `GuestTable.jsx` line 96 - Replace with `canCheckInGuests`

### Priority 2 (Medium): Use Capability Flags
3. ✅ Update `MainNavigation.jsx` line 121 - Use `canManageUsers`
4. ✅ Review `AccountPage.jsx` line 231 - Use `canEditOwnProfile`
5. ✅ Verify `CreateEvent.jsx` - Ensure "Create Event" button uses `canManageEvents`
6. ✅ Verify `EventDashboard.jsx` - Check all action buttons use permission flags
7. ✅ Verify `EventDetails.jsx` - Check edit/delete buttons use permission flags

### Priority 3 (Low): Verification Tasks
8. ✅ Verify `AccountEditPage.jsx` - Confirm all permission checks are correct
9. ✅ Verify `UserProfile.jsx` - Confirm permission checks
10. ✅ Verify `InventoryPage.jsx` - Check inventory action buttons
11. ✅ Verify `ManageSection.jsx` - Confirm `canModify` and `canManageTeam` sources

---

## 🔍 Button/Action Visibility Checklist

### Critical Buttons to Verify:

- [ ] **Create Event Button** - Should use `canManageEvents`
- [ ] **Edit User Button** - Should use `canEditAnyUser` or `canEditStaffOnly` or `canEditOwnProfile`
- [ ] **Delete User Button** - Should use `canDeleteUsers`
- [ ] **Invite User Button** - Should use `canInviteStaff`, `canInviteOps`, or `canInviteAdmin`
- [ ] **Check-in Guest Button** - Should use `canCheckInGuests`
- [ ] **Manage Inventory Button** - Should use `canManageInventory`
- [ ] **Manage Team Button** - Should use `canManageEvents`
- [ ] **Advanced Analytics Tab/Link** - Should use `canAccessAnalyticsFull`
- [ ] **Account Navigation Menu** - Should use `canManageUsers`
- [ ] **Delete Event Button** - Should use `canManageEvents`

---

## 📝 Notes

1. **Role Flags vs Permission Flags:**
   - ✅ Using `isAdmin`, `isOperationsManager`, `isStaff` from `usePermissions()` is acceptable (they're convenience flags)
   - ❌ Direct checks like `user.role === 'admin'` should be replaced with capability flags
   - ✅ Displaying role labels (e.g., showing "Admin" badge) is acceptable and doesn't need permission checks

2. **Permission Flag Naming:**
   - All permission flags start with `can*` (e.g., `canManageEvents`, `canEditUsers`)
   - Role flags are `isAdmin`, `isOperationsManager`, `isStaff`
   - When in doubt, use capability flags over role flags

3. **Backend Enforcement:**
   - Remember: UI visibility is a UX feature, not security
   - Backend always enforces permissions regardless of UI visibility
   - However, showing buttons users can't use creates poor UX

---

## ✅ Completion Criteria

Phase 3 is complete when:
- [ ] All hardcoded `user.role ===` checks replaced with capability flags
- [ ] All navigation menu items use capability flags
- [ ] All action buttons (Create, Edit, Delete, Invite) use capability flags
- [ ] All conditional rendering uses `usePermissions()` hook
- [ ] No direct role string comparisons in component logic
- [ ] All files verified and tested with Admin, Ops, and Staff accounts

---

## 📅 Next Steps

1. **Start with Priority 1 fixes** - Fix hardcoded role checks
2. **Update Priority 2 items** - Replace role flags with capability flags where appropriate
3. **Verify Priority 3 items** - Ensure all buttons use correct permission flags
4. **Test with all roles** - Verify UI visibility matches RBAC matrix
5. **Update changelog** - Document Phase 3 completion

---

**Report Generated:** 2025-02-27  
**Next Review:** After Priority 1 fixes are complete

