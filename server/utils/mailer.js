const { SendMailClient } = require("zeptomail");

// Admin-panel override — set via setAdminEmailSettings().
// Takes priority over env vars.
let _adminSettings = null;
let _cachedZeptoClient = null;

function setAdminEmailSettings(settings) {
  _adminSettings = settings && typeof settings === "object" ? settings : null;
  _cachedZeptoClient = null;
}

function getEmailStatus() {
  const s = _adminSettings || {};
  const provider = s.emailProvider || process.env.EMAIL_PROVIDER || "zepto";

  if (provider === "smtp") {
    const fromAdmin = Boolean(s.smtpHost && s.smtpUser && s.smtpPass);
    const fromEnv   = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    return {
      provider: "smtp",
      configured: fromAdmin || fromEnv,
      source: fromAdmin ? "admin" : fromEnv ? "env" : "none",
      hasOverride: fromAdmin,
      hasEnv: fromEnv,
      smtpHost: s.smtpHost || process.env.SMTP_HOST || "",
      emailFrom: s.emailFrom || process.env.MAIL_FROM_ADDRESS || "",
      emailFromName: s.emailFromName || process.env.MAIL_FROM_NAME || "",
    };
  }

  const fromAdmin = Boolean(s.zeptomailToken);
  const fromEnv   = Boolean(process.env.ZEPTOMAIL_TOKEN);
  return {
    provider: "zepto",
    configured: fromAdmin || fromEnv,
    source: fromAdmin ? "admin" : fromEnv ? "env" : "none",
    hasOverride: fromAdmin,
    hasEnv: fromEnv,
    emailFrom: s.emailFrom || process.env.MAIL_FROM_ADDRESS || "",
    emailFromName: s.emailFromName || process.env.MAIL_FROM_NAME || "",
  };
}

function getZeptoClient() {
  if (_cachedZeptoClient) return _cachedZeptoClient;
  const s = _adminSettings || {};
  const token = s.zeptomailToken || process.env.ZEPTOMAIL_TOKEN;
  if (!token) throw new Error("Email is not configured. Ask your admin to add credentials in the Admin Panel → Integrations.");
  const formatted = token.startsWith("Zoho-enczapikey ") ? token : `Zoho-enczapikey ${token}`;
  const url = process.env.ZEPTOMAIL_URL || "https://api.zeptomail.in/v1.1/email";
  _cachedZeptoClient = new SendMailClient({ url, token: formatted });
  return _cachedZeptoClient;
}

async function sendViaZepto({ to, toName, subject, html, text, from, fromName }) {
  const client = getZeptoClient();
  return client.sendMail({
    from: { address: from, name: fromName },
    to: [{ email_address: { address: to, name: toName || to } }],
    subject,
    htmlbody: html,
    ...(text ? { textbody: text } : {}),
  });
}

async function sendViaSmtp({ to, toName, subject, html, text, from, fromName, smtpHost, smtpPort, smtpUser, smtpPass }) {
  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10) || 587,
    secure: (parseInt(smtpPort, 10) || 587) === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
  await transporter.sendMail({
    from: `"${fromName}" <${from}>`,
    to: toName ? `"${toName}" <${to}>` : to,
    subject, html, text,
  });
}

async function sendMail({ to, toName, subject, html, text }) {
  const s = _adminSettings || {};
  const provider  = s.emailProvider || process.env.EMAIL_PROVIDER || "zepto";
  const from      = s.emailFrom     || process.env.MAIL_FROM_ADDRESS || "noreply@rivetglobal.net";
  const fromName  = s.emailFromName || process.env.MAIL_FROM_NAME    || "Rivet AI";

  if (provider === "smtp") {
    const smtpHost = s.smtpHost || process.env.SMTP_HOST || "";
    const smtpPort = s.smtpPort || process.env.SMTP_PORT || "587";
    const smtpUser = s.smtpUser || process.env.SMTP_USER || "";
    const smtpPass = s.smtpPass || process.env.SMTP_PASS || "";
    if (!smtpHost || !smtpUser || !smtpPass) throw new Error("SMTP is not fully configured. Set host, user, and password in the Admin Panel.");
    return sendViaSmtp({ to, toName, subject, html, text, from, fromName, smtpHost, smtpPort, smtpUser, smtpPass });
  }

  return sendViaZepto({ to, toName, subject, html, text, from, fromName });
}

