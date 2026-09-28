import type { SessionState } from '@prisma/client';

/**
 * Domain event emitted by `ConsultationsService` via `EventEmitter2` on every
 * actual `SessionState` transition (never on an idempotent repeat, which is a
 * no-op). Two independent listeners consume it: `NotificationsGateway`
 * broadcasts it to socket room `consultation:{appointmentId}` as
 * `CONSULTATION_STATE_EVENT`, and `NotificationsListener` turns a transition
 * into `IN_PROGRESS` or `COMPLETED` into a `SESSION_UPDATE` notification for
 * the other participant (not `JOINED` — too noisy, see that listener).
 */
export const CONSULTATION_STATE_CHANGED_EVENT = 'consultation.state_changed';

/** Payload of {@link CONSULTATION_STATE_CHANGED_EVENT}. */
export interface ConsultationStateChangedEvent {
  appointmentId: string;
  sessionId: string;
  /** Who triggered the transition (the patient or doctor who called join/start/complete). */
  actorId: string;
  patientId: string;
  doctorId: string;
  previousState: SessionState;
  state: SessionState;
  patientJoinedAt: string | null;
  doctorJoinedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
}
