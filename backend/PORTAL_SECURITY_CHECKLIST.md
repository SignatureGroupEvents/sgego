# Client Portal Security Checklist

Use this checklist to verify that portal routes are secure before release and after changes.

## 1. Data sanitization

- [ ] **Portal GET event does not include sensitive fields**  
  `GET /api/portal/:eventId` (with valid portal token) must never return:
  - `event.clientPortal.passwordHash`
  - `event.clientPortal.allowedEmails`  
  Run: Unit test `utils/__tests__/portalSanitizer.test.js` (covers `sanitizePortalEvent`).  
  Manual: Call endpoint and assert response.event.clientPortal has no `passwordHash` or `allowedEmails`.

## 2. Auth separation

- [ ] **Admin JWT cannot access portal endpoints**  
  Send `Authorization: Bearer <admin_token>` to `GET /api/portal/:eventId`.  
  Expected: **401** with message like "Token is not valid" or "Invalid token scope" (admin tokens have no `scope: 'portal'`; `requirePortalAuth` rejects them).

- [ ] **Portal JWT cannot access admin endpoints**  
  Send `Authorization: Bearer <portal_token>` to e.g. `GET /api/events` or `GET /api/events/:id`.  
  Expected: **401** (auth middleware rejects tokens with `scope === 'portal'`).

## 3. Event gating (closed portal)

- [ ] **Closed portal returns 403 with standard message**  
  Disable portal for an event or set closeAt in the past. With a valid portal JWT, call `GET /api/portal/:eventId`.  
  Expected: **403** with body:  
  `{ "code": "PORTAL_CLOSED", "message": "This event portal has closed. Need to reopen? Contact your operations manager to reopen this event." }`

## 4. Login hardening

- [ ] **Rate limit triggers after threshold**  
  Send 11+ login requests (POST /api/portal/:eventId/login) from same IP within 15 minutes.  
  Expected: After 10 requests, next request returns **429** with message "Too many login attempts. Please try again later."

- [ ] **Login responses are generic**  
  Failed login (wrong password vs email not in list) must return the same **401** message: "Invalid email or password" (no info leak).

- [ ] **Portal JWT payload**  
  Successful login response includes token that decodes to: `scope: "portal"`, `eventId`, `email`, and short expiry (e.g. 6h).

## 5. Response consistency

- [ ] **GET /api/portal/:eventId** uses `req.portal.event` (set by `requirePortalAuth`) and returns only sanitized event (via `sanitizePortalEvent`).
- [ ] **Guests, inventory, analytics** endpoints under `/api/portal/:eventId/*` are scoped to that `eventId` and do not expose internal/admin-only fields.

## Quick test commands

```bash
# Run sanitizer unit tests
cd backend && npm test -- utils/__tests__/portalSanitizer.test.js
```
