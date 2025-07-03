# Email Setup Guide

## Quick Setup for Real Email Sending

### Step 1: Add Email Configuration to .env
Add these lines to your `backend/.env` file:

```env
# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Step 2: Gmail App Password Setup
1. Go to your Google Account settings: https://myaccount.google.com/
2. Enable 2-Factor Authentication if not already enabled
3. Go to "Security" → "App passwords"
4. Generate a new app password for "Mail"
5. Use this 16-character password in EMAIL_PASS (not your regular Gmail password)

### Step 3: Test the Setup
1. Restart your backend server
2. Try inviting a user through the admin interface
3. Check your email inbox for the invitation

## Alternative Email Providers

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

### Yahoo Mail
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

### Custom SMTP Server
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password
```

## Development Mode (Fallback)
If email environment variables are not configured, the system will:
- Log all emails to the console with full details
- Show a warning message about using development mode
- Continue to work normally for testing

## Troubleshooting

### Common Issues:
1. **"Invalid credentials"** - Make sure you're using an app password, not your regular password
2. **"Connection refused"** - Check if your network blocks SMTP ports
3. **"Authentication failed"** - Verify your email and password are correct

### Gmail Specific:
- Must use app password (not regular password)
- 2-factor authentication must be enabled
- Less secure app access is no longer supported

### Testing:
- Check console logs for any error messages
- Verify emails are being sent to the correct address
- Check spam folder if emails don't appear in inbox

## Security Notes
- Never commit your .env file to version control
- Use app passwords instead of regular passwords
- Consider using environment-specific configurations 