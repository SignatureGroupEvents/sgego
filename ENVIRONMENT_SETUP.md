# 🔧 Environment Configuration Summary

**Date:** 2025-02-27  
**Status:** ⚠️ **ACTION REQUIRED** - Email configuration needs update

---

## ⚠️ Action Required

**Update email configuration to use:** `admin@signaturegroupevents.com`

You'll need to:
1. Get the App Password for `admin@signaturegroupevents.com`
2. Update `backend/.env` with the new email credentials
3. Verify `CLIENT_URL` matches your frontend URL

---

## 📁 Configuration Files

### Backend: `backend/.env`

Create this file if it doesn't exist (it's gitignored for security).

**Required Variables:**
```env
# Server
NODE_ENV=development
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/sevent

# Authentication
JWT_SECRET=your_super_secret_jwt_key_for_development_12345
JWT_EXPIRE=7d

# Frontend URLs (UPDATE THESE!)
CLIENT_URL=http://localhost:3000              # Local development
FRONTEND_URL=http://localhost:3000            # Same as CLIENT_URL
CORS_ORIGIN=http://localhost:3000             # CORS allowed origin

# Email Configuration (⚠️ UPDATE TO admin@signaturegroupevents.com)
EMAIL_HOST=smtp.gmail.com                     # Or smtp.office365.com, etc.
EMAIL_PORT=587
EMAIL_USER=admin@signaturegroupevents.com     # ⚠️ Update this!
EMAIL_PASS=your-app-password-here             # ⚠️ Get App Password first!
```

---

### Frontend: `frontend/.env` or `frontend/.env.local` (Optional)

Create if you need to override default API URL.

**Optional Variables:**
```env
# Backend API URL (defaults to http://localhost:3001/api if not set)
VITE_API_URL=http://localhost:3001/api
```

**Note:** Frontend defaults to `http://localhost:3001/api` if `VITE_API_URL` is not set.

---

## 📧 Email Configuration Steps

### Step 1: Identify Email Provider

Determine which email service hosts `admin@signaturegroupevents.com`:
- **Google Workspace** (Gmail for business) → Use `smtp.gmail.com`
- **Microsoft 365 / Outlook** → Use `smtp.office365.com`
- **Custom SMTP** → Use your provider's SMTP server

### Step 2: Get App Password

**For Google Workspace (Gmail):**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (required)
3. Go to **App Passwords**
4. Create new app password for "SGEGO Backend"
5. Copy the 16-character password

**For Microsoft 365 / Outlook:**
1. Go to [Microsoft Account Security](https://account.microsoft.com/security)
2. Enable **Two-step verification**
3. Go to **App passwords** → Create new
4. Copy the generated password

### Step 3: Update Backend `.env`

Edit `backend/.env`:
```env
EMAIL_USER=admin@signaturegroupevents.com
EMAIL_PASS=[app-password-from-step-2]
EMAIL_HOST=[based-on-provider]
EMAIL_PORT=587
```

### Step 4: Verify CLIENT_URL

Ensure `CLIENT_URL` in `backend/.env` matches your frontend URL:
- **Local:** `CLIENT_URL=http://localhost:3000`
- **Production:** `CLIENT_URL=https://your-production-domain.com`

---

## ✅ Current Configuration Status

| Variable | Status | Notes |
|----------|--------|-------|
| `EMAIL_USER` | ⚠️ Needs Update | Currently using personal email → Update to `admin@signaturegroupevents.com` |
| `EMAIL_PASS` | ⚠️ Needs Update | Need to get App Password for admin email |
| `CLIENT_URL` | ✅ Verify | Ensure it matches frontend URL |
| `VITE_API_URL` | ✅ Optional | Defaults work, but can set explicitly |

---

## 🧪 Verification Steps

1. **Check Backend `.env` exists:**
   ```bash
   # In backend directory
   cat .env  # or type .env (Windows)
   ```

2. **Verify Email Configuration:**
   - Start backend server
   - Look for console message about email config
   - If you see "Email not configured" → Update `.env` file

3. **Test Email Sending:**
   - Login as Admin
   - Send test invite to your email
   - Check if email is received
   - If not, check backend console for errors

4. **Verify CLIENT_URL:**
   - Check `backend/.env` has correct `CLIENT_URL`
   - Should match your frontend URL exactly
   - Test invite link works when clicked

---

## 📝 Quick Reference

### Google Workspace (Gmail) Settings:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=admin@signaturegroupevents.com
EMAIL_PASS=[16-char-app-password]
```

### Microsoft 365 Settings:
```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USER=admin@signaturegroupevents.com
EMAIL_PASS=[app-password]
```

### Default Frontend API URL:
- If `VITE_API_URL` not set → Uses `http://localhost:3001/api`
- This should work if backend runs on port 3001

---

## 🔒 Security Reminders

- ✅ `.env` files are gitignored (should not be committed)
- ✅ Use App Passwords (not regular passwords)
- ✅ Never share `.env` file contents
- ✅ Use different `.env` for production vs development

---

## 📖 Full Documentation

See `backend/ENV_CONFIGURATION.md` for detailed email configuration options and troubleshooting.

---

## ✅ Next Steps

1. [ ] Get App Password for `admin@signaturegroupevents.com`
2. [ ] Update `backend/.env` with email credentials
3. [ ] Verify `CLIENT_URL` in `backend/.env` matches frontend URL
4. [ ] Test email sending (send invite to test email)
5. [ ] Confirm invite link works in email

---

**Ready to test once email configuration is updated!** 🚀

