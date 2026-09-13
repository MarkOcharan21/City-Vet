const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: (process.env.EMAIL_PASS || '').replace(/\s/g, ''),
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

function isEmailConfigured() {
  return Boolean(
    process.env.EMAIL_HOST &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS
  );
}

async function sendMail({ to, subject, text, html }) {
  if (!isEmailConfigured()) {
    console.warn(`Email config is missing. Skipping email to ${to}: ${subject}`);
    return false;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@cityvet.com',
    to,
    subject,
    text,
    html,
  });

  return true;
}

async function sendResetCodeEmail(email, code) {
  const sent = await sendMail({
    to: email,
    subject: 'City Vet Password Reset OTP',
    text: `Your City Vet password reset code is ${code}. This code expires in 15 minutes.`,
    html: `
      <p>Your City Vet password reset code is <strong>${code}</strong>.</p>
      <p>This code expires in 15 minutes.</p>
    `,
  });

  return sent;
}

async function sendNotificationEmail(email, title, message) {
  return sendMail({
    to: email,
    subject: `City Vet Notification: ${title}`,
    text: `${title}\n\n${message}\n\n— City Veterinary Office, Cabuyao`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2 style="margin: 0 0 12px; color: #C8102E;">City Vet Cabuyao</h2>
        <p style="margin: 0 0 8px;"><strong>${title}</strong></p>
        <p style="margin: 0 0 16px;">${message}</p>
        <p style="margin: 0; font-size: 13px; color: #666;">
          Log in to your portal to view this notification.
        </p>
      </div>
    `,
  });
}

module.exports = {
  sendResetCodeEmail,
  sendNotificationEmail,
};
