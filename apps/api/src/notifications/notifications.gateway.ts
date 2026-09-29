import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  CONSULTATION_MESSAGE_EVENT,
  CONSULTATION_PRESENCE_EVENT,
  CONSULTATION_STATE_EVENT,
  REALTIME_NOTIFICATION_EVENT,
  type ConsultationPresenceEvent,
  type RealtimeNotificationEvent,
} from '@doksabahay/shared';
import type { SessionState } from '@prisma/client';
import type { Server, Socket } from 'socket.io';

import {
  CONSULTATION_MESSAGE_SENT_EVENT,
  CONSULTATION_STATE_CHANGED_EVENT,
  type ConsultationMessageSentEvent,
  type ConsultationStateChangedEvent,
} from '../consultations/consultations.events';
import { PrismaService } from '../prisma/prisma.service';
import {
  NOTIFICATION_CREATED_INTERNAL_EVENT,
  type NotificationCreatedInternalEvent,
} from './notifications-internal.events';
import type { RealtimeTokenPayload } from './realtime-token.service';

/** Socket.io room a user's connections join, so a hint can target just them. */
function userRoom(userId: string): string {
  return `user:${userId}`;
}

/** Socket.io room every socket authenticated for one appointment's consultation joins. */
function consultationRoom(appointmentId: string): string {
  return `consultation:${appointmentId}`;
}

/** Per-socket state this gateway tracks beyond what `socket.io` gives it. */
interface SocketData {
  userId: string;
  /** Appointment ids of every consultation room this socket has joined, for presence on disconnect. */
  consultationRooms: Set<string>;
}

/**
 * Payload of `CONSULTATION_STATE_EVENT`. Structurally identical to
 * `@doksabahay/shared`'s `consultationStateEventSchema` (parsed by the web
 * client), but typed against `@prisma/client`'s `SessionState` rather than
 * the shared package's — the same enum-typing split `ConsultationResponseDto`
 * uses on the REST side, since a Prisma enum value can't be assigned to the
 * shared package's structurally-identical-but-nominally-distinct `enum` type.
 */
