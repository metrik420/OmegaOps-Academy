/**
 * FILE: src/services/EmailService.ts
 * PURPOSE: Email service for sending authentication-related emails (verification, password reset, welcome).
 *          Uses Nodemailer with SMTP transport for production-ready email delivery.
 * INPUTS: Recipient email, user data, tokens
 * OUTPUTS: Sent emails via SMTP
 * SIDE EFFECTS:
 *   - Sends emails to external SMTP server
 *   - Logs email sending events
 * NOTES:
 *   - Emails are sent asynchronously (non-blocking)
 *   - HTML templates include branding and clear call-to-action
 *   - All links include full URLs (FRONTEND_URL from env)
 *   - Fallback to console logging in development if SMTP not configured
 *   - Rate limiting recommended on email-sending endpoints (3 per hour)
 */

import nodemailer, { type Transporter } from 'nodemailer';
import { logger } from '../utils/logger';

/**
 * EmailService class.
 * Handles all email sending operations for authentication.
 *
 * @class EmailService
 */
export class EmailService {
  private static transporter: Transporter | null = null;

  /**
   * Initializes Nodemailer SMTP transporter.
   * Called lazily on first email send.
   *
   * @returns Transporter instance
   * @throws Error if SMTP credentials not configured
   * @complexity O(1)
   */
  private static getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    /*
     * SMTP configuration from environment variables.
     *
     * REQUIRED:
     * - EMAIL_HOST: SMTP server host (e.g., smtp.gmail.com)
     * - EMAIL_PORT: SMTP port (587 for TLS, 465 for SSL)
     * - EMAIL_USER: SMTP username (email address)
     * - EMAIL_PASSWORD: SMTP password or app-specific password
     *
     * OPTIONAL:
     * - EMAIL_FROM: Sender email (defaults to EMAIL_USER)
     * - EMAIL_FROM_NAME: Sender name (defaults to "OmegaOps Academy")
     */
    const host = process.env['EMAIL_HOST'];
    const port = parseInt(process.env['EMAIL_PORT'] || '587', 10);
    const user = process.env['EMAIL_USER'];
    const password = process.env['EMAIL_PASSWORD'];
    const from = process.env['EMAIL_FROM'] || user;
    const fromName = process.env['EMAIL_FROM_NAME'] || 'OmegaOps Academy';

