# 🧪 RBAC Test Plan — SGEGO

Validates role-based restrictions across UI + API.

---

## ROLES UNDER TEST
- Admin
- Operations Manager
- Staff

---

## TEST CATEGORIES

### 🔐 Authentication
| Test | Admin | Ops | Staff |
|------|-------|-----|-------|
Can log in | ✔ | ✔ | ✔ |
Cannot log in if deactivated | ✔ | ✔ | ✔ |

### 🙋 User Management
| Action | Admin | Ops | Staff |
|--------|-------|-----|------|
Invite Staff | ✔ | ✔ | ✔ |
Invite Ops | ✔ | ❌ | ❌ |
Invite Admin | ✔ | ❌ | ❌ |
Resend Invite | ✔ | ✔ | ❌ |
Edit any user | ✔ | ❌ | ❌ |
Edit Staff only | ❌ | ✔ | ❌ |
Edit own profile | ✔ | ✔ | limited *

*Staff cannot change email — confirm backend rejects

### 📦 Event Management
| Action | Admin | Ops | Staff |
|--------|-------|-----|------|
Create events | ✔ | ✔ | ❌ |
Assign users | ✔ | ✔ | ❌ |
Remove users | ✔ | ✔ | ❌ |
View events | ✔ | ✔ | ✔ |

### 📊 Analytics
| Action | Admin | Ops | Staff |
|--------|-------|-----|------|
Access full analytics | ✔ | ❌ | ❌ |
Access basic analytics | ✔ | ✔ | ❌ |

---

## PASS/FAIL REQUIREMENTS

A test **fails** if:

- UI shows an action a role cannot perform
- Backend allows an unauthorized request
- Redirect logic exposes restricted content
