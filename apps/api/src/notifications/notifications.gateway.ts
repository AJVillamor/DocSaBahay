import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { REALTIME_NOTIFICATION_EVENT, type RealtimeNotificationEvent } from '@doksabahay/shared';
import type { Server, Socket } from 'socket.io';

import {
  NOTIFICATION_CREATED_INTERNAL_EVENT,
  type NotificationCreatedInternalEvent,
} from './notifications-internal.events';
import type { RealtimeTokenPayload } from './realtime-token.service';

/** Socket.io room a user's connections join, so a hint can target just them. */
function userRoom(userId: string): string {
  return `user:${userId}`;
}

/**
 * Change-hint-only WebSocket gateway (per this project's real-time rule): it
 * never pushes notification content, only `{ id }`, so the client always
 * refetches the real data over REST.
 *
 * Authentication is a short-lived token from `GET /realtime/token` (see
 * `RealtimeTokenController`), sent as `{ auth: { token } }` in the socket
 * handshake — not the httpOnly access-token cookie, since the browser's
 * `WebSocket`/socket.io transport for this stack does not attach cookies to
 * the same-origin `/api/*` rewrite the way `fetch` does, and a dedicated
 * token keeps the gateway from needing cookie-parsing middleware of its own.
 *
 * CORS mirrors `configureApp`'s HTTP CORS (`WEB_ORIGIN`); read directly from
 * `process.env` because `@WebSocketGateway`'s options are evaluated at class
 * definition time, before Nest's `ConfigModule` (and its DI-injectable
 * `ConfigService`) exist to ask.
 */
@WebSocketGateway({ cors: { origin: process.env.WEB_ORIGIN ?? true } })
export class NotificationsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(private readonly jwt: JwtService) {}

  /** Verifies the handshake token and joins the socket to its owner's room, or disconnects it. */
  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    const payload = token ? await this.verify(token) : null;
    if (!payload) {
      client.disconnect(true);
      return;
    }
    await client.join(userRoom(payload.sub));
  }

  /**
   * The client should reconnect with a fresh token well before its 60-second
   * token expires (see the web socket client), but if an already-connected
   * socket's token does expire, the client can call this to re-prove its
   * identity and re-join its room without a full reconnect.
   */
  @SubscribeMessage('reauth')
  async handleReauth(
    @ConnectedSocket() client: Socket,
    @MessageBody() token: string,
  ): Promise<{ ok: boolean }> {
    const payload = await this.verify(token);
    if (!payload) {
      return { ok: false };
    }
    await client.join(userRoom(payload.sub));
    return { ok: true };
  }

  /**
   * Listens for `NotificationsService.create`'s internal event (see that
   * file's module-level doc comment for why this is event-based rather than
   * the gateway being injected directly into the service) and forwards it as
   * a `notification:new` change-hint to the recipient's room.
   */
  @OnEvent(NOTIFICATION_CREATED_INTERNAL_EVENT)
  onNotificationCreated(event: NotificationCreatedInternalEvent): void {
    this.server.to(userRoom(event.userId)).emit(REALTIME_NOTIFICATION_EVENT, {
      id: event.notificationId,
    } satisfies RealtimeNotificationEvent);
  }

  private extractToken(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.token as unknown;
    if (typeof fromAuth === 'string' && fromAuth.length > 0) {
      return fromAuth;
    }
    const fromQuery = client.handshake.query?.token;
    return typeof fromQuery === 'string' && fromQuery.length > 0 ? fromQuery : null;
  }

  private async verify(token: string): Promise<RealtimeTokenPayload | null> {
    try {
      const payload = await this.jwt.verifyAsync<RealtimeTokenPayload>(token);
      return typeof payload.sub === 'string' ? payload : null;
    } catch (error) {
      this.logger.debug(
        `Rejected realtime token: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}
