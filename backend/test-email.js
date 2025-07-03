const sendEmail = require('./utils/sendEmail');
require('dotenv').config();

async function testEmail() {
  console.log('🧪 Testing email configuration...');
  console.log('Email Host:', process.env.EMAIL_HOST || 'Not set');
  console.log('Email User:', process.env.EMAIL_USER || 'Not set');
  console.log('Email Pass:', process.env.EMAIL_PASS ? 'Set' : 'Not set');
  console.log('---');

  try {
    await sendEmail({
      to: process.env.EMAIL_USER || 'test@example.com',
      subject: '🧪 Email Test - SGEGO System',
      html: `
        <h2>Email Test Successful!</h2>
        <p>This is a test email from your SGEGO event check-in system.</p>
        <p>If you received this email, your email configuration is working correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
      `
    });
    
    console.log('✅ Email test completed successfully!');
    console.log('📧 Check your email inbox for the test message.');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Check your .env file has EMAIL_HOST, EMAIL_USER, and EMAIL_PASS');
    console.log('2. For Gmail, make sure you\'re using an app password, not your regular password');
    console.log('3. Verify 2-factor authentication is enabled for Gmail');
    console.log('4. Check if your network blocks SMTP ports');
  }
}

testEmail(); 