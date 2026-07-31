import nodemailer from 'nodemailer';

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html?: string; text?: string }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.SMTP_FROM || 'Percel <onboarding@resend.dev>';

  // 1. Send via Resend HTTP API if RESEND_API_KEY is configured
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          text: text ?? html,
          html: html ?? text,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[RESEND EMAIL SUCCESS] Sent email to ${to}, ID: ${data?.id}`);
        return;
      }
      const errBody = await response.text();
      console.error(`[RESEND EMAIL ERROR] Status ${response.status}: ${errBody}`);
    } catch (resendErr) {
      console.error('[RESEND EMAIL EXCEPTION]', resendErr);
    }
  }

  // 2. Send via SMTP / Nodemailer
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log('----------------------------------------');
    console.log(`[MOCK EMAIL] To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text || html}`);
    console.log('----------------------------------------');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}
