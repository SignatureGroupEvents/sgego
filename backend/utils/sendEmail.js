const nodemailer = require('nodemailer');

// Check if email configuration is available
const hasEmailConfig = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

let transporter;

if (hasEmailConfig) {
  // Real email configuration
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });
} else {
  // Development fallback - logs emails instead of sending them
  console.log('⚠️  Email configuration not found. Using development mode - emails will be logged instead of sent.');
  transporter = {
    sendMail: async (mailOptions) => {
      console.log('📧 DEVELOPMENT EMAIL LOG:');
      console.log('From:', mailOptions.from);
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('HTML Content:', mailOptions.html);
      console.log('---');
      return Promise.resolve({ messageId: 'dev-' + Date.now() });
    }
  };
}

module.exports = async function sendEmail({ to, subject, html }) {
  try {
    const result = await transporter.sendMail({
      from: hasEmailConfig ? `"SGEGO" <${process.env.EMAIL_USER}>` : '"SGEGO Dev" <dev@example.com>',
      to,
      subject,
      html
    });
    
    if (hasEmailConfig) {
      console.log('✅ Email sent to:', to);
    } else {
      console.log('✅ Development email logged for:', to);
    }
    
    return result;
  } catch (err) {
    console.error('❌ Email send failed:', err.message);
    throw err;
  }
};
