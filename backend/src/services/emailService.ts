import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send a password reset email with a reset link and 15-minute expiry notice.
 * Errors are logged but not thrown to prevent revealing email existence.
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${process.env.PASSWORD_RESET_URL}?token=${token}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a56db;">Reset Password - PoldaHelp Kalsel</h2>
      <p>Anda menerima email ini karena ada permintaan untuk mereset password akun Anda.</p>
      <p>Klik tombol di bawah ini untuk mereset password Anda:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #1a56db; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p>Atau salin link berikut ke browser Anda:</p>
      <p style="word-break: break-all; color: #4b5563;">${resetUrl}</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #dc2626; font-weight: bold;">Link ini hanya berlaku selama 15 menit.</p>
      <p style="color: #6b7280; font-size: 14px;">
        Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tidak akan berubah.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Reset Password - PoldaHelp Kalsel',
      html: htmlBody,
    });
    logger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    logger.error('Failed to send password reset email', error);
  }
}
