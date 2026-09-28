/**
 * Internal event emitted by `NotificationsService.create` after a `Notification`
 * row is committed, so `NotificationsGateway` can push a change-hint over the
 * socket without being injected directly into the service.
 *
 * Using `EventEmitter2` here (rather than injecting the gateway, or its
 * `Server`, straight into `NotificationsService`) keeps the persistence layer
 * free of any knowledge of the transport layer — the service would work
 * identically with no gateway present at all (e.g. in a future worker
 * process), and the gateway can be swapped or removed without touching
 * `NotificationsService`. This mirrors the same decoupling `AppointmentsService`
 * already uses to keep booking logic free of any knowledge of this module.
 */
export const NOTIFICATION_CREATED_INTERNAL_EVENT = 'notifications.internal.created';

/** Payload of {@link NOTIFICATION_CREATED_INTERNAL_EVENT}. */
export interface NotificationCreatedInternalEvent {
  notificationId: string;
  userId: string;
}
