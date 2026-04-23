import { Test, TestingModule } from '@nestjs/testing';
import { PushService } from './push.service';
import { PrismaService } from '@src/common/prisma/prisma.service';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

const webpush = jest.requireMock('web-push');

describe('PushService', () => {
  let service: PushService;
  let prisma: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.ENABLE_PUSH_NOTIFICATIONS = 'true';
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
    process.env.VAPID_SUBJECT = 'mailto:test@example.com';

    prisma = {
      pushSubscription: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PushService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PushService);
  });

  it('sends push notifications for patient subscriptions when push is enabled', async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([
      {
        endpoint: 'https://push-service.example.com/endpoint',
        p256dh: 'p256dh-key',
        auth: 'auth-key',
      },
    ]);
    (webpush.sendNotification as jest.Mock).mockResolvedValue(undefined);

    await service.sendToPatient('pat_1', {
      type: 'consent_request_created',
      data: {
        consentRequestId: 'cr_1',
        patientId: 'pat_1',
        hospital: { id: 'h_1', name: 'Hospital A' },
        scopes: ['allergies'],
        clinicalReason: 'Checkup',
        createdAt: new Date().toISOString(),
      },
    });

    expect(webpush.setVapidDetails).toHaveBeenCalledWith(
      'mailto:test@example.com',
      'test-public-key',
      'test-private-key',
    );
    expect(prisma.pushSubscription.findMany).toHaveBeenCalledWith({ where: { patientId: 'pat_1' } });
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      {
        endpoint: 'https://push-service.example.com/endpoint',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      },
      expect.any(String),
    );
  });

  it('removes stale subscriptions when push returns 404 or 410', async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([
      {
        endpoint: 'https://push-service.example.com/expired',
        p256dh: 'p256dh-key',
        auth: 'auth-key',
      },
    ]);
    const error = new Error('Gone') as any;
    error.statusCode = 410;
    (webpush.sendNotification as jest.Mock).mockRejectedValue(error);

    await service.sendToPatient('pat_1', {
      type: 'consent_request_created',
      data: {
        consentRequestId: 'cr_2',
        patientId: 'pat_1',
        hospital: { id: 'h_1', name: 'Hospital A' },
        scopes: ['medications'],
        clinicalReason: 'Refill',
        createdAt: new Date().toISOString(),
      },
    });

    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: {
        patientId: 'pat_1',
        endpoint: 'https://push-service.example.com/expired',
      },
    });
  });
});
