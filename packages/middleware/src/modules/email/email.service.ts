import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

interface PlunkResponse {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
  };
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiUrl = (process.env.PLUNK_API_URL || 'https://next-api.useplunk.com').replace(/\/$/, '');
  private readonly secretKey = process.env.PLUNK_SECRET_KEY;

  async sendEmail(input: SendEmailInput): Promise<void> {
    if (!this.secretKey) {
      this.logger.error('PLUNK_SECRET_KEY is not configured');
      throw new ServiceUnavailableException('Email delivery is not configured');
    }

    const response = await fetch(`${this.apiUrl}/v1/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    const payload = (await response.json().catch(() => ({}))) as PlunkResponse;

    if (!response.ok || payload.success === false) {
      const code = payload.error?.code || response.status;
      const message = payload.error?.message || 'Plunk email send failed';
      this.logger.error(`Plunk email delivery failed [${code}]: ${message}`);
      throw new ServiceUnavailableException('Email delivery failed');
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string, firstName?: string): Promise<void> {
    const name = firstName?.trim() || 'there';

    await this.sendEmail({
      to,
      subject: 'Reset your CareBridge password',
      body: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#111827">
          <h1 style="font-size:24px;margin:0 0 16px">Reset your password</h1>
          <p>Hi ${this.escapeHtml(name)},</p>
          <p>We received a request to reset your CareBridge password. This link expires in 30 minutes.</p>
          <p>
            <a href="${this.escapeHtml(resetUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">
              Reset password
            </a>
          </p>
          <p>If the button does not work, copy and paste this URL into your browser:</p>
          <p style="word-break:break-all;color:#374151">${this.escapeHtml(resetUrl)}</p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
