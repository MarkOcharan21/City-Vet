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
  const pass = (process.env.EMAIL_PASS || '').replace(/\s/g, '');
  const norm = pass.toLowerCase().replace(/[^a-z0-9]/g, '');
  const placeholderTokens = [
    'yourapppassword',
    'yourpassword',
    'youremail',
    'yourapikey',
    'apppassword',
    'changeme',
    'changethis',
    'placeholder',
    'replace',
    'example',
    'xxxx',
  ];
  const looksPlaceholder =
    norm.length === 0 || placeholderTokens.some((t) => norm.includes(t));
  return Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER) && !looksPlaceholder;
}

async function sendMail({ to, subject, text, html }) {
  if (!isEmailConfigured()) {
    console.warn(`Email config is missing or still a placeholder. Skipping email to ${to}: ${subject}`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'no-reply@cityvet.com',
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    const code = error && (error.code || error.responseCode);
    console.warn(
      `Email send failed for ${to} (${subject})` +
        (code ? ` [${code}]` : '') +
        ': ' +
        (error && error.message)
    );
    if (code === 'EAUTH' || code === '535') {
      console.warn(
        'SMTP rejected the credentials. If the Gmail app password was revoked or rotated, update EMAIL_PASS in backend/.env and restart the backend.'
      );
    }
    throw error;
  }
}

async function sendResetCodeEmail(email, code, resetUrl) {
  const emailLink = resetUrl
    ? `\nEnter the code here: ${resetUrl}`
    : '';

  const sent = await sendMail({
    to: email,
    subject: 'City Vet Password Reset OTP',
    text: `Your City Vet password reset code is ${code}. This code expires in 15 minutes.${emailLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2 style="margin: 0 0 12px; color: #C8102E;">City Vet Cabuyao</h2>
        <p style="margin: 0 0 8px;">Your City Vet password reset code is:</p>
        <p style="margin: 0 0 16px;">
          <span style="display:inline-block;background:#C8102E;color:#fff;padding:10px 18px;border-radius:8px;font-size:22px;font-weight:700;letter-spacing:4px;">${code}</span>
        </p>
        <p style="margin: 0 0 16px;">This code expires in 15 minutes.</p>
        ${
          resetUrl
            ? `<p style="margin: 0 0 16px;">
                 <a href="${resetUrl}" style="display:inline-block;background:#C8102E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Enter Reset Code</a>
               </p>
               <p style="margin: 0; font-size: 13px; color: #666;">
                 If the button does not work, copy and paste this link into your browser: ${resetUrl}
               </p>`
            : ''
        }
      </div>
    `,
  });

  return sent;
}

async function sendRegistrationOtpEmail(email, code, expiresInMinutes) {
  return sendMail({
    to: email,
    subject: 'City Vet Pet Owner Account Verification',
    text: `Your City Vet account verification code is ${code}. Enter it on the registration page to activate your account. This code expires in ${expiresInMinutes} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2 style="margin: 0 0 12px; color: #C8102E;">City Vet Cabuyao</h2>
        <p style="margin: 0 0 8px;">Thank you for creating a Pet Owner account.</p>
        <p style="margin: 0 0 8px;">Use the code below to verify your email and activate your account:</p>
        <p style="margin: 0 0 8px;">
          <span style="display:inline-block;background:#C8102E;color:#fff;padding:10px 18px;border-radius:8px;font-size:22px;font-weight:700;letter-spacing:4px;">${code}</span>
        </p>
        <p style="margin: 0 0 16px; font-size: 13px; color: #666;">
          This code expires in ${expiresInMinutes} minutes. If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
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

const ROLE_EMAIL = {
  Staff: {
    subject: "Your Cabuyao City Veterinary Office Staff Account",
    text: (id) =>
      `Your staff account has been created by the System Administrator.\n\nStaff ID: ${id}\nRole: Staff\n\nPlease verify your account and create your password to complete your account setup.`,
  },
  Veterinarian: {
    subject: "Your Cabuyao City Veterinary Office Veterinarian Account",
    text: (id) =>
      `Your veterinarian account has been created by the System Administrator.\n\nVeterinarian ID: ${id}\nRole: Veterinarian\n\nPlease verify your account and create your password to complete your account setup.`,
  },
};

async function sendAccountSetupEmail({ to, role, accountId, setupUrl, expiresInMinutes }) {
  const template = ROLE_EMAIL[role] || ROLE_EMAIL.Staff;
  return sendMail({
    to,
    subject: template.subject,
    text: `${template.text(accountId)}\n\nSet up your account here (expires in ${expiresInMinutes} minutes):\n${setupUrl}\n\nIf the link expired, ask the System Administrator to resend it.\n— City Veterinary Office, Cabuyao`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2 style="margin: 0 0 12px; color: #C8102E;">City Vet Cabuyao</h2>
        <p style="margin: 0 0 8px;">Your account has been created by the System Administrator.</p>
        <p style="margin: 0 0 6px;"><strong>${role} ID:</strong> ${accountId}</p>
        <p style="margin: 0 0 6px;"><strong>Role:</strong> ${role}</p>
        <p style="margin: 0 0 16px;">Please verify your account and create your password to complete your account setup.</p>
        <p style="margin: 0 0 16px;">
          <a href="${setupUrl}" style="display:inline-block;background:#C8102E;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Set Up My Account</a>
        </p>
        <p style="margin: 0; font-size: 13px; color: #666;">
          This link expires in ${expiresInMinutes} minutes and can only be used once. If it expired, ask the System Administrator to resend it.
        </p>
      </div>
    `,
  });
}

module.exports = {
  isEmailConfigured,
  sendResetCodeEmail,
  sendRegistrationOtpEmail,
  sendNotificationEmail,
  sendAccountSetupEmail,
};
