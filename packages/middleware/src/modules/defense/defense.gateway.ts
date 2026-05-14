// CareBridge: Defense demo orchestration and live event streaming.
import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { IncomingMessage } from 'http';
import WebSocket from 'ws';
import { DefenseEvent } from './defense.types';

@Injectable()
@WebSocketGateway({
  path: '/ws/defense',
})
export class DefenseGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DefenseGateway.name);
  private readonly clients = new Set<WebSocket>();

  handleConnection(client: WebSocket, request: IncomingMessage) {
    const isEnabled = process.env.ENABLE_DEFENSE_DEMO_WS !== 'false';
    if (!isEnabled) {
      client.close(1008, 'Defense demo websocket disabled');
      return;
    }

    const expectedToken = process.env.DEFENSE_DEMO_TOKEN || 'carebridge-defense-demo';
    const token = this.extractToken(request);

    if (!token || token !== expectedToken) {
      client.close(1008, 'Unauthorized');
      return;
    }

    this.clients.add(client);
    this.logger.debug(`Defense dashboard connected (total=${this.clients.size})`);
  }

  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
    this.logger.debug(`Defense dashboard disconnected (total=${this.clients.size})`);
  }

  emitEvent(event: DefenseEvent) {
    if (this.clients.size === 0) return;

    const message = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
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
