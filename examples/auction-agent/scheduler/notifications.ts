import nodemailer from 'nodemailer';
import type { Logger } from 'pino';
import twilio from 'twilio';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromPhone: string;
}

export class NotificationService {
  private emailTransporter?: nodemailer.Transporter;
  private twilioClient?: twilio.Twilio;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeEmailService();
    this.initializeSMSService();
  }

  /**
   * Initialize email service with configuration from environment
   */
  private initializeEmailService(): void {
    const emailConfig = this.getEmailConfig();

    if (emailConfig) {
      try {
        this.emailTransporter = nodemailer.createTransport({
          host: emailConfig.host,
          port: emailConfig.port,
          secure: emailConfig.secure,
          auth: emailConfig.auth,
        });

        this.logger.info('Email notification service initialized');
      } catch (error) {
        this.logger.warn({ err: error }, 'Failed to initialize email service');
      }
    } else {
      this.logger.debug(
        'Email service not configured - skipping initialization',
      );
    }
  }

  /**
   * Initialize SMS service with Twilio configuration
   */
  private initializeSMSService(): void {
    const smsConfig = this.getSMSConfig();

    if (smsConfig) {
      try {
        this.twilioClient = twilio(smsConfig.accountSid, smsConfig.authToken);
        this.logger.info('SMS notification service initialized');
      } catch (error) {
        this.logger.warn({ err: error }, 'Failed to initialize SMS service');
      }
    } else {
      this.logger.debug('SMS service not configured - skipping initialization');
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    const emailConfig = this.getEmailConfig();
    if (!emailConfig) {
      throw new Error('Email configuration missing');
    }

    try {
      const info = await this.emailTransporter.sendMail({
        from: emailConfig.from,
        to,
        subject,
        html,
      });

      this.logger.info(
        { messageId: info.messageId, to },
        'Email notification sent',
      );
    } catch (error) {
      this.logger.error(
        { err: error, to, subject },
        'Failed to send email notification',
      );
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(to: string, message: string): Promise<void> {
    if (!this.twilioClient) {
      throw new Error('SMS service not configured');
    }

    const smsConfig = this.getSMSConfig();
    if (!smsConfig) {
      throw new Error('SMS configuration missing');
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: smsConfig.fromPhone,
        to,
      });

      this.logger.info({ messageSid: result.sid, to }, 'SMS notification sent');
    } catch (error) {
      this.logger.error({ err: error, to }, 'Failed to send SMS notification');
      throw error;
    }
  }

  /**
   * Send error notification to admin
   */
  async sendErrorNotification(
    adminContact: string,
    jobId: string,
    error: string,
  ): Promise<void> {
    const isEmail = adminContact.includes('@');
    const timestamp = new Date().toLocaleString();

    try {
      if (isEmail) {
        const subject = `🚨 Auction Agent Error: ${jobId}`;
        const html = `
          <h2>🚨 Auction Agent Error</h2>
          <p><strong>Job ID:</strong> ${jobId}<br>
          <strong>Time:</strong> ${timestamp}<br>
          <strong>Error:</strong> ${error}</p>
          <p>The scheduled auction monitoring job has failed. Please check the logs for more details.</p>
        `;

        await this.sendEmailNotification(adminContact, subject, html);
      } else {
        const message = `🚨 Auction Agent Error\nJob: ${jobId}\nTime: ${timestamp}\nError: ${error.slice(0, 100)}...`;
        await this.sendSMSNotification(adminContact, message);
      }
    } catch (notificationError) {
      this.logger.error(
        {
          err: notificationError,
          originalError: error,
          adminContact,
        },
        'Failed to send error notification',
      );
    }
  }

  /**
   * Test email configuration
   */
  async testEmailConfig(): Promise<boolean> {
    if (!this.emailTransporter) {
      return false;
    }

    try {
      await this.emailTransporter.verify();
      return true;
    } catch (error) {
      this.logger.warn({ err: error }, 'Email configuration test failed');
      return false;
    }
  }

  /**
   * Test SMS configuration
   */
  async testSMSConfig(): Promise<boolean> {
    if (!this.twilioClient) {
      return false;
    }

    const smsConfig = this.getSMSConfig();
    if (!smsConfig) {
      return false;
    }

    try {
      // Test by fetching account info
      await this.twilioClient.api.accounts(smsConfig.accountSid).fetch();
      return true;
    } catch (error) {
      this.logger.warn({ err: error }, 'SMS configuration test failed');
      return false;
    }
  }

  /**
   * Get email configuration from environment
   */
  private getEmailConfig(): EmailConfig | null {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM;

    if (!host || !port || !user || !pass || !from) {
      return null;
    }

    return {
      host,
      port: Number.parseInt(port, 10),
      secure: (process.env.SMTP_SECURE || 'true').toLowerCase() === 'true',
      auth: { user, pass },
      from,
    };
  }

  /**
   * Get SMS configuration from environment
   */
  private getSMSConfig(): SMSConfig | null {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_FROM_PHONE;

    if (!accountSid || !authToken || !fromPhone) {
      return null;
    }

    return {
      accountSid,
      authToken,
      fromPhone,
    };
  }

  /**
   * Get notification service status
   */
  getStatus(): { email: boolean; sms: boolean } {
    return {
      email: Boolean(this.emailTransporter && this.getEmailConfig()),
      sms: Boolean(this.twilioClient && this.getSMSConfig()),
    };
  }
}
