// CareBridge: Test coverage for this module behavior.
import { ServiceUnavailableException } from '@nestjs/common';
import { EmailService } from './email.service';

describe('EmailService', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, PLUNK_SECRET_KEY: 'sk_test', PLUNK_API_URL: 'https://plunk.test' };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('sends transactional email through Plunk', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const service = new EmailService();
    await service.sendEmail({
      to: 'patient@example.com',
      subject: 'Hello',
      body: '<p>Hello</p>',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://plunk.test/v1/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          to: 'patient@example.com',
          subject: 'Hello',
          body: '<p>Hello</p>',
        }),
      }),
    );
  });

  it('throws when Plunk returns an error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Bad key' },
      }),
    });

    const service = new EmailService();

    await expect(
      service.sendEmail({
        to: 'patient@example.com',
        subject: 'Hello',
        body: '<p>Hello</p>',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
