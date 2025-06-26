// utils/sendEmail.js
module.exports = async function sendEmail({ to, subject, html }) {
    console.log(`Sending email to ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML: ${html}`);
  };
  