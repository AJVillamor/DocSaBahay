import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CONSULTATION_NO_SHOW_GRACE_MINUTES,
  isWithinJoinWindow,
  type ConsultationPatientSummary,
} from '@doksabahay/shared';
import {
  AppointmentEventType,
  AppointmentStatus,
  ConsultationSession as ConsultationSessionRow,
  Prisma,
  Role,
  SessionState,
} from '@prisma/client';
import { DateTime } from 'luxon';

import { AppointmentsService } from '../appointments/appointments.service';
import { AppointmentNotFoundException } from '../appointments/appointments.exceptions';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  CONSULTATION_STATE_CHANGED_EVENT,
  type ConsultationStateChangedEvent,
} from './consultations.events';
import {
  ConsultationUnavailableException,
  InvalidTransitionException,
  OutsideJoinWindowException,
} from './consultations.exceptions';
import type { ConsultationResponseDto } from './dto/consultation-response.dto';

/** Everything a response needs about the appointment's two participants and its session. */
const CONSULTATION_INCLUDE = {
  session: true,
  patient: {
    select: {
      id: true,
      patientProfile: {
        select: {
          firstName: true,
          lastName: true,
          birthDate: true,
          weightKg: true,
          heightCm: true,
          allergies: true,
          chronicConditions: true,
          currentMedications: true,
        },
      },
    },
  },
  doctor: {
    select: {
      id: true,
      doctorProfile: { select: { firstName: true, lastName: true, title: true } },
      doctorSpecializations: {
        select: { specialization: { select: { name: true } } },
      },
    },
  },
} satisfies Prisma.AppointmentInclude;

type ConsultationRow = Prisma.AppointmentGetPayload<{ include: typeof CONSULTATION_INCLUDE }>;

/**
 * Owns the `ConsultationSession` state machine
 * (`SCHEDULED → JOINED → IN_PROGRESS → COMPLETED`) and the read model built
 * from it. Every appointment already has a `ConsultationSession` row (created
 * alongside it by `AppointmentsService.create`), so this never creates one —
 * only reads and advances it.
 *
 * Reuses `AppointmentsService.cancelForNoShow` for the no-show flow instead
 * of writing a second cancellation path, and emits
 * `CONSULTATION_STATE_CHANGED_EVENT` (see `consultations.events.ts`) on every
 * actual transition for `NotificationsGateway`/`NotificationsListener` to
 * consume.
 */