    if (!host || !user || !password) {
      /*
       * In development, log to console instead of throwing.
       * This allows testing without SMTP server.
       */
      if (process.env['NODE_ENV'] !== 'production') {
        logger.warn('SMTP not configured. Emails will be logged to console.');
        /*
         * Create a dummy transporter that logs to console.
         */
        this.transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
        });
        return this.transporter;
      }

      throw new Error('Email service is not configured. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD in .env');
    }

    /*
     * Create SMTP transporter.
     *
     * SECURITY NOTE:
     * - Uses TLS encryption (port 587) or SSL (port 465)
     * - Rejects unauthorized certificates in production (secure: true)
     * - App-specific passwords recommended over account passwords
     */
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // SSL for port 465, TLS for others
      auth: {
        user,
        pass: password,
      },
      from: `${fromName} <${from}>`,
    });

    logger.info('Email service initialized', {
      host,
      port,
      from,
    });

    return this.transporter;
  }

  /**
   * Sends email using configured SMTP transporter.
   *
   * @param to - Recipient email address
   * @param subject - Email subject line
   * @param html - HTML email body
   * @param text - Plain text fallback (optional)
   * @returns Promise<void>
   * @throws Error if email sending fails
   * @complexity O(1) - Network I/O time
   * @security Never log email content (may contain tokens)
   */
  private static async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ): Promise<void> {
    try {
      const transporter = this.getTransporter();

      const info = await transporter.sendMail({
        to,
        subject,
        html,
        text: text || this.stripHtml(html), // Fallback to stripped HTML
      });

      /*
       * In development with streamTransport, log the email.
       */
      if (process.env['NODE_ENV'] !== 'production' && !process.env['EMAIL_HOST']) {
        logger.debug('Email sent (console mode)', {
          to,
          subject,
          messageId: info.messageId,
        });
        console.log('\n=== EMAIL ===');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body:\n${text || this.stripHtml(html)}`);
        console.log('=============\n');
      } else {
        logger.info('Email sent successfully', {
          to,
          subject,
          messageId: info.messageId,
        });
      }
    } catch (error) {
      logger.error('Failed to send email', {
        to,
        subject,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Strips HTML tags to create plain text version.
   *
   * @param html - HTML string
   * @returns Plain text string
   * @complexity O(n) where n = HTML length
   */
  private static stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Gets the frontend URL for generating email links.
   *
   * @returns Frontend base URL
   * @complexity O(1)
   */
  private static getFrontendUrl(): string {
    return process.env['FRONTEND_URL'] || 'http://localhost:5173';
  }

  /**
   * ==========================================================================
   * PUBLIC METHODS: EMAIL TEMPLATES
   * ==========================================================================
   */

  /**
   * Sends email verification email with confirmation link.
   *
   * @param email - Recipient email address
   * @param username - User's username for personalization
   * @param token - Verification token
   * @returns Promise<void>
   * @complexity O(1)
   * @security Token is single-use and expires in 1 hour
   */
  public static async sendVerificationEmail(
    email: string,
    username: string,
    token: string
  ): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const verificationUrl = `${frontendUrl}/verify-email/${token}`;

    const subject = 'Verify your email address - OmegaOps Academy';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .email-container {
      background-color: #ffffff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
      font-size: 28px;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    .code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🚀 Welcome to OmegaOps Academy!</h1>
    </div>

    <div class="content">
      <p>Hi <strong>${username}</strong>,</p>

      <p>Thank you for registering with OmegaOps Academy. To complete your registration and start learning server administration, please verify your email address.</p>

      <p style="text-align: center;">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </p>

      <p>Or copy and paste this link into your browser:</p>
      <p class="code">${verificationUrl}</p>

      <p><strong>Important:</strong> This verification link will expire in 1 hour. If it expires, you can request a new verification email from the login page.</p>
    </div>

    <div class="footer">
      <p>If you didn't create an account with OmegaOps Academy, please ignore this email or <a href="mailto:support@omegaops.academy">contact support</a>.</p>
      <p>&copy; ${new Date().getFullYear()} OmegaOps Academy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendEmail(email, subject, html);
  }

  /**
   * Sends password reset email with reset link.
   *
   * @param email - Recipient email address
   * @param username - User's username for personalization
   * @param token - Password reset token
   * @returns Promise<void>
   * @complexity O(1)
   * @security Token is single-use and expires in 1 hour
   */
  public static async sendPasswordResetEmail(
    email: string,
    username: string,
    token: string
  ): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const resetUrl = `${frontendUrl}/reset-password/${token}`;

    const subject = 'Reset your password - OmegaOps Academy';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .email-container {
      background-color: #ffffff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #dc2626;
      margin: 0;
      font-size: 28px;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background-color: #dc2626;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #b91c1c;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    .code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 14px;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🔐 Password Reset Request</h1>
    </div>

    <div class="content">
      <p>Hi <strong>${username}</strong>,</p>

      <p>We received a request to reset your password for your OmegaOps Academy account. If you made this request, click the button below to reset your password:</p>

      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>

      <p>Or copy and paste this link into your browser:</p>
      <p class="code">${resetUrl}</p>

      <div class="warning">
        <p><strong>Security Notice:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>This link will expire in 1 hour for security reasons</li>
          <li>If you didn't request this reset, please ignore this email</li>
          <li>Your password will remain unchanged unless you click the link above</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <p>If you didn't request a password reset, please ignore this email or <a href="mailto:support@omegaops.academy">contact support</a> if you have concerns.</p>
      <p>&copy; ${new Date().getFullYear()} OmegaOps Academy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendEmail(email, subject, html);
  }

  /**
   * Sends welcome email after successful email verification.
   *
   * @param email - Recipient email address
   * @param username - User's username for personalization
   * @returns Promise<void>
   * @complexity O(1)
   */
  public static async sendWelcomeEmail(
    email: string,
    username: string
  ): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const loginUrl = `${frontendUrl}/login`;
    const dashboardUrl = `${frontendUrl}/dashboard`;

    const subject = 'Welcome to OmegaOps Academy!';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .email-container {
      background-color: #ffffff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #059669;
      margin: 0;
      font-size: 28px;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background-color: #059669;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #047857;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    .feature-list {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .feature-list ul {
      margin: 0;
      padding-left: 20px;
    }
    .feature-list li {
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>✅ Email Verified Successfully!</h1>
    </div>

    <div class="content">
      <p>Hi <strong>${username}</strong>,</p>

      <p>Congratulations! Your email has been verified and your OmegaOps Academy account is now active. You're ready to start your journey to becoming a server administration expert!</p>

      <p style="text-align: center;">
        <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
      </p>

      <div class="feature-list">
        <p><strong>What's next?</strong></p>
        <ul>
          <li>📚 <strong>Explore Missions:</strong> 12-week structured curriculum with daily hands-on tasks</li>
          <li>🧪 <strong>Practice in Labs:</strong> Real-world scenarios to test your skills</li>
          <li>📖 <strong>Knowledge Base:</strong> Comprehensive reference guides and documentation</li>
          <li>🏆 <strong>Earn XP:</strong> Track your progress and level up your expertise</li>
        </ul>
      </div>

      <p>Ready to start learning? <a href="${loginUrl}">Log in now</a> and begin your first mission!</p>
    </div>

    <div class="footer">
      <p>Need help? Visit our <a href="${frontendUrl}/help">Help Center</a> or <a href="mailto:support@omegaops.academy">contact support</a>.</p>
      <p>&copy; ${new Date().getFullYear()} OmegaOps Academy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendEmail(email, subject, html);
  }

  /**
   * Sends login alert email (optional security feature).
   * Notifies user of new login from unrecognized device/location.
   *
   * @param email - Recipient email address
   * @param username - User's username
   * @param ipAddress - Login IP address
   * @param userAgent - Login user agent
   * @param timestamp - Login timestamp
   * @returns Promise<void>
   * @complexity O(1)
   */
  public static async sendLoginAlertEmail(
    email: string,
    username: string,
    ipAddress: string,
    userAgent: string,
    timestamp: string
  ): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const securityUrl = `${frontendUrl}/profile/security`;

    const subject = 'New login to your OmegaOps Academy account';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .email-container {
      background-color: #ffffff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #f59e0b;
      margin: 0;
      font-size: 28px;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background-color: #dc2626;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #b91c1c;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    .info-box {
      background-color: #f3f4f6;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      font-family: monospace;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🔔 New Login Detected</h1>
    </div>

    <div class="content">
      <p>Hi <strong>${username}</strong>,</p>

      <p>We detected a new login to your OmegaOps Academy account. If this was you, you can safely ignore this email.</p>

      <div class="info-box">
        <p><strong>Login Details:</strong></p>
        <p>Time: ${new Date(timestamp).toLocaleString()}</p>
        <p>IP Address: ${ipAddress}</p>
        <p>Device: ${userAgent}</p>
      </div>

      <p><strong>Was this you?</strong></p>
      <ul>
        <li>If yes: No action needed. You're all set!</li>
        <li>If no: Please secure your account immediately by changing your password.</li>
      </ul>

      <p style="text-align: center;">
        <a href="${securityUrl}" class="button">Review Security Settings</a>
      </p>
    </div>

    <div class="footer">
      <p>This is an automated security notification. If you have concerns, <a href="mailto:support@omegaops.academy">contact support</a> immediately.</p>
      <p>&copy; ${new Date().getFullYear()} OmegaOps Academy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendEmail(email, subject, html);
  }
}
