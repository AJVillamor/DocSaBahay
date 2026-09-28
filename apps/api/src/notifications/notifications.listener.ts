import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@prisma/client';
import { DateTime } from 'luxon';

import {
  APPOINTMENT_CANCELLED_EVENT,
  APPOINTMENT_CREATED_EVENT,
  APPOINTMENT_RESCHEDULED_EVENT,
  type AppointmentCancelledEvent,
  type AppointmentCreatedEvent,
  type AppointmentRescheduledEvent,
} from '../appointments/appointments.events';
import { NotificationsService } from './notifications.service';

const DOCTOR_APPOINTMENTS_LINK = '/doctor/appointments';
const PATIENT_APPOINTMENTS_LINK = '/patient/appointments';

/** Renders a UTC instant for notification body text (server has no notion of the reader's timezone). */
function formatUtc(iso: string): string {
  return DateTime.fromISO(iso, { zone: 'utc' }).toFormat("LLL d, yyyy 'at' h:mm a 'UTC'");
}

/**
 * Turns domain events emitted elsewhere in the app into `Notification` rows
 * for the affected users, via `NotificationsService.create`.
 *
 * Below the three wired appointment handlers are scaffolded, not-yet-wired
 * stubs for event sources this feature is designed for but that don't exist
 * in the codebase yet. Each has its own TSDoc explaining why. Keeping their
 * method shape here now means a future task only fills in a body — it never
 * has to restructure this class or guess at a payload shape from scratch.
 */
@Injectable()
export class NotificationsListener {
  constructor(private readonly notifications: NotificationsService) {}

  /** A patient booked a new appointment: tell the doctor. */
  @OnEvent(APPOINTMENT_CREATED_EVENT)
  async onAppointmentCreated(event: AppointmentCreatedEvent): Promise<void> {
    await this.notifications.create(
      event.doctorId,
      NotificationType.APPOINTMENT_BOOKED,
      'New appointment booked',
      'A patient booked a new appointment with you. Check your schedule for details.',
      DOCTOR_APPOINTMENTS_LINK,
    );
  }

  /**
   * An appointment was rescheduled: tell whichever participant did not
   * trigger it. Resolved generically off `actorId` vs `patientId`/`doctorId`
   * (see {@link otherParty}) rather than hardcoding "always the doctor" —
   * today `actorId` is always the patient (only a patient can reschedule,
   * per `AppointmentRescheduledEvent`'s own doc comment), but this keeps
   * working unchanged if a future event source ever lets a doctor reschedule.
   */
  @OnEvent(APPOINTMENT_RESCHEDULED_EVENT)
  async onAppointmentRescheduled(event: AppointmentRescheduledEvent): Promise<void> {
    const recipientId = otherParty(event.actorId, event.patientId, event.doctorId);
    const link =
      recipientId === event.doctorId ? DOCTOR_APPOINTMENTS_LINK : PATIENT_APPOINTMENTS_LINK;
    const body = `This appointment moved from ${formatUtc(event.fromStartAt)} to ${formatUtc(event.toStartAt)}.`;
    await this.notifications.create(
      recipientId,
      NotificationType.APPOINTMENT_RESCHEDULED,
      'Appointment rescheduled',
      body,
      link,
    );
  }

  /**
   * An appointment was cancelled: tell whichever participant did not cancel
   * it (relative to `cancelledById`, generically resolved the same way as
   * the reschedule handler above). When the doctor cancelled, the reason
   * (if given) is folded into the body — `reason` is nullable on the event
   * (required for a doctor cancellation at the API layer, but the type
   * itself doesn't guarantee that, so this still handles `null` defensively).
   */
  @OnEvent(APPOINTMENT_CANCELLED_EVENT)
  async onAppointmentCancelled(event: AppointmentCancelledEvent): Promise<void> {
    const recipientId = otherParty(event.cancelledById, event.patientId, event.doctorId);
    const link =
      recipientId === event.doctorId ? DOCTOR_APPOINTMENTS_LINK : PATIENT_APPOINTMENTS_LINK;
    const cancelledByDoctor = event.cancelledById === event.doctorId;
    const body = cancelledByDoctor
      ? event.reason
        ? `Your doctor cancelled this appointment: ${event.reason}`
        : 'Your doctor cancelled this appointment.'
      : 'The patient cancelled this appointment.';
    await this.notifications.create(
      recipientId,
      NotificationType.APPOINTMENT_CANCELLED,
      'Appointment cancelled',
      body,
      link,
    );
  }

  /**
   * Not wired yet. `SCHEDULE_CHANGED` is meant for a patient whose booked
   * appointment had to be cancelled because the doctor changed their
   * availability — but `feat/doctor-schedule` deliberately *rejects* an
   * availability change that would orphan a SCHEDULED appointment (409
   * `SCHEDULE_CONFLICT`; the doctor must cancel the appointment manually
   * instead, which already fires `APPOINTMENT_CANCELLED_EVENT` above). So
   * there is currently no emitter anywhere in the codebase for this event —
   * this handler is scaffolding for a future task that adds one (e.g. an
   * admin-forced override), not a real emission point invented for now.
   */
  @OnEvent('schedule.changed-cancellation')
  onScheduleChangedCancellation(_event: unknown): void {
    // Intentionally unimplemented — see the TSDoc above.
  }

  /**
   * Not wired yet. Reserved for `SESSION_UPDATE` notifications (e.g. a
   * consultation session's state changes) once a consultation-session module
   * emits a matching domain event.
   */
  @OnEvent('session.updated')
  onSessionUpdated(_event: unknown): void {
    // Intentionally unimplemented — see the TSDoc above.
  }

  /**
   * Not wired yet. Reserved for `RECORD_AVAILABLE` notifications (e.g. a
   * finalized consultation note or prescription becomes visible to the
   * patient) once a records module emits a matching domain event.
   */
  @OnEvent('record.available')
  onRecordAvailable(_event: unknown): void {
    // Intentionally unimplemented — see the TSDoc above.
  }

  /**
   * Not wired yet. Reserved for `DOCTOR_REVIEWED` notifications (e.g. an
   * admin approves or rejects a doctor's verification) once the admin
   * doctor-review module emits a matching domain event.
   */
  @OnEvent('doctor.reviewed')
  onDoctorReviewed(_event: unknown): void {
    // Intentionally unimplemented — see the TSDoc above.
  }

  /**
   * Not wired yet. Reserved for `ACCOUNT_STATUS` notifications (e.g. an
   * admin suspends or reactivates a user) once the admin user-management
   * module emits a matching domain event.
   */
  @OnEvent('account.status-changed')
  onAccountStatusChanged(_event: unknown): void {
    // Intentionally unimplemented — see the TSDoc above.
  }
}

/** The participant who is not `actorId` — the one who did not trigger the action. */
function otherParty(actorId: string, patientId: string, doctorId: string): string {
  return actorId === patientId ? doctorId : patientId;
}
