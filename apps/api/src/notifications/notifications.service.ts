import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATIONS_PAGE_SIZE } from '@doksabahay/shared';
import { Notification, NotificationType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { NotificationListQueryDto } from './dto/notification-query.dto';
import type {
  NotificationResponseDto,
  PaginatedNotificationsDto,
} from './dto/notification-response.dto';
import { NotificationNotFoundException } from './notifications.exceptions';
import {
  NOTIFICATION_CREATED_INTERNAL_EVENT,
  type NotificationCreatedInternalEvent,
} from './notifications-internal.events';

function toNotificationResponse(row: Notification): NotificationResponseDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Creates and reads in-app `Notification` rows. This is the only module that
 * writes to the `Notification` table — `NotificationsListener` and
 * `ReminderJob` both funnel through {@link NotificationsService.create}, so
 * dedup and the real-time hint are always applied consistently.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Inserts a `Notification` for `userId` and emits an internal event so
   * `NotificationsGateway` can push a `notification:new` change-hint to that
   * user's socket room.
   *
   * When `dedupeKey` is given and a `Notification` with that key already
   * exists (the DB's unique constraint on `dedupeKey` fires, Prisma error
   * `P2002`), this is a silent no-op — a duplicate notification attempt is
   * expected and benign (e.g. the reminder cron's window overlapping a
   * previous tick), so it is not surfaced as an error, mirroring how
   * `AuthService` maps a duplicate email to a thrown domain exception except
   * here the caller does not want an exception at all.
   */
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    link?: string | null,
    dedupeKey?: string | null,
  ): Promise<void> {
    let notification: Notification;
    try {
      notification = await this.prisma.notification.create({
        data: { userId, type, title, body, link: link ?? null, dedupeKey: dedupeKey ?? null },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return;
      }
      throw error;
    }

    this.events.emit(NOTIFICATION_CREATED_INTERNAL_EVENT, {
      notificationId: notification.id,
      userId,
    } satisfies NotificationCreatedInternalEvent);
  }

  /** Lists the caller's own notifications, newest first. */
  async list(userId: string, query: NotificationListQueryDto): Promise<PaginatedNotificationsDto> {
    const page = query.page ?? 1;
    const pageSize = NOTIFICATIONS_PAGE_SIZE;
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [items, totalCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items: items.map(toNotificationResponse), page, pageSize, totalCount };
  }

  /** Count of the caller's unread notifications, for the header bell badge. */
  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  /**
   * Marks one notification read.
   *
   * @throws NotificationNotFoundException (404, never 403) if `id` does not exist or does not
   *   belong to `userId` — see the class-level note on `NotificationNotFoundException`.
   */
  async markRead(userId: string, id: string): Promise<NotificationResponseDto> {
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotificationNotFoundException();
    }
    const updated =
      existing.readAt === null
        ? await this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } })
        : existing;
    return toNotificationResponse(updated);
  }

  /** Marks every one of the caller's unread notifications read. */
  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
