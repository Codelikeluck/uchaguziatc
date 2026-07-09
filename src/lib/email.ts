import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function getConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user,
    pass,
    from: process.env.EMAIL_FROM || user,
  };
}

export async function sendOTPEmail(
  to: string,
  otp: string,
  studentName: string,
): Promise<{ sent: boolean; error?: string; from?: string; to?: string }> {
  const config = getConfig();
  if (!config) {
    return { sent: false, error: 'SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)' };
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

  try {
    const info = await transport.sendMail({
      from: config.from,
      to,
      subject: 'Your ATC Voting OTP Code',
      html: `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 48px; height: 48px; background: #1e40af; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 24px; font-weight: bold;">✓</span>
            </div>
            <h1 style="color: #0f172a; font-size: 20px; margin-top: 12px;">SOATECO Voting OTP</h1>
          </div>
          <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <p style="color: #475569; margin: 0 0 16px;">Hello <strong>${studentName}</strong>,</p>
            <p style="color: #475569; margin: 0 0 16px;">Use the code below to verify your identity and cast your vote in the SOATECO General Elections.</p>
            <div style="text-align: center; margin: 24px 0;">
              <div style="display: inline-block; background: #f1f5f9; border-radius: 12px; padding: 16px 32px; letter-spacing: 8px; font-size: 32px; font-weight: 800; color: #1e40af; font-family: monospace;">
                ${otp}
              </div>
            </div>
            <p style="color: #94a3b8; font-size: 13px; margin: 0;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">
            Arusha Technical College &bull; SOATECO General Elections
          </p>
        </div>
      `,
    });

    return { sent: true, from: config.from, to };
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error('Email send failed:', message);
    return { sent: false, error: message, from: config.from, to };
  }
}
