import type { AccountStatus, Role } from '@prisma/client';

/**
 * Event name an admin status change is emitted under. Must stay in sync with
 * `NotificationsListener`'s `@OnEvent('account.status-changed')` stub (the
 * hyphenated form, matching that existing decorator literal exactly).
 */
export const ACCOUNT_STATUS_CHANGED_EVENT = 'account.status-changed';

/**
 * Emitted after `AdminUsersService.updateStatus` commits a new `User.status`.
 * `role` is always PATIENT or DOCTOR (an admin's own status can never be
 * changed via this path), included so a notification consumer can pick the
 * right dashboard link without a further database lookup.
 */
export interface AccountStatusChangedEvent {
  userId: string;
  role: Role;
  status: AccountStatus;
  reason: string | null;
  actorId: string;
}
