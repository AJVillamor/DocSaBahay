import { z } from 'zod';

import { NotificationType } from './enums';

/** Page size for `GET /notifications`. */
export const NOTIFICATIONS_PAGE_SIZE = 10;

/** How many of the caller's latest notifications the header bell dropdown shows. */
export const NOTIFICATIONS_DROPDOWN_SIZE = 10;

/** One notification, as returned by every `/notifications*` endpoint. */
export const notificationSchema = z.object({
  id: z.uuid(),
  type: z.enum(NotificationType),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable(),
  readAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export type Notification = z.infer<typeof notificationSchema>;

/** Response body of `GET /notifications`. */
export const paginatedNotificationsSchema = z.object({
  items: z.array(notificationSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
});

export type PaginatedNotifications = z.infer<typeof paginatedNotificationsSchema>;

/** Response body of `GET /notifications/unread-count`. */
export const unreadCountSchema = z.object({
  count: z.number().int(),
});

export type UnreadCount = z.infer<typeof unreadCountSchema>;

/** Response body of `GET /realtime/token`. */
export const realtimeTokenSchema = z.object({
  token: z.string(),
  expiresInSeconds: z.number().int(),
});

export type RealtimeToken = z.infer<typeof realtimeTokenSchema>;

/**
 * Socket.io event the server pushes to room `user:{id}` whenever a new
 * notification is created for that user. The payload is only `{ id }` — per
 * this project's real-time rule, the client always refetches over REST
 * rather than trusting data pushed over the socket.
 */
export const REALTIME_NOTIFICATION_EVENT = 'notification:new';

/** Payload of {@link REALTIME_NOTIFICATION_EVENT}: a change-hint only, never the notification itself. */
export const realtimeNotificationEventSchema = z.object({
  id: z.uuid(),
});

export type RealtimeNotificationEvent = z.infer<typeof realtimeNotificationEventSchema>;
