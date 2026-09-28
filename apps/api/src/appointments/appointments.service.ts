import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  APPOINTMENTS_PAGE_SIZE,
  BOOKING_HORIZON_DAYS,
  LEAD_TIME_MINUTES,
  MAX_UPCOMING_PER_PATIENT,
  RESCHEDULE_CUTOFF_MINUTES,
} from '@doksabahay/shared';
import {
  AccountStatus,
  AppointmentEventType,
  AppointmentStatus,
  Prisma,
  Role,
  SessionState,
  VerificationStatus,
} from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { DoctorNotBookableException } from '../doctors/doctors.exceptions';
import { computeFreeSlots } from '../doctors/slot-engine';
import { SlotService } from '../doctors/slot.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  APPOINTMENT_CANCELLED_EVENT,
  APPOINTMENT_CREATED_EVENT,
  APPOINTMENT_RESCHEDULED_EVENT,
  type AppointmentCancelledEvent,
  type AppointmentCreatedEvent,
  type AppointmentRescheduledEvent,
} from './appointments.events';
import {
  AppointmentNotFoundException,
  AppointmentNotModifiableException,
  CancellationReasonRequiredException,
  InvalidBookingWindowException,
  RescheduleWindowClosedException,
  SlotTakenException,
  StaleAppointmentVersionException,
  TooManyUpcomingAppointmentsException,
  mapAppointmentConstraintError,
} from './appointments.exceptions';
import type { AppointmentListQueryDto } from './dto/appointment-query.dto';
import type { AppointmentResponseDto, PaginatedAppointmentsDto } from './dto/appointment-response.dto';
import type { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import type { CreateAppointmentDto } from './dto/create-appointment.dto';
import type { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

/** Includes both participants' display fields on every `Appointment` query. */
const APPOINTMENT_INCLUDE = {
  patient: { select: { id: true, patientProfile: { select: { firstName: true, lastName: true } } } },
  doctor: {
    select: {
      id: true,
      doctorProfile: { select: { firstName: true, lastName: true, title: true } },
    },
  },
} satisfies Prisma.AppointmentInclude;

type AppointmentWithParticipants = Prisma.AppointmentGetPayload<{
  include: typeof APPOINTMENT_INCLUDE;
}>;

function toAppointmentResponse(row: AppointmentWithParticipants): AppointmentResponseDto {
  return {
    id: row.id,
    doctorId: row.doctorId,
    patientId: row.patientId,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    status: row.status,
    reasonForVisit: row.reasonForVisit,
    cancelledById: row.cancelledById,
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
    cancellationReason: row.cancellationReason,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
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
    },
  };
}

/**
 * Booking, rescheduling and cancelling `Appointment`s, plus the two list
 * endpoints. Every state transition also writes an append-only
 * `AppointmentEvent` and emits a matching domain event (see
 * `appointments.events.ts`) for a later notifications module to consume.
 */
@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slots: SlotService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Books a new appointment for the signed-in patient.
   *
   * @throws InvalidBookingWindowException if `startAt` violates `LEAD_TIME_MINUTES`/`BOOKING_HORIZON_DAYS`.
   * @throws DoctorNotBookableException (404) if the doctor does not exist or is not APPROVED/ACTIVE.
   * @throws SlotTakenException if `startAt` is not exactly a currently free slot, or the DB's
   *   `appointments_doctor_no_overlap` constraint fires at commit time (lost a race).
   * @throws PatientOverlapException if the DB's `appointments_patient_no_overlap` constraint fires.
   * @throws TooManyUpcomingAppointmentsException if the patient already has `MAX_UPCOMING_PER_PATIENT`
   *   upcoming SCHEDULED appointments.
   */
  async create(patientId: string, dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    const startAt = new Date(dto.startAt);
    this.assertWithinBookingWindow(startAt);
    const endAt = await this.matchSlotViaSlotService(dto.doctorId, startAt);
    await this.assertUpcomingLimit(patientId);

    try {
      const appointment = await this.prisma.$transaction(async (tx) => {
        const created = await tx.appointment.create({
          data: {
            patientId,
            doctorId: dto.doctorId,
            startAt,
            endAt,
            reasonForVisit: dto.reasonForVisit,
            status: AppointmentStatus.SCHEDULED,
          },
          include: APPOINTMENT_INCLUDE,
        });
        await tx.consultationSession.create({
          data: { appointmentId: created.id, state: SessionState.SCHEDULED },
        });
        await tx.appointmentEvent.create({
          data: {
            appointmentId: created.id,
            type: AppointmentEventType.CREATED,
            actorId: patientId,
          },
        });
        return created;
      });

      this.events.emit(APPOINTMENT_CREATED_EVENT, {
        appointmentId: appointment.id,
        actorId: patientId,
        patientId,
        doctorId: dto.doctorId,
      } satisfies AppointmentCreatedEvent);

      return toAppointmentResponse(appointment);
    } catch (error) {
      mapAppointmentConstraintError(error);
    }
  }

  /**
   * Reschedules a SCHEDULED appointment the signed-in patient owns, until
   * `RESCHEDULE_CUTOFF_MINUTES` before its current `startAt`.
   *
   * @throws AppointmentNotFoundException (404) if `id` is not an appointment owned by this patient
   *   (never 403 — a non-owner cannot tell the appointment exists).
   * @throws AppointmentNotModifiableException if the appointment is not SCHEDULED.
   * @throws RescheduleWindowClosedException if within `RESCHEDULE_CUTOFF_MINUTES` of the current `startAt`.
   * @throws InvalidBookingWindowException / DoctorNotBookableException / SlotTakenException /
   *   PatientOverlapException, see `create`.
   * @throws StaleAppointmentVersionException if the appointment changed since it was read.
   */
  async reschedule(
    patientId: string,
    appointmentId: string,
    dto: RescheduleAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const existing = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!existing || existing.patientId !== patientId) {
      throw new AppointmentNotFoundException();
    }
    if (existing.status !== AppointmentStatus.SCHEDULED) {
      throw new AppointmentNotModifiableException(
        'Only a scheduled appointment can be rescheduled.',
      );
    }
    const cutoff = existing.startAt.getTime() - RESCHEDULE_CUTOFF_MINUTES * 60_000;
    if (Date.now() > cutoff) {
      throw new RescheduleWindowClosedException();
    }

    const newStartAt = new Date(dto.startAt);
    this.assertWithinBookingWindow(newStartAt);
    const newEndAt = await this.matchSlotExcludingAppointment(
      existing.doctorId,
      newStartAt,
      existing.id,
    );

    try {
      const appointment = await this.prisma.$transaction(async (tx) => {
        const result = await tx.appointment.updateMany({
          where: { id: existing.id, version: existing.version },
          data: { startAt: newStartAt, endAt: newEndAt, version: { increment: 1 } },
        });
        if (result.count === 0) {
          throw new StaleAppointmentVersionException();
        }
        await tx.appointmentEvent.create({
          data: {
            appointmentId: existing.id,
            type: AppointmentEventType.RESCHEDULED,
            actorId: patientId,
            fromStartAt: existing.startAt,
            toStartAt: newStartAt,
          },
        });
        return tx.appointment.findUniqueOrThrow({
          where: { id: existing.id },
          include: APPOINTMENT_INCLUDE,
        });
      });

      this.events.emit(APPOINTMENT_RESCHEDULED_EVENT, {
        appointmentId: appointment.id,
        actorId: patientId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        fromStartAt: existing.startAt.toISOString(),
        toStartAt: newStartAt.toISOString(),
      } satisfies AppointmentRescheduledEvent);

      return toAppointmentResponse(appointment);
    } catch (error) {
      if (error instanceof StaleAppointmentVersionException) {
        throw error;
      }
      mapAppointmentConstraintError(error);
    }
  }

  /**
   * Cancels a SCHEDULED, not-yet-started appointment. The caller must be
   * either the patient or the doctor on it. `dto.reason` is required when the
   * caller is the doctor (the DTO alone cannot enforce this, since it does
   * not know who is calling).
   *
   * @throws AppointmentNotFoundException (404) if `id` does not exist, or the caller is not
   *   one of its two participants (never 403 — see the class-level note on `getOne`).
   * @throws AppointmentNotModifiableException if the appointment is not SCHEDULED or already started.
   * @throws CancellationReasonRequiredException if the doctor cancelled without a `reason`.
   */
  async cancel(
    caller: AuthUser,
    appointmentId: string,
    dto: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const existing = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    const isPatientOwner = caller.role === Role.PATIENT && existing?.patientId === caller.id;
    const isDoctorOwner = caller.role === Role.DOCTOR && existing?.doctorId === caller.id;
    if (!existing || (!isPatientOwner && !isDoctorOwner)) {
      throw new AppointmentNotFoundException();
    }
    if (existing.status !== AppointmentStatus.SCHEDULED) {
      throw new AppointmentNotModifiableException('Only a scheduled appointment can be cancelled.');
    }
    if (existing.startAt.getTime() <= Date.now()) {
      throw new AppointmentNotModifiableException('This appointment has already started.');
    }
    const reason = dto.reason?.trim() || null;
    if (isDoctorOwner && !reason) {
      throw new CancellationReasonRequiredException();
    }

    const appointment = await this.prisma.$transaction(async (tx) => {
      const result = await tx.appointment.updateMany({
        where: { id: existing.id, status: AppointmentStatus.SCHEDULED },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancelledById: caller.id,
          cancelledAt: new Date(),
          cancellationReason: reason,
          version: { increment: 1 },
        },
      });
      if (result.count === 0) {
        throw new AppointmentNotModifiableException(
          'Only a scheduled appointment can be cancelled.',
        );
      }
      await tx.appointmentEvent.create({
        data: {
          appointmentId: existing.id,
          type: AppointmentEventType.CANCELLED,
          actorId: caller.id,
          reason,
        },
      });
      return tx.appointment.findUniqueOrThrow({
        where: { id: existing.id },
        include: APPOINTMENT_INCLUDE,
      });
    });

    this.events.emit(APPOINTMENT_CANCELLED_EVENT, {
      appointmentId: appointment.id,
      actorId: caller.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      cancelledById: caller.id,
      reason,
    } satisfies AppointmentCancelledEvent);

    return toAppointmentResponse(appointment);
  }

  /**
   * Lists the caller's own appointments — patients see appointments where
   * they are the patient, doctors see appointments where they are the
   * doctor, never both. `scope: 'upcoming'` is SCHEDULED and not yet started
   * (soonest first); `scope: 'past'` is everything else — cancelled,
   * completed, invalidated, or SCHEDULED but its time has passed (most
   * recent first).
   */
  async list(caller: AuthUser, query: AppointmentListQueryDto): Promise<PaginatedAppointmentsDto> {
    const page = query.page ?? 1;
    const pageSize = APPOINTMENTS_PAGE_SIZE;
    const now = new Date();
    const participantFilter: Prisma.AppointmentWhereInput =
      caller.role === Role.DOCTOR ? { doctorId: caller.id } : { patientId: caller.id };
    const scopeFilter: Prisma.AppointmentWhereInput =
      query.scope === 'upcoming'
        ? { status: AppointmentStatus.SCHEDULED, startAt: { gte: now } }
        : { OR: [{ status: { not: AppointmentStatus.SCHEDULED } }, { startAt: { lt: now } }] };
    const where: Prisma.AppointmentWhereInput = { AND: [participantFilter, scopeFilter] };

    const [items, totalCount] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: APPOINTMENT_INCLUDE,
        orderBy: { startAt: query.scope === 'upcoming' ? 'asc' : 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { items: items.map(toAppointmentResponse), page, pageSize, totalCount };
  }

  /**
   * Fetches one appointment. Only its two participants may see it.
   *
   * @throws AppointmentNotFoundException (404, never 403) for an unknown id or a caller who is
   *   not the patient or doctor on it — so a non-participant cannot probe which appointment ids
   *   exist, matching the philosophy `GET /doctors/:id/slots` already uses for a non-bookable doctor.
   */
  async getOne(caller: AuthUser, id: string): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE,
    });
    const isParticipant =
      !!appointment &&
      ((caller.role === Role.PATIENT && appointment.patientId === caller.id) ||
        (caller.role === Role.DOCTOR && appointment.doctorId === caller.id));
    if (!appointment || !isParticipant) {
      throw new AppointmentNotFoundException();
    }
    return toAppointmentResponse(appointment);
  }

  /**
   * @throws InvalidBookingWindowException if `startAt` is closer than `LEAD_TIME_MINUTES` from now,
   *   or further than `BOOKING_HORIZON_DAYS`. Redundant with what `SlotService`/`computeFreeSlots`
   *   already enforce (both are called right after this), kept explicit for a precise error message.
   */
  private assertWithinBookingWindow(startAt: Date): void {
    const now = Date.now();
    const earliest = now + LEAD_TIME_MINUTES * 60_000;
    const latest = now + BOOKING_HORIZON_DAYS * 24 * 60 * 60_000;
    if (startAt.getTime() < earliest) {
      throw new InvalidBookingWindowException(
        `startAt must be at least ${LEAD_TIME_MINUTES} minutes from now.`,
      );
    }
    if (startAt.getTime() > latest) {
      throw new InvalidBookingWindowException(
        `startAt must be within ${BOOKING_HORIZON_DAYS} days from now.`,
      );
    }
  }

  /** @throws TooManyUpcomingAppointmentsException, see `create`. */
  private async assertUpcomingLimit(patientId: string): Promise<void> {
    const count = await this.prisma.appointment.count({
      where: { patientId, status: AppointmentStatus.SCHEDULED, startAt: { gte: new Date() } },
    });
    if (count >= MAX_UPCOMING_PER_PATIENT) {
      throw new TooManyUpcomingAppointmentsException(MAX_UPCOMING_PER_PATIENT);
    }
  }

  /**
   * Validates `startAt` against `SlotService.getFreeSlots`, queried with a
   * 1ms window so only a candidate slot starting at exactly `startAt`
   * matches — precise membership, not an approximate "roughly free" check.
   * Used by `create`, where nothing needs excluding.
   *
   * @returns The matched slot's `endAt` (i.e. `startAt + doctor.consultationMinutes`).
   * @throws DoctorNotBookableException / SlotTakenException, see `create`.
   */
  private async matchSlotViaSlotService(doctorId: string, startAt: Date): Promise<Date> {
    const to = new Date(startAt.getTime() + 1);
    const slots = await this.slots.getFreeSlots(doctorId, startAt, to);
    const match = slots.find((slot) => slot.startAt.getTime() === startAt.getTime());
    if (!match) {
      throw new SlotTakenException();
    }
    return match.endAt;
  }

  /**
   * Same validation as `matchSlotViaSlotService`, but excluding
   * `excludeAppointmentId` from the booked-appointments the doctor's free
   * slots are computed against — needed so a reschedule can re-select (or
   * overlap) the appointment's own current slot, which it still occupies
   * until the update commits. `SlotService.getFreeSlots` has no exclusion
   * parameter (its signature is shared with the public slots listing), so
   * this re-fetches the same inputs and calls the underlying pure
   * `computeFreeSlots` directly instead — exactly what `SlotService`'s own
   * doc comment suggests a booking module do for this case.
   *
   * @throws DoctorNotBookableException / SlotTakenException, see `create`.
   */
  private async matchSlotExcludingAppointment(
    doctorId: string,
    startAt: Date,
    excludeAppointmentId: string,
  ): Promise<Date> {
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      select: {
        status: true,
        doctorProfile: {
          select: { timezone: true, consultationMinutes: true, verificationStatus: true },
        },
      },
    });
    if (
      !doctor?.doctorProfile ||
      doctor.status !== AccountStatus.ACTIVE ||
      doctor.doctorProfile.verificationStatus !== VerificationStatus.APPROVED
    ) {
      throw new DoctorNotBookableException();
    }

    const to = new Date(startAt.getTime() + 1);
    const [rules, exceptions, appointments] = await Promise.all([
      this.prisma.availabilityRule.findMany({
        where: { doctorId },
        select: { dayOfWeek: true, startTime: true, endTime: true },
      }),
      this.prisma.availabilityException.findMany({
        where: { doctorId, startAt: { lt: to }, endAt: { gt: startAt } },
        select: { startAt: true, endAt: true },
      }),
      this.prisma.appointment.findMany({
        where: {
          doctorId,
          status: AppointmentStatus.SCHEDULED,
          id: { not: excludeAppointmentId },
          startAt: { lt: to },
          endAt: { gt: startAt },
        },
        select: { startAt: true, endAt: true },
      }),
    ]);

    const slots = computeFreeSlots({
      timezone: doctor.doctorProfile.timezone,
      consultationMinutes: doctor.doctorProfile.consultationMinutes,
      rules,
      exceptions,
      bookedAppointments: appointments,
      from: startAt,
      to,
      now: new Date(),
      leadTimeMinutes: LEAD_TIME_MINUTES,
      horizonDays: BOOKING_HORIZON_DAYS,
    });

    const match = slots.find((slot) => slot.startAt.getTime() === startAt.getTime());
    if (!match) {
      throw new SlotTakenException();
    }
    return match.endAt;
  }
}
