# 🚀 RBAC Permission Upgrade Procedure

This document defines the REQUIRED steps for modifying any role permission in SGEGO.

---

## 🧭 WHEN DOES THIS APPLY?

- Adding a new permission (e.g., EXPORT_REPORTS)
- Changing which role has access
- Introducing a new role
- Restricting an existing action

---

## 🛠️ UPGRADE STEPS

### 1️⃣ Update the Permission Source
Modify capabilities in:

src/constants/permissions.js


### 2️⃣ Expose Permission to the UI
Add a boolean to:


src/hooks/usePermissions.js


### 3️⃣ Update the Matrix Doc
Modify:


src/docs/permissions-matrix.md


### 4️⃣ RBAC CHANGELOG ENTRY
Add a new version in:


src/docs/rbac-changelog.md


### 5️⃣ QA VALIDATION
Verify:
✔ Correct UI visibility  
✔ Correct backend rejection on unauthorized access  
✔ Correct redirect/disable states  

### 6️⃣ GIT COMMIT STANDARDS
Message must start with:



RBAC: <summary>


Example:


RBAC: allow Ops to resend invites


---

## ❗ IMPORTANT RULES

🔸 Do **NOT** bypass permissions by checking `user.role` in components  
🔸 UI conditions MUST use `usePermissions()`  
🔸 Backend ALWAYS enforces rules server-side

---

