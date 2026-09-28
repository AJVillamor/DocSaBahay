/**
 * Domain events emitted by `AppointmentsService` via `EventEmitter2`. A later,
 * separate notifications module listens for these (`@OnEvent(...)`) to notify
 * the other party — this module does not build any notification-consuming
 * logic itself, only emits these clean, typed payloads.
 *
 * Every payload includes `patientId`/`doctorId` (both participants) and
 * `actorId` (who performed the action) so a listener can decide who to notify
 * and how to phrase it without a further database lookup for the basics.
 */

/** Event name for {@link AppointmentCreatedEvent}. */
export const APPOINTMENT_CREATED_EVENT = 'appointment.created';

/** Event name for {@link AppointmentRescheduledEvent}. */
export const APPOINTMENT_RESCHEDULED_EVENT = 'appointment.rescheduled';

/** Event name for {@link AppointmentCancelledEvent}. */
export const APPOINTMENT_CANCELLED_EVENT = 'appointment.cancelled';

/**
 * Emitted after a new `Appointment` (status `SCHEDULED`) has been committed
 * by `AppointmentsService.create`. `actorId` is always the patient — only a
 * patient can book.
 */
export interface AppointmentCreatedEvent {
  appointmentId: string;
  actorId: string;
  patientId: string;
  doctorId: string;
}

/**
 * Emitted after `AppointmentsService.reschedule` commits a new `startAt`/`endAt`
 * for a still-`SCHEDULED` appointment. `actorId` is always the patient — only
 * the patient owner may reschedule. `fromStartAt`/`toStartAt` are ISO UTC
 * instants so a notification consumer can phrase "moved from X to Y" without
 * re-fetching the appointment.
 */
export interface AppointmentRescheduledEvent {
  appointmentId: string;
  actorId: string;
  patientId: string;
  doctorId: string;
  fromStartAt: string;
  toStartAt: string;
}

/**
 * Emitted after `AppointmentsService.cancel` commits status `CANCELLED`.
 * `actorId` and `cancelledById` are always the same value (whoever cancelled,
 * patient or doctor) — `cancelledById` is included alongside `actorId` so a
 * consumer does not need to know which of the two conventions to read.
 * `reason` is the cancellation reason, if any (required when the doctor
 * cancelled, optional when the patient did — see `AppointmentsService.cancel`).
 */
export interface AppointmentCancelledEvent {
  appointmentId: string;
  actorId: string;
  patientId: string;
  doctorId: string;
  cancelledById: string;
  reason: string | null;
}
