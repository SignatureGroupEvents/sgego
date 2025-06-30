const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

module.exports = async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `"SGEGO" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log('✅ Email sent to:', to);
  } catch (err) {
    console.error('❌ Email send failed:', err.message);
  }
};
