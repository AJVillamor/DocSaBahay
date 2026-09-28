import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AccountStatus,
  NotificationType,
  Role,
  SessionState,
  VerificationStatus,
} from '@prisma/client';
import { DateTime } from 'luxon';

import {
  APPOINTMENT_CANCELLED_EVENT,
  APPOINTMENT_CREATED_EVENT,
  APPOINTMENT_RESCHEDULED_EVENT,
  type AppointmentCancelledEvent,
  type AppointmentCreatedEvent,
  type AppointmentRescheduledEvent,
} from '../appointments/appointments.events';
import {
  DOCTOR_REVIEWED_EVENT,
  type DoctorReviewedEvent,
} from '../admin/doctors/admin-doctors.events';
import {
  ACCOUNT_STATUS_CHANGED_EVENT,
  type AccountStatusChangedEvent,
} from '../admin/users/admin-users.events';
import {
  CONSULTATION_STATE_CHANGED_EVENT,
  type ConsultationStateChangedEvent,
} from '../consultations/consultations.events';
import { RECORD_AVAILABLE_EVENT, type RecordAvailableEvent } from '../records/records.events';
import { NotificationsService } from './notifications.service';

const DOCTOR_APPOINTMENTS_LINK = '/doctor/appointments';
const PATIENT_APPOINTMENTS_LINK = '/patient/appointments';
const PATIENT_RECORDS_LINK = '/patient/records';
const DOCTOR_PROFILE_LINK = '/doctor/profile';
const DOCTOR_DASHBOARD_LINK = '/doctor';
const PATIENT_DASHBOARD_LINK = '/patient';

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
   * A consultation session's state changed. Only notifies on a transition
   * into `IN_PROGRESS` (the doctor started it) or `COMPLETED` (the doctor
   * ended it) — never `JOINED`, which fires on every participant join and
   * would be too noisy. The recipient is always the other participant
   * (relative to `actorId`, resolved the same way as the appointment
   * handlers above), and the link goes straight to the shared, non-role-
   * prefixed consultation workspace route rather than the appointments list.
   */
  @OnEvent(CONSULTATION_STATE_CHANGED_EVENT)
  async onSessionUpdated(event: ConsultationStateChangedEvent): Promise<void> {
    if (event.state !== SessionState.IN_PROGRESS && event.state !== SessionState.COMPLETED) {
      return;
    }
    const recipientId = otherParty(event.actorId, event.patientId, event.doctorId);
    const link = `/consultations/${event.appointmentId}`;
    const title = event.state === SessionState.IN_PROGRESS ? 'Consultation started' : 'Consultation completed';
    const body =
      event.state === SessionState.IN_PROGRESS
        ? 'Your consultation has started.'
        : 'Your consultation has ended.';
    await this.notifications.create(recipientId, NotificationType.SESSION_UPDATE, title, body, link);
  }

  /**
   * A consultation note was finalized or a prescription was issued: tell the
   * patient it's now visible in their records, linking straight there.
   */
  @OnEvent(RECORD_AVAILABLE_EVENT)
  async onRecordAvailable(event: RecordAvailableEvent): Promise<void> {
    const title = event.kind === 'note' ? 'New consultation note available' : 'New prescription available';
    const body =
      event.kind === 'note'
        ? 'Your doctor finalized a consultation note. View it in your records.'
        : 'Your doctor issued a new prescription. View it in your records.';
    await this.notifications.create(
      event.patientId,
      NotificationType.RECORD_AVAILABLE,
      title,
      body,
      PATIENT_RECORDS_LINK,
    );
  }

  /** An admin approved or rejected a doctor's profile: tell the doctor. */
  @OnEvent(DOCTOR_REVIEWED_EVENT)
  async onDoctorReviewed(event: DoctorReviewedEvent): Promise<void> {
    const approved = event.decision === VerificationStatus.APPROVED;
    const title = approved ? 'Profile approved' : 'Profile not approved';
    const body = approved
      ? 'Your doctor profile has been approved. Patients can now find and book you.'
      : `Your doctor profile was not approved.${event.note ? ` ${event.note}` : ''}`;
    await this.notifications.create(
      event.doctorId,
      NotificationType.DOCTOR_REVIEWED,
      title,
      body,
      DOCTOR_PROFILE_LINK,
    );
  }

  /**
   * An admin changed a user's account status: tell that user. This is the
   * only way a SUSPENDED/DEACTIVATED user ever learns why — every
   * authenticated route (including this one, indirectly, via `GET
   * /notifications`) rejects a non-ACTIVE account, so in practice the
   * suspend/deactivate notification and the later reactivate notification
   * are both waiting for them the next time they can sign in at all.
   */
  @OnEvent(ACCOUNT_STATUS_CHANGED_EVENT)
  async onAccountStatusChanged(event: AccountStatusChangedEvent): Promise<void> {
    const link = event.role === Role.DOCTOR ? DOCTOR_DASHBOARD_LINK : PATIENT_DASHBOARD_LINK;
    const reactivated = event.status === AccountStatus.ACTIVE;
    const title = reactivated ? 'Account reactivated' : `Account ${event.status.toLowerCase()}`;
    const body = reactivated
      ? 'Your account has been reactivated. You can sign in and use DokSaBahay again.'
      : `Your account has been ${event.status.toLowerCase()}.${event.reason ? ` Reason: ${event.reason}` : ''}`;
    await this.notifications.create(event.userId, NotificationType.ACCOUNT_STATUS, title, body, link);
  }
}

/** The participant who is not `actorId` — the one who did not trigger the action. */
function otherParty(actorId: string, patientId: string, doctorId: string): string {
  return actorId === patientId ? doctorId : patientId;
}
