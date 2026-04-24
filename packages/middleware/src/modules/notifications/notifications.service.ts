import { Injectable, Logger } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { CareBridgeNotificationEvent } from './notifications.types';
import { PushService } from './push.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly gateway: NotificationsGateway,
    private readonly pushService: PushService,
  ) {}

  notifyPatient(patientId: string, event: CareBridgeNotificationEvent) {
    this.gateway.notifyPatient(patientId, event);
    void this.pushService.sendToPatient(patientId, event).catch((error) => {
      this.logger.warn(
        `Push notification failed for patient ${patientId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }
}
