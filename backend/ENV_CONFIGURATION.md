# 📧 Environment Configuration Guide

**Last Updated:** 2025-02-27  
**Purpose:** Configure backend environment variables, especially email settings

---

## 📋 Required Environment Variables

### Backend `.env` File Location
Create or edit: `backend/.env`

---

## 🔧 Core Configuration

### 1. Server Configuration
```env
NODE_ENV=development          # or 'production'
PORT=3001                     # Backend server port
MONGODB_URI=mongodb://localhost:27017/sevent    # Database connection
```

### 2. JWT/Authentication
```env
JWT_SECRET=your_super_secret_jwt_key_for_development_12345
JWT_EXPIRE=7d                 # Token expiration (7 days)
```

### 3. Frontend URL Configuration
```env
CLIENT_URL=http://localhost:3000     # For local development
# OR for production:
# CLIENT_URL=https://your-domain.com

FRONTEND_URL=http://localhost:3000   # Same as CLIENT_URL (legacy support)
CORS_ORIGIN=http://localhost:3000    # CORS allowed origin
```

---

## 📧 Email Configuration

### Current Status: ⚠️ Needs Update

**Required:** Update email configuration to use `admin@signaturegroupevents.com`

### Email Service Options

The system uses **nodemailer** which supports any SMTP server. Choose based on your email provider:

---

### Option 1: Google Workspace (Gmail for Business) ✅ **Recommended**

If `admin@signaturegroupevents.com` is a Google Workspace email:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=admin@signaturegroupevents.com
EMAIL_PASS=your-app-password-here
```

**Steps to get App Password:**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)
3. Go to **App Passwords** (may need to search for it)
4. Select app: **Mail**
5. Select device: **Other (Custom name)** → Enter "SGEGO Backend"
6. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)
7. Use this password in `EMAIL_PASS` (remove spaces)

**Note:** You cannot use your regular password - must use App Password.

---

### Option 2: Microsoft 365 / Outlook

If `admin@signaturegroupevents.com` is a Microsoft 365/Outlook email:

```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USER=admin@signaturegroupevents.com
EMAIL_PASS=your-app-password-here
```

**Steps to get App Password:**
1. Go to [Microsoft Account Security](https://account.microsoft.com/security)
2. Enable **Two-step verification** (if not already enabled)
3. Go to **Advanced security options**
4. Under **App passwords**, select **Create a new app password**
5. Copy the generated password
6. Use this password in `EMAIL_PASS`

**Alternative SMTP Settings (if Office 365 doesn't work):**
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
```

---

### Option 3: Custom SMTP Server

If you have a custom email server for `signaturegroupevents.com`:

```env
EMAIL_HOST=smtp.signaturegroupevents.com    # Your SMTP server hostname
EMAIL_PORT=587                              # or 465 for SSL
EMAIL_USER=admin@signaturegroupevents.com
EMAIL_PASS=your-email-password
```

**For SSL (port 465), you may need to update `sendEmail.js`:**
- Change `secure: false` to `secure: true` in `backend/utils/sendEmail.js`

---

### Option 4: SendGrid, Mailgun, or Other Email Services

If using a dedicated email service:

**SendGrid:**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

**Mailgun:**
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASS=your-mailgun-password
```

---

## ✅ Verification Checklist

### Before Testing:

- [ ] `CLIENT_URL` matches your frontend URL (local or production)
- [ ] `EMAIL_HOST` is set correctly for your email provider
- [ ] `EMAIL_USER` is set to `admin@signaturegroupevents.com`
- [ ] `EMAIL_PASS` is an App Password (not regular password for Gmail/Outlook)
- [ ] `EMAIL_PORT` matches your provider (587 for most, 465 for SSL)
- [ ] All other variables are configured

---

## 🧪 Testing Email Configuration

### Method 1: Test Invite Email
1. Start backend server
2. Login as Admin
3. Navigate to `/account`
4. Click "INVITE USERS"
5. Send invite to a test email
6. Check if email is received (or check backend console logs)

### Method 2: Check Backend Logs
When email is not configured or fails, backend will:
- **If not configured:** Log email content to console
- **If configured but fails:** Show error message

Look for these messages in backend console:
- ✅ `Email sent to: user@example.com` → Success!
- ⚠️ `Email not configured - logging email content instead` → Need to configure
- ❌ `Email send failed: [error message]` → Check credentials/SMTP settings

---

## 📝 Complete `.env` Template

```env
# Environment
NODE_ENV=development

# Server
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/sevent

# Authentication
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d

# Frontend URLs
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=admin@signaturegroupevents.com
EMAIL_PASS=your-app-password-here
```

---

## 🔒 Security Notes

1. **Never commit `.env` file to Git** (should be in `.gitignore`)
2. **Use App Passwords** for Gmail/Outlook (not regular passwords)
3. **Use strong `JWT_SECRET`** in production (generate random string)
4. **Update `CLIENT_URL`** for production deployment
5. **Use different `.env` files** for development vs production

---

## 🚨 Troubleshooting

### Email Not Sending

**Error:** `Invalid login`
- Check if using App Password (not regular password)
- Verify email address is correct
- Check if 2FA is enabled (required for App Passwords)

**Error:** `Connection timeout`
- Check if `EMAIL_HOST` is correct
- Verify firewall/network allows SMTP connections
- Try different `EMAIL_PORT` (587 vs 465)

**Error:** `Authentication failed`
- Verify `EMAIL_USER` and `EMAIL_PASS` are correct
- For Gmail: Make sure App Password is used (not account password)
- For Outlook: Make sure App Password is generated correctly

### Email Goes to Spam

- Verify SPF/DKIM records are set up for your domain
- Use a proper "From" name (currently uses "SGEGO")
- Consider using a dedicated email service (SendGrid, Mailgun)

---

## 📞 Next Steps

1. **Get App Password** for `admin@signaturegroupevents.com`
   - If Gmail: Follow "Option 1" steps above
   - If Outlook: Follow "Option 2" steps above
   - If custom: Contact your email provider

2. **Update `backend/.env` file** with:
   - `EMAIL_USER=admin@signaturegroupevents.com`
   - `EMAIL_PASS=[app-password-from-step-1]`
   - `EMAIL_HOST=[based-on-provider]`
   - `EMAIL_PORT=[usually-587]`

3. **Verify `CLIENT_URL`** matches your frontend URL

4. **Test** by sending an invite email

---

**Need Help?** Check backend console logs when sending emails - they'll show exactly what's happening.

