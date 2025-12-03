# 🔗 Invite Link Verification Guide

## Current Link Flow

### 1. Backend Generates Link
**File:** `backend/controllers/userController.js` (line 99)
```javascript
const inviteLink = `${process.env.CLIENT_URL}/invite/${token}`;
```

**Expected Format:**
- `${CLIENT_URL}/invite/[32-character-hex-token]`
- Example: `https://sgego.netlify.app/invite/abc123def456...`

### 2. Frontend Route Handles Link
**File:** `frontend/src/App.jsx` (line 55)
```javascript
<Route path="/invite/:token" element={<InviteRedirect />} />
```

**InviteRedirect Component** (lines 34-39):
```javascript
function InviteRedirect() {
  const { token } = useParams();
  if (!token) {
    return <Navigate to="/auth?view=login" replace />;
  }
  return <Navigate to={`/auth?view=register&token=${token}`} replace />;
}
```

### 3. AuthPage Shows RegisterForm
**File:** `frontend/src/pages/Auth/AuthPage.jsx`
- Reads `view=register` from URL params
- Reads `token` from URL params
- Renders `<RegisterForm token={token} />`

---

## ✅ Verification Checklist

### Step 1: Check CLIENT_URL Environment Variable

**Run this command in backend directory:**
```bash
node -e "require('dotenv').config(); console.log('CLIENT_URL:', process.env.CLIENT_URL);"
```

**What to verify:**
- [ ] `CLIENT_URL` is SET (not undefined)
- [ ] `CLIENT_URL` matches your frontend URL exactly
  - Local: `http://localhost:3000`
  - Production: `https://sgego.netlify.app` (or your actual domain)
- [ ] No trailing slash (should be `https://domain.com` not `https://domain.com/`)

### Step 2: Check Email Link Format

**In the invite email, the link should be:**
```
https://your-frontend-url.com/invite/abc123def456789...
```

**NOT:**
- ❌ `https://your-frontend-url.com/auth?view=register&token=...` (old format)
- ❌ `http://localhost:3000/invite/...` (if using production)

### Step 3: Test Link Flow

1. **Send an invite** (as Admin)
2. **Check the email** you receive
3. **Click the link** in the email
4. **Check the browser URL after clicking:**
   - Should redirect to: `https://your-frontend-url.com/auth?view=register&token=...`
   - Should show the Register form (not Login form)

### Step 4: Common Issues

**Issue: Link goes to login page**
- ✅ Check if `CLIENT_URL` is set correctly in backend `.env`
- ✅ Check if the link in email matches: `${CLIENT_URL}/invite/${token}`
- ✅ Check browser console for errors
- ✅ Verify the token is in the URL after redirect

**Issue: Token missing in URL**
- ✅ Check if `InviteRedirect` component is working
- ✅ Check browser network tab for redirects
- ✅ Verify route `/invite/:token` is registered

**Issue: Wrong frontend URL in link**
- ✅ Update `CLIENT_URL` in `backend/.env`
- ✅ Restart backend server after updating
- ✅ Re-send invite to get new link with correct URL

---

## 🔧 Quick Fixes

### Update CLIENT_URL

**For Production:**
Edit `backend/.env`:
```env
CLIENT_URL=https://sgego.netlify.app
```

**For Local Development:**
```env
CLIENT_URL=http://localhost:3000
```

**After updating:**
1. Restart backend server
2. Send a new invite (old invites will have old URL)

---

## 📧 Current Email Template

**File:** `backend/controllers/userController.js` (lines 101-105)

The email sent contains:
```html
<p>Hello,</p>
<p>You've been invited to join <strong>SGEGO</strong> as a <strong>[role]</strong>.</p>
<p>Click the link below to complete your registration:</p>
<p><a href="${inviteLink}">${inviteLink}</a></p>
<p>This invitation will expire in 7 days.</p>
```

Where `inviteLink = ${CLIENT_URL}/invite/${token}`

---

## 🧪 Testing Steps

1. **Check Environment:**
   ```bash
   cd backend
   node CHECK_ENV.js
   ```

2. **Send Test Invite:**
   - Login as Admin
   - Go to `/account`
   - Click "INVITE USERS"
   - Fill in email, first name, last name, role
   - Send invite

3. **Check Email:**
   - Open the invite email
   - Verify link format: `[CLIENT_URL]/invite/[token]`
   - Copy the full link

4. **Test Link:**
   - Click link (or paste in browser)
   - Should redirect to: `/auth?view=register&token=[token]`
   - Should show Register form

5. **If Not Working:**
   - Check browser console for errors
   - Check backend logs when clicking link
   - Verify `CLIENT_URL` matches frontend URL
   - Try accessing directly: `/auth?view=register&token=[your-token]`

---

## 📝 Summary

**Backend generates:** `${CLIENT_URL}/invite/${token}`  
**Frontend route:** `/invite/:token` → Redirects to `/auth?view=register&token=${token}`  
**AuthPage shows:** RegisterForm when `view=register` and `token` exists

**Most common issue:** `CLIENT_URL` not set or doesn't match frontend URL

