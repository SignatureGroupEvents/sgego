/**
 * Quick Environment Configuration Checker
 * Run with: node CHECK_ENV.js
 * 
 * This script verifies that all required environment variables are set
 */

require('dotenv').config();

console.log('\n🔍 Checking Environment Configuration...\n');

const required = {
  'NODE_ENV': process.env.NODE_ENV,
  'PORT': process.env.PORT,
  'MONGODB_URI': process.env.MONGODB_URI,
  'JWT_SECRET': process.env.JWT_SECRET,
  'JWT_EXPIRE': process.env.JWT_EXPIRE,
  'CLIENT_URL': process.env.CLIENT_URL,
  'FRONTEND_URL': process.env.FRONTEND_URL,
  'CORS_ORIGIN': process.env.CORS_ORIGIN,
};

const email = {
  'EMAIL_HOST': process.env.EMAIL_HOST,
  'EMAIL_PORT': process.env.EMAIL_PORT,
  'EMAIL_USER': process.env.EMAIL_USER,
  'EMAIL_PASS': process.env.EMAIL_PASS,
};

console.log('📋 Required Variables:');
let missing = [];
Object.entries(required).forEach(([key, value]) => {
  if (value) {
    console.log(`  ✅ ${key}: SET`);
  } else {
    console.log(`  ❌ ${key}: NOT SET`);
    missing.push(key);
  }
});

console.log('\n📧 Email Configuration:');
let emailConfigured = true;
Object.entries(email).forEach(([key, value]) => {
  if (value) {
    if (key === 'EMAIL_PASS') {
      console.log(`  ✅ ${key}: SET (${value.length} characters)`);
    } else if (key === 'EMAIL_USER') {
      console.log(`  ✅ ${key}: ${value}`);
      if (value !== 'admin@signaturegroupevents.com' && !value.includes('example.com') && !value.includes('test')) {
        console.log(`     ⚠️  Note: Currently using "${value}" - consider updating to admin@signaturegroupevents.com`);
      }
    } else {
      console.log(`  ✅ ${key}: ${value}`);
    }
  } else {
    console.log(`  ❌ ${key}: NOT SET`);
    emailConfigured = false;
  }
});

console.log('\n📊 Summary:');
if (missing.length === 0) {
  console.log('  ✅ All required variables are set');
} else {
  console.log(`  ❌ Missing ${missing.length} required variable(s): ${missing.join(', ')}`);
}

if (emailConfigured) {
  console.log('  ✅ Email is configured');
} else {
  console.log('  ⚠️  Email is NOT configured - emails will be logged to console instead');
}

console.log('\n💡 Tips:');
console.log('  - Ensure CLIENT_URL matches your frontend URL');
console.log('  - Update EMAIL_USER to admin@signaturegroupevents.com');
console.log('  - Use App Password (not regular password) for EMAIL_PASS');
console.log('  - See ENV_CONFIGURATION.md for detailed setup instructions');
console.log('');

