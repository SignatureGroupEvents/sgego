const nodemailer = require('nodemailer');

// Check if email configuration is available
const isEmailConfigured = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

let transporter;
if (isEmailConfigured) {
  transporter = nodemailer.createTransport({ // ✅ FIXED FUNCTION NAME
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false, // you can set true if using port 465 with SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });
}

module.exports = async function sendEmail({ to, subject, html }) {
  try {
    if (!isEmailConfigured) {
      console.log('⚠️  Email not configured - logging email content instead:');
      console.log('📧 To:', to);
      console.log('📧 Subject:', subject);
      console.log('📧 Content:', html);
      return;
    }

    await transporter.sendMail({
      from: `"SGEGO" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log('✅ Email sent to:', to);
  } catch (err) {
    console.error('❌ Email send failed:', err.message);
    throw err;
  }
};
