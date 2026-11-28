import nodemailer from 'nodemailer';

interface SendOtpEmailParams {
    to: string;
    otp: string;
    name?: string;
}

interface SendPasswordResetEmailParams {
    to: string;
    resetUrl: string;
    name?: string;
}

export class EmailService {
    private transporter: nodemailer.Transporter | null = null;
    private hasSmtpConfig = false;

    constructor() {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT) || 587;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (host && user && pass) {
            this.hasSmtpConfig = true;
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            });
        }
    }

    /**
     * Dispatches a 6-digit OTP verification email for passwordless login
     */
    async sendOtpEmail({ to, otp, name }: SendOtpEmailParams): Promise<{ success: boolean; simulated?: boolean; error?: string }> {
        const fromAddress = process.env.SMTP_FROM || 'Primebake Security <security@primebake.app>';
        const greeting = name ? `Hello ${name},` : 'Hello,';

        const subject = `Your Primebake Login Verification Code: ${otp}`;
        const textContent = `${greeting}\n\nYour 6-digit login verification code is: ${otp}\n\nThis code will expire in 5 minutes. If you did not request this login, please ignore this email.\n\nBest regards,\nPrimebake Security Team`;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 500px; background: #ffffff; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; overflow: hidden; padding: 40px 32px;">
          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="width: 56px; height: 56px; background-color: #2563eb; border-radius: 16px; line-height: 56px; text-align: center; color: #ffffff; font-size: 26px; font-weight: 900; margin: 0 auto; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
                P
              </div>
              <h2 style="margin: 16px 0 4px; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">Primebake Security</h2>
              <p style="margin: 0; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px;">Bakery Management & Invoicing</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 16px 0; color: #334155; font-size: 14px; line-height: 1.6;">
              <p style="margin: 0 0 16px; font-size: 15px; font-weight: 600; color: #1e293b;">${greeting}</p>
              <p style="margin: 0 0 24px; color: #64748b;">
                You requested a secure one-time passcode to sign in to your Primebake account. Enter this code on the login screen to continue:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 34px; font-weight: 900; letter-spacing: 10px; color: #1d4ed8; font-family: monospace;">${otp}</span>
              </div>

              <div style="background: #eff6ff; border-radius: 12px; padding: 12px 16px; margin-bottom: 24px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; font-size: 12px; color: #1e40af; font-weight: 600;">
                  ⏳ This verification code expires in <strong>5 minutes</strong> and can only be used once.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                If you did not request this verification code, someone may have entered your email by mistake. Your account remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 24px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 11px;">
              &copy; ${new Date().getFullYear()} Primebake. Confidential & Automated Message.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

        if (this.hasSmtpConfig && this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: fromAddress,
                    to,
                    subject,
                    text: textContent,
                    html: htmlContent,
                });
                return { success: true };
            } catch (err: any) {
                console.error('[EmailService] SMTP delivery error:', err);
                // Fall back to console in development
                this.logToConsole('LOGIN OTP (SMTP Failed Fallback)', to, otp);
                return { success: true, simulated: true };
            }
        }

        // Development & local simulation fallback
        this.logToConsole('LOGIN OTP (Local Development)', to, otp);
        return { success: true, simulated: true };
    }

    /**
     * Dispatches a password reset link
     */
    async sendPasswordResetEmail({ to, resetUrl, name }: SendPasswordResetEmailParams): Promise<{ success: boolean; simulated?: boolean; error?: string }> {
        const fromAddress = process.env.SMTP_FROM || 'Primebake Security <security@primebake.app>';
        const greeting = name ? `Hello ${name},` : 'Hello,';

        const subject = `Reset Your Primebake Account Password`;
        const textContent = `${greeting}\n\nWe received a request to reset your Primebake account password.\n\nPlease click the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 1 hour. If you did not request a password reset, please ignore this email.\n\nBest regards,\nPrimebake Security Team`;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 500px; background: #ffffff; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; overflow: hidden; padding: 40px 32px;">
          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="width: 56px; height: 56px; background-color: #2563eb; border-radius: 16px; line-height: 56px; text-align: center; color: #ffffff; font-size: 26px; font-weight: 900; margin: 0 auto; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
                P
              </div>
              <h2 style="margin: 16px 0 4px; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">Primebake Security</h2>
              <p style="margin: 0; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px;">Password Recovery</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 16px 0; color: #334155; font-size: 14px; line-height: 1.6;">
              <p style="margin: 0 0 16px; font-size: 15px; font-weight: 600; color: #1e293b;">${greeting}</p>
              <p style="margin: 0 0 24px; color: #64748b;">
                We received a request to reset your password. Click the button below to choose a new password:
              </p>

              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: 800; font-size: 14px; text-decoration: none; display: inline-block; box-shadow: 0 4px 14px rgba(37,99,235,0.35);">
                  Reset Your Password
                </a>
              </div>

              <div style="background: #f8fafc; border-radius: 12px; padding: 14px; margin-bottom: 24px; font-size: 11px; color: #64748b; word-break: break-all;">
                Or copy and paste this link in your browser:<br/>
                <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
              </div>

              <div style="background: #fffbeb; border-radius: 12px; padding: 12px 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 12px; color: #b45309; font-weight: 600;">
                  ⏳ This link is valid for <strong>1 hour</strong> and can only be used once.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 24px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 11px;">
              &copy; ${new Date().getFullYear()} Primebake. Secure Account Services.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

        if (this.hasSmtpConfig && this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: fromAddress,
                    to,
                    subject,
                    text: textContent,
                    html: htmlContent,
                });
                return { success: true };
            } catch (err: any) {
                console.error('[EmailService] SMTP delivery error:', err);
                this.logToConsole('PASSWORD RESET (SMTP Failed Fallback)', to, resetUrl);
                return { success: true, simulated: true };
            }
        }

        // Development & local simulation fallback
        this.logToConsole('PASSWORD RESET (Local Development)', to, resetUrl);
        return { success: true, simulated: true };
    }

    private logToConsole(type: string, to: string, content: string) {
        console.log('\n=============================================================');
        console.log(`[EMAIL SERVICE] - ${type}`);
        console.log(`To: ${to}`);
        console.log(`Payload/Link: ${content}`);
        console.log(`Time: ${new Date().toISOString()}`);
        console.log('=============================================================\n');
    }
}

export const emailService = new EmailService();
export default emailService;
