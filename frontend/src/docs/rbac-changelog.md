# 🔐 RBAC Change Log

Tracks all updates to SGEGO’s role permissions system.
Changes here MUST match updates in:
- `/src/constants/permissions.js`
- `/src/hooks/usePermissions.js`
- `/src/docs/permissions-matrix.md`

---

## 📌 Version History

### v1.0.0 — Initial Release (DATE)
- Roles created: `admin`, `operations_manager`, `staff`
- Base capabilities defined (invites, event mgmt, analytics access)
- Staff restricted to inviting staff only

---

## ✍️ HOW TO RECORD A CHANGE

Every RBAC modification must document:

| Field | Description |
|-------|-------------|
| Version | Increment semver (MAJOR.MINOR.PATCH) |
| Summary | One sentence describing purpose |
| Changes | List what was added/removed/updated |
| Impacted Areas | UI components, backend API, docs updated |
| Approver | Who signed off |
| Date | Date change was merged |

<!-- ### Example Entry

#### v1.1.0 — Added Analytics Tier Permissions
**Changes**
- Added `ACCESS_ANALYTICS_BASIC`
- `operations_manager` now has basic analytics access
- UI checks updated in `AnalyticsDashboard.jsx`

**Impact**
- Admin retains full analytics
- Staff cannot see analytics tab

**Approver:** Alyssa H.  
**Date:** 2025-10-27 -->

## v1.0.1 — Phase 2 Route-Based Access Control

**Date:** 2025-02-____  
**Owner:** Alyssa Herrera  
**Status:** COMPLETE

### Changes
- Implemented capability-based ProtectedRoute system
- Eliminated all direct role string checks from routes
- Mapped all App routes to RBAC capabilities
- Added Access Denied UI messaging
- Ensured unauthorized direct URL access is blocked
- Aligned ProtectedRoute with permissions.js capability flags

### Impact
- Frontend routing is now decoupled from roles
- Routes can adapt to RBAC changes without code rewrites
- System is resilient to new roles and permission modifications

### Testing Result
✔ Staff restricted from MANAGE_EVENTS, MANAGE_INVENTORY, and ANALYTICS  
✔ Ops restricted from ACCESS_ANALYTICS_FULL  
✔ Admin has universal route access  
✔ Unauthenticated users redirected to login



