import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@src/common/prisma/prisma.service';
import * as webpush from 'web-push';
import { CareBridgeNotificationEvent } from './notifications.types';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private vapidConfigured = false;

  constructor(private readonly prisma: PrismaService) {}

  async upsertSubscription(params: {
    patientId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string | null;
  }) {
    const record = await this.prisma.pushSubscription.upsert({
      where: {
        patientId_endpoint: {
          patientId: params.patientId,
          endpoint: params.endpoint,
        },
      },
      create: {
        patientId: params.patientId,
        endpoint: params.endpoint,
        p256dh: params.p256dh,
        auth: params.auth,
        userAgent: params.userAgent || null,
      },
      update: {
        p256dh: params.p256dh,
        auth: params.auth,
        userAgent: params.userAgent || null,
      },
    });

    return record;
  }

  async removeSubscription(patientId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { patientId, endpoint },
    });
  }

  async sendToPatient(patientId: string, event: CareBridgeNotificationEvent) {
    const isEnabled = process.env.ENABLE_PUSH_NOTIFICATIONS === 'true';
    if (!isEnabled) return;

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@carebridge.local';

    if (!vapidPublicKey || !vapidPrivateKey) {
      this.logger.debug('Push disabled: missing VAPID keys');
      return;
    }

    if (!this.vapidConfigured) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      this.vapidConfigured = true;
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { patientId },
    });

    if (subscriptions.length === 0) return;

    const payload = JSON.stringify(event);
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload,
          );
        } catch (err: any) {
          const statusCode = err?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.removeSubscription(patientId, sub.endpoint);
            return;
          }
          this.logger.warn(
            `Push send failed for patient ${patientId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }),
    );
  }
}

