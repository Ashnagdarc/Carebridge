// CareBridge: Test coverage for this module behavior.
import { NotificationsGateway } from './notifications.gateway';
import { JwtService } from '@nestjs/jwt';

function mockSocket() {
  return {
    readyState: 1,
    send: jest.fn(),
    close: jest.fn(),
  } as any;
}

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    } as any;
    gateway = new NotificationsGateway(jwtService);
    process.env.ENABLE_WEBSOCKET_NOTIFICATIONS = 'true';
    process.env.JWT_SECRET = 'test';
  });

  it('rejects connections without token', () => {
    const socket = mockSocket();
    gateway.handleConnection(socket, {
      url: '/ws/notifications',
      headers: { host: 'localhost:3000' },
    } as any);

    expect(socket.close).toHaveBeenCalled();
  });

  it('accepts patient token and sends notifications', () => {
    const socket = mockSocket();
    jwtService.verify.mockReturnValue({ patientId: 'pat_1', type: 'patient' } as any);

    gateway.handleConnection(socket, {
      url: '/ws/notifications?token=abc',
      headers: { host: 'localhost:3000' },
    } as any);

    gateway.notifyPatient('pat_1', {
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

    expect(socket.send).toHaveBeenCalledTimes(1);
  });
});