@Injectable()
export class ConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentsService,
    private readonly events: EventEmitter2,
  ) {}

  /** Fetches the consultation workspace state. Only the appointment's two participants may see it. */
  async getOne(caller: AuthUser, appointmentId: string): Promise<ConsultationResponseDto> {
    const row = await this.loadParticipantRow(caller, appointmentId);
    return this.toResponse(row, caller);
  }

  /**
   * First participant to call this moves the session `SCHEDULED → JOINED`;
   * either participant calling again (or the second participant joining
   * while already `JOINED`) just records their own `*JoinedAt` timestamp,
   * with no further state change — idempotent, always a success.
   *
   * @throws AppointmentNotFoundException (404) for an unknown appointment or a non-participant.
   * @throws ConsultationUnavailableException if the appointment is not `SCHEDULED`.
   * @throws OutsideJoinWindowException outside `startAt - 10min` to `endAt + 30min`.
   * @throws InvalidTransitionException if the session already `COMPLETED`.
   */
  async join(caller: AuthUser, appointmentId: string): Promise<ConsultationResponseDto> {
    const row = await this.loadParticipantRow(caller, appointmentId);
    this.assertConsultable(row);
    if (!isWithinJoinWindow(row.startAt, row.endAt)) {
      throw new OutsideJoinWindowException();
    }
    const session = this.requireSession(row);
    if (session.state === SessionState.COMPLETED) {
      throw new InvalidTransitionException('This consultation has already ended.');
    }

    const isPatient = caller.role === Role.PATIENT;
    const alreadyJoined = isPatient ? session.patientJoinedAt !== null : session.doctorJoinedAt !== null;
    if (alreadyJoined) {
      return this.toResponse(row, caller);
    }

    const now = new Date();
    const previousState = session.state;
    const nextState = previousState === SessionState.SCHEDULED ? SessionState.JOINED : previousState;
    const updated = await this.prisma.consultationSession.update({
      where: { appointmentId },
      data: {
        state: nextState,
        ...(isPatient ? { patientJoinedAt: now } : { doctorJoinedAt: now }),
      },
    });

    if (updated.state !== previousState) {
      this.emitStateChanged(row, caller.id, previousState, updated);
    }
    return this.toResponse({ ...row, session: updated }, caller);
  }

  /**
   * The doctor starts the consultation, moving `JOINED → IN_PROGRESS`. Per
   * this repo's spec, requires both `patientJoinedAt` and `doctorJoinedAt`
   * already set. Calling again while already `IN_PROGRESS` is a no-op success.
   *
   * @throws AppointmentNotFoundException (404) for an unknown appointment or a non-participant.
   * @throws ConsultationUnavailableException if the appointment is not `SCHEDULED`.
   * @throws InvalidTransitionException if the session isn't `JOINED` with both participants joined.
   */
  async start(caller: AuthUser, appointmentId: string): Promise<ConsultationResponseDto> {
    const row = await this.loadParticipantRow(caller, appointmentId);
    this.assertConsultable(row);
    const session = this.requireSession(row);

    if (session.state === SessionState.IN_PROGRESS) {
      return this.toResponse(row, caller);
    }
    if (session.state !== SessionState.JOINED || !session.patientJoinedAt || !session.doctorJoinedAt) {
      throw new InvalidTransitionException(
        'Both the patient and the doctor must join before the consultation can start.',
      );
    }

    const previousState = session.state;
    const updated = await this.prisma.consultationSession.update({
      where: { appointmentId },
      data: { state: SessionState.IN_PROGRESS, startedAt: new Date() },
    });
    this.emitStateChanged(row, caller.id, previousState, updated);
    return this.toResponse({ ...row, session: updated }, caller);
  }

  /**
   * The doctor ends the consultation, moving `IN_PROGRESS → COMPLETED`. In
   * the same transaction, sets `Appointment.status = COMPLETED` and appends
   * an `AppointmentEvent` (type `COMPLETED`) — mirroring the event-append
   * pattern `AppointmentsService` uses for every other transition. Calling
   * again while already `COMPLETED` is a no-op success.
   *
   * @throws AppointmentNotFoundException (404) for an unknown appointment or a non-participant.
   * @throws ConsultationUnavailableException if the appointment is not `SCHEDULED`.
   * @throws InvalidTransitionException if the session isn't `IN_PROGRESS`.
   */
  async complete(caller: AuthUser, appointmentId: string): Promise<ConsultationResponseDto> {
    const row = await this.loadParticipantRow(caller, appointmentId);
    this.assertConsultable(row);
    const session = this.requireSession(row);

    if (session.state === SessionState.COMPLETED) {
      return this.toResponse(row, caller);
    }
    if (session.state !== SessionState.IN_PROGRESS) {
      throw new InvalidTransitionException(
        'The consultation must be in progress before it can be completed.',
      );
    }

    const previousState = session.state;
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.consultationSession.update({
        where: { appointmentId },
        data: { state: SessionState.COMPLETED, endedAt: now },
      });
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.COMPLETED, version: { increment: 1 } },
      });
      await tx.appointmentEvent.create({
        data: {
          appointmentId,
          type: AppointmentEventType.COMPLETED,
          actorId: caller.id,
        },
      });
      return updatedSession;
    });

    this.emitStateChanged(row, caller.id, previousState, updated);
    return this.toResponse(
      { ...row, status: AppointmentStatus.COMPLETED, session: updated },
      caller,
    );
  }

  /**
   * The doctor reports the patient never joined: cancels the appointment via
   * `AppointmentsService.cancelForNoShow` (reason `"Patient did not attend."`)
   * rather than duplicating cancellation logic here. Only allowed once
   * `startAt + CONSULTATION_NO_SHOW_GRACE_MINUTES` has passed and
   * `patientJoinedAt` is still null.
   *
   * @throws AppointmentNotFoundException (404) for an unknown appointment or a caller who isn't its doctor.
   * @throws ConsultationUnavailableException if the appointment is not `SCHEDULED`.
   * @throws InvalidTransitionException if the patient already joined, or the grace period hasn't elapsed.
   */
  async reportNoShow(caller: AuthUser, appointmentId: string): Promise<ConsultationResponseDto> {
    const row = await this.loadParticipantRow(caller, appointmentId);
    this.assertConsultable(row);
    const session = this.requireSession(row);

    if (session.patientJoinedAt) {
      throw new InvalidTransitionException('The patient has already joined this consultation.');
    }
    const graceDeadline = row.startAt.getTime() + CONSULTATION_NO_SHOW_GRACE_MINUTES * 60_000;
    if (Date.now() < graceDeadline) {
      throw new InvalidTransitionException('The no-show grace period has not elapsed yet.');
    }

    await this.appointments.cancelForNoShow(caller.id, appointmentId);
    const refreshed = await this.loadParticipantRow(caller, appointmentId);
    return this.toResponse(refreshed, caller);
  }

  /**
   * Gate reused by the records module so it doesn't duplicate this state
   * check: notes and prescriptions may only be written/issued while the
   * session is `IN_PROGRESS` or `COMPLETED`.
   *
   * @throws ConsultationUnavailableException if the session isn't in either state.
   */
  async assertRecordWritable(appointmentId: string): Promise<void> {
    if (!(await this.isInStates(appointmentId, [SessionState.IN_PROGRESS, SessionState.COMPLETED]))) {
      throw new ConsultationUnavailableException(
        'Notes and prescriptions can only be edited while the consultation is in progress or completed.',
      );
    }
  }

  /**
   * Gate reused by `ConsultationMessagesService.list`: the chat history stays
   * visible once the consultation has started, and after it ends, but never
   * before — this is a live consultation chat, not a persistent inbox.
   *
   * @throws ConsultationUnavailableException if the session isn't in either state.
   */
  async assertMessagingReadable(appointmentId: string): Promise<void> {
    if (!(await this.isInStates(appointmentId, [SessionState.IN_PROGRESS, SessionState.COMPLETED]))) {
      throw new ConsultationUnavailableException(
        'Messaging is only available once the consultation has started.',
      );
    }
  }

  /**
   * Gate reused by `ConsultationMessagesService.send`: unlike reading, new
   * messages may only be sent while the consultation is actively happening.
   *
   * @throws ConsultationUnavailableException if the session isn't `IN_PROGRESS`.
   */
  async assertMessagingWritable(appointmentId: string): Promise<void> {
    if (!(await this.isInStates(appointmentId, [SessionState.IN_PROGRESS]))) {
      throw new ConsultationUnavailableException(
        'Messaging is only available while the consultation is in progress.',
      );
    }
  }

  private async isInStates(appointmentId: string, states: SessionState[]): Promise<boolean> {
    const session = await this.prisma.consultationSession.findUnique({ where: { appointmentId } });
    return !!session && states.includes(session.state);
  }

  /** Loads the appointment (with session + participant profiles), 404ing for a non-participant. */
  private async loadParticipantRow(caller: AuthUser, appointmentId: string): Promise<ConsultationRow> {
    const row = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: CONSULTATION_INCLUDE,
    });
    const isParticipant =
      !!row &&
      ((caller.role === Role.PATIENT && row.patientId === caller.id) ||
        (caller.role === Role.DOCTOR && row.doctorId === caller.id));
    if (!row || !isParticipant) {
      throw new AppointmentNotFoundException();
    }
    return row;
  }

  /** @throws ConsultationUnavailableException if the appointment isn't `SCHEDULED`. */
  private assertConsultable(row: ConsultationRow): void {
    if (row.status !== AppointmentStatus.SCHEDULED) {
      throw new ConsultationUnavailableException(
        'This appointment is cancelled, completed or invalidated and its consultation cannot proceed.',
      );
    }
  }

  /** Every appointment has a session (created alongside it) — this is only a defensive unwrap. */
  private requireSession(row: ConsultationRow): ConsultationSessionRow {
    if (!row.session) {
      throw new Error(`Consultation session missing for appointment ${row.id}.`);
    }
    return row.session;
  }

  private emitStateChanged(
    row: ConsultationRow,
    actorId: string,
    previousState: SessionState,
    updated: ConsultationSessionRow,
  ): void {
    this.events.emit(CONSULTATION_STATE_CHANGED_EVENT, {
      appointmentId: row.id,
      sessionId: updated.id,
      actorId,
      patientId: row.patientId,
      doctorId: row.doctorId,
      previousState,
      state: updated.state,
      patientJoinedAt: updated.patientJoinedAt ? updated.patientJoinedAt.toISOString() : null,
      doctorJoinedAt: updated.doctorJoinedAt ? updated.doctorJoinedAt.toISOString() : null,
      startedAt: updated.startedAt ? updated.startedAt.toISOString() : null,
      endedAt: updated.endedAt ? updated.endedAt.toISOString() : null,
    } satisfies ConsultationStateChangedEvent);
  }

  private async toResponse(row: ConsultationRow, caller: AuthUser): Promise<ConsultationResponseDto> {
    const session = this.requireSession(row);
    const patientSummary =
      caller.role === Role.DOCTOR ? await this.buildPatientSummary(row) : null;

    return {
      id: session.id,
      appointmentId: row.id,
      state: session.state,
      patientJoinedAt: session.patientJoinedAt ? session.patientJoinedAt.toISOString() : null,
      doctorJoinedAt: session.doctorJoinedAt ? session.doctorJoinedAt.toISOString() : null,
      startedAt: session.startedAt ? session.startedAt.toISOString() : null,
      endedAt: session.endedAt ? session.endedAt.toISOString() : null,
      appointment: {
        id: row.id,
        startAt: row.startAt.toISOString(),
        endAt: row.endAt.toISOString(),
        status: row.status,
        reasonForVisit: row.reasonForVisit,
        patient: {
          id: row.patient.id,
          firstName: row.patient.patientProfile?.firstName ?? '',
          lastName: row.patient.patientProfile?.lastName ?? '',
        },
        doctor: {
          id: row.doctor.id,
          firstName: row.doctor.doctorProfile?.firstName ?? '',
          lastName: row.doctor.doctorProfile?.lastName ?? '',
          title: row.doctor.doctorProfile?.title ?? '',
          specializations: row.doctor.doctorSpecializations.map((s) => ({
            name: s.specialization.name,
          })),
        },
      },
      patientSummary,
    };
  }

  /**
   * Only called for a doctor caller. Reuses `patientProfile` fields already
   * fetched by `CONSULTATION_INCLUDE` — no separate call into
   * `PatientsService` (which is shaped around "my own profile", not "a
   * doctor's view of a specific patient"). `previousCompletedConsultations`
   * is a plain count, not a list — this panel is a summary, not a chart.
   */
  private async buildPatientSummary(row: ConsultationRow): Promise<ConsultationPatientSummary> {
    const profile = row.patient.patientProfile;
    const previousCompletedConsultations = await this.prisma.appointment.count({
      where: {
        patientId: row.patientId,
        doctorId: row.doctorId,
        status: AppointmentStatus.COMPLETED,
        id: { not: row.id },
      },
    });

    return {
      age: profile
        ? Math.floor(
            DateTime.now().diff(DateTime.fromJSDate(profile.birthDate, { zone: 'utc' }), 'years')
              .years,
          )
        : null,
      weightKg: profile ? profile.weightKg.toNumber() : null,
      heightCm: profile ? profile.heightCm.toNumber() : null,
      allergies: profile?.allergies ?? null,
      chronicConditions: profile?.chronicConditions ?? null,
      currentMedications: profile?.currentMedications ?? null,
      previousCompletedConsultations,
    };
  }
}
