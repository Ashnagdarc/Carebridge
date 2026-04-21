import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { IncomingMessage } from 'http';
import WebSocket from 'ws';
import { CareBridgeNotificationEvent } from './notifications.types';

type AuthedSocket = WebSocket & { patientId?: string };

@Injectable()
@WebSocketGateway({
  path: '/ws/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly clientsByPatientId = new Map<string, Set<AuthedSocket>>();

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: AuthedSocket, request: IncomingMessage) {
    try {
      const isEnabled = process.env.ENABLE_WEBSOCKET_NOTIFICATIONS !== 'false';
      if (!isEnabled) {
        client.close(1008, 'Notifications disabled');
        return;
      }

      const token = this.extractToken(request);
      if (!token) {
        client.close(1008, 'Missing token');
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'dev_jwt_secret_key',
      }) as { patientId?: string; type?: string };

      if (!payload?.patientId || payload.type !== 'patient') {
        client.close(1008, 'Unauthorized');
        return;
      }

      client.patientId = payload.patientId;
      const existing = this.clientsByPatientId.get(payload.patientId);
      if (existing) {
        existing.add(client);
      } else {
        this.clientsByPatientId.set(payload.patientId, new Set([client]));
      }

      this.logger.debug(
        `Client connected for patient ${payload.patientId} (total=${this.clientsByPatientId.get(payload.patientId)?.size ?? 0})`,
      );
    } catch (err) {
      this.logger.warn(
        `WebSocket connection rejected: ${err instanceof Error ? err.message : String(err)}`,
      );
      client.close(1011, 'Server error');
    }
  }

  handleDisconnect(client: AuthedSocket) {
    const patientId = client.patientId;
    if (!patientId) return;

    const set = this.clientsByPatientId.get(patientId);
    if (!set) return;

    set.delete(client);
    if (set.size === 0) {
      this.clientsByPatientId.delete(patientId);
    }

    this.logger.debug(`Client disconnected for patient ${patientId}`);
  }

  notifyPatient(patientId: string, event: CareBridgeNotificationEvent) {
    const set = this.clientsByPatientId.get(patientId);
    if (!set || set.size === 0) return;

    const message = JSON.stringify(event);
    for (const client of set) {
      if (client.readyState !== WebSocket.OPEN) continue;
      client.send(message);
    }
  }

  private extractToken(request: IncomingMessage): string | null {
    const url = request.url || '';
    const host = request.headers.host || 'localhost';
    const full = url.startsWith('http') ? url : `http://${host}${url}`;

    try {
      const parsed = new URL(full);
      return parsed.searchParams.get('token');
    } catch {
      return null;
    }
  }
}

