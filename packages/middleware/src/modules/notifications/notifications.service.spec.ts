import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { PushService } from './push.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const gateway = { notifyPatient: jest.fn() };
  const pushService = { sendToPatient: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationsGateway, useValue: gateway },
        { provide: PushService, useValue: pushService },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('notifies websocket clients and triggers push delivery', async () => {
    service.notifyPatient('patient_1', {
      type: 'consent_request_created',
      data: {
        consentRequestId: 'cr_1',
        patientId: 'patient_1',
        hospital: { id: 'h_1', name: 'Hospital A' },
        scopes: ['allergies'],
        clinicalReason: 'Checkup',
        createdAt: new Date().toISOString(),
      },
    });

    expect(gateway.notifyPatient).toHaveBeenCalledTimes(1);
    expect(pushService.sendToPatient).toHaveBeenCalledTimes(1);
  });
});

