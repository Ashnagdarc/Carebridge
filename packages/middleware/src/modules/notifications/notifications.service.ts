import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { CareBridgeNotificationEvent } from './notifications.types';
import { PushService } from './push.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly gateway: NotificationsGateway,
    private readonly pushService: PushService,
  ) {}

  notifyPatient(patientId: string, event: CareBridgeNotificationEvent) {
    this.gateway.notifyPatient(patientId, event);
    void this.pushService.sendToPatient(patientId, event);
  }
}