function buildBookingConfirmationEmail({ name, date, time, location, projectName }) {
  const safeName = (name || 'there').replace(/[<>]/g, '');
  const safeProject = (projectName || 'us').replace(/[<>]/g, '');
  const locationLine = location ? `<p style="margin:0 0 6px;"><strong>Location:</strong> ${location.replace(/[<>]/g, '')}</p>` : '';
  const locationText = location ? `Location:  ${location}\n` : '';
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f5f7fb;padding:32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(15,23,42,0.06);">
        <tr><td style="padding:28px 32px 8px;">
          <h1 style="margin:0;font-size:20px;color:#0f172a;">Booking confirmed!</h1>
        </td></tr>
        <tr><td style="padding:8px 32px 0;color:#334155;font-size:14px;line-height:1.6;">
          <p>Hi ${safeName},</p>
          <p>Your booking with <strong>${safeProject}</strong> has been confirmed. Here are your details:</p>
        </td></tr>
        <tr><td style="padding:12px 32px;">
          <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;border-left:4px solid #2563eb;">
            <p style="margin:0 0 6px;"><strong>Date:</strong> ${String(date || '').replace(/[<>]/g, '')}</p>
            <p style="margin:0 0 6px;"><strong>Time:</strong> ${String(time || '').replace(/[<>]/g, '')}</p>
            ${locationLine}
          </div>
        </td></tr>
        <tr><td style="padding:8px 32px 28px;color:#64748b;font-size:12px;line-height:1.6;">
          <p style="margin-top:18px;">If you need to make any changes, please contact us directly.</p>
          <p style="margin-top:12px;color:#94a3b8;">— ${safeProject}</p>
        </td></tr>
      </table>
    </div>
  `;
  const text = `Booking confirmed!\n\nHi ${safeName},\n\nYour booking with ${safeProject} has been confirmed.\n\nDate:  ${date}\nTime:  ${time}\n${locationText}\nIf you need to make changes, please contact us directly.`;
  return { html, text };
}

function buildResetEmail({ name, resetUrl }) {
  const safeName = (name || "there").replace(/[<>]/g, "");
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f5f7fb;padding:32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(15,23,42,0.06);">
        <tr><td style="padding:28px 32px 8px;"><h1 style="margin:0;font-size:20px;color:#0f172a;">Reset your password</h1></td></tr>
        <tr><td style="padding:8px 32px 0;color:#334155;font-size:14px;line-height:1.6;">
          <p>Hi ${safeName},</p>
          <p>We received a request to reset your Rivet AI password. Click below — this link expires in 60 minutes.</p>
        </td></tr>
        <tr><td style="padding:20px 32px 8px;">
          <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;">Reset password</a>
        </td></tr>
        <tr><td style="padding:12px 32px 28px;color:#64748b;font-size:12px;line-height:1.6;">
          <p>If the button doesn't work, paste this link into your browser:</p>
          <p style="word-break:break-all;color:#2563eb;">${resetUrl}</p>
          <p style="margin-top:18px;">If you didn't request this, you can safely ignore this email.</p>
          <p style="margin-top:18px;color:#94a3b8;">— Rivet AI</p>
        </td></tr>
      </table>
    </div>
  `;
  const text = `Reset your Rivet AI password\n\nHi ${safeName},\n\nReset link (expires in 60 min):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`;
  return { html, text };
}

module.exports = { sendMail, buildResetEmail, buildBookingConfirmationEmail, setAdminEmailSettings, getEmailStatus };