interface ConsultationStatePayload {
  appointmentId: string;
  state: SessionState;
  patientJoinedAt: string | null;
  doctorJoinedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
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
 *
 * Also owns a second room concept, `consultation:{appointmentId}` (see
 * {@link consultationRoom}), joined via the `consultation:join` message once
 * a socket is already authenticated. Unlike the `user:{id}` room, richer
 * payloads are pushed to it — `CONSULTATION_STATE_EVENT` carries a full
 * session-state snapshot and `CONSULTATION_PRESENCE_EVENT` carries live
 * connect/disconnect presence — because this is a live status board for one
 * consultation, not a generic notification hint clients must always refetch
 * to trust.
 */
@WebSocketGateway({ cors: { origin: process.env.WEB_ORIGIN ?? true } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /** Verifies the handshake token and joins the socket to its owner's room, or disconnects it. */
  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    const payload = token ? await this.verify(token) : null;
    if (!payload) {
      client.disconnect(true);
      return;
    }
    this.data(client).userId = payload.sub;
    await client.join(userRoom(payload.sub));
  }

  /**
   * Broadcasts `offline` presence to every consultation room this socket had
   * joined, so the other participant's presence dot updates even on an
   * unclean disconnect (network drop, tab close) and not just an explicit leave.
   */
  handleDisconnect(client: Socket): void {
    const data = this.data(client);
    if (!data.userId) {
      return;
    }
    for (const appointmentId of data.consultationRooms) {
      this.broadcastPresence(appointmentId, data.userId, false);
    }
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
    this.data(client).userId = payload.sub;
    await client.join(userRoom(payload.sub));
    return { ok: true };
  }

  /**
   * Joins the socket to `consultation:{appointmentId}`'s room, after
   * verifying the already-authenticated caller (from `handleConnection`) is
   * one of the appointment's two participants — the same
   * "load appointment, check caller is patientId or doctorId" check
   * `AppointmentsService`/`ConsultationsService` use, just re-expressed for a
   * socket instead of an HTTP request. Broadcasts `online` presence to the
   * room on success, and also returns every already-online participant's
   * user id in the ack — otherwise the second participant to join would
   * never learn the first is already present, since a presence broadcast
   * only reaches sockets already in the room at the time it fires.
   */
  @SubscribeMessage('consultation:join')
  async handleConsultationJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() appointmentId: string,
  ): Promise<{ ok: boolean; onlineUserIds?: string[] }> {
    const data = this.data(client);
    if (!data.userId || typeof appointmentId !== 'string') {
      return { ok: false };
    }
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { patientId: true, doctorId: true },
    });
    const isParticipant =
      !!appointment && (appointment.patientId === data.userId || appointment.doctorId === data.userId);
    if (!isParticipant) {
      return { ok: false };
    }

    const room = consultationRoom(appointmentId);
    const onlineUserIds = this.onlineUserIdsInRoom(room);
    await client.join(room);
    data.consultationRooms.add(appointmentId);
    this.broadcastPresence(appointmentId, data.userId, true);
    return { ok: true, onlineUserIds: [...onlineUserIds, data.userId] };
  }

  /** User ids of every socket currently in `room`, deduped (a user may have more than one tab open). */
  private onlineUserIdsInRoom(room: string): Set<string> {
    const socketIds = this.server.sockets.adapter.rooms.get(room);
    const userIds = new Set<string>();
    if (!socketIds) {
      return userIds;
    }
    for (const socketId of socketIds) {
      const userId = (this.server.sockets.sockets.get(socketId)?.data as Partial<SocketData> | undefined)
        ?.userId;
      if (userId) {
        userIds.add(userId);
      }
    }
    return userIds;
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

  /**
   * Listens for `ConsultationsService`'s domain event (see
   * `consultations.events.ts`) and broadcasts the new state to the
   * consultation's room. Fires on every actual `SessionState` transition
   * only — `ConsultationsService` never emits it for an idempotent repeat.
   */
  @OnEvent(CONSULTATION_STATE_CHANGED_EVENT)
  onConsultationStateChanged(event: ConsultationStateChangedEvent): void {
    this.server.to(consultationRoom(event.appointmentId)).emit(CONSULTATION_STATE_EVENT, {
      appointmentId: event.appointmentId,
      state: event.state,
      patientJoinedAt: event.patientJoinedAt,
      doctorJoinedAt: event.doctorJoinedAt,
      startedAt: event.startedAt,
      endedAt: event.endedAt,
    } satisfies ConsultationStatePayload);
  }

  /**
   * Listens for `ConsultationMessagesService.send`'s domain event and
   * broadcasts the new message to the consultation's room. Like
   * `onConsultationStateChanged`, this pushes the full message directly
   * (see `CONSULTATION_MESSAGE_EVENT`'s doc comment for why) — the message
   * was already persisted by `send` before this fires, so the broadcast is
   * only ever an ephemeral, real-time echo of durably-saved data.
   */
  @OnEvent(CONSULTATION_MESSAGE_SENT_EVENT)
  onConsultationMessageSent(event: ConsultationMessageSentEvent): void {
    this.server.to(consultationRoom(event.appointmentId)).emit(CONSULTATION_MESSAGE_EVENT, {
      appointmentId: event.appointmentId,
      message: event.message,
    });
  }

  private broadcastPresence(appointmentId: string, userId: string, online: boolean): void {
    this.server.to(consultationRoom(appointmentId)).emit(CONSULTATION_PRESENCE_EVENT, {
      appointmentId,
      userId,
      online,
    } satisfies ConsultationPresenceEvent);
  }

  /** Typed accessor for the per-socket state `socket.io`'s own typing leaves as `any`. */
  private data(client: Socket): SocketData {
    const data = client.data as Partial<SocketData>;
    data.consultationRooms ??= new Set<string>();
    return data as SocketData;
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
