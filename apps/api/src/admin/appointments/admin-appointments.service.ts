import { Injectable } from '@nestjs/common';
import { ADMIN_APPOINTMENTS_PAGE_SIZE } from '@doksabahay/shared';
import { AppointmentEventType, AppointmentStatus, NotificationType, Prisma, SessionState } from '@prisma/client';

import {
  AppointmentNotModifiableException,
  mapAppointmentConstraintError,
} from '../../appointments/appointments.exceptions';
import type { AuthUser } from '../../auth/auth.types';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAppointmentNotFoundException } from '../admin.exceptions';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import {
  ADMIN_APPOINTMENT_SUMMARY_INCLUDE,
  toAdminAppointmentSummary,
  type AdminAppointmentSummaryDto,
} from './admin-appointments.mapper';
import type {
  AdminAppointmentActionDto,
  AdminSetAppointmentDateTimeDto,
  ListAdminAppointmentsQueryDto,
} from './dto/admin-appointments.dto';

const DOCTOR_APPOINTMENTS_LINK = '/doctor/appointments';
const PATIENT_APPOINTMENTS_LINK = '/patient/appointments';

const DETAIL_INCLUDE = {
  ...ADMIN_APPOINTMENT_SUMMARY_INCLUDE,
  session: {
    select: {
      state: true,
      patientJoinedAt: true,
      doctorJoinedAt: true,
      startedAt: true,
      endedAt: true,
    },
  },
  events: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.AppointmentInclude;

export interface PaginatedAdminAppointmentsDto {
  items: AdminAppointmentSummaryDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

/** `AdminAppointmentSummaryDto` plus its `ConsultationSession` detail and full `AppointmentEvent` timeline. */
export interface AdminAppointmentDetailDto extends AdminAppointmentSummaryDto {
  session: {
    state: SessionState;
    patientJoinedAt: string | null;
    doctorJoinedAt: string | null;
    startedAt: string | null;
    endedAt: string | null;
  };
  events: {
    id: string;
    type: AppointmentEventType;
    actorId: string;
    fromStartAt: string | null;
    toStartAt: string | null;
    reason: string | null;
    createdAt: string;
  }[];
}

/**
 * Admin oversight of appointment logistics: listing, one appointment's full
 * detail plus event timeline, and forced cancel/invalidate. Never reads or
 * returns clinical note/prescription content (see `admin-appointments.mapper.ts`).
 */
@Injectable()
export class AdminAppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Lists appointments, most recently starting first, filtered by any of the given query params. */
  async list(query: ListAdminAppointmentsQueryDto): Promise<PaginatedAdminAppointmentsDto> {
    const page = query.page ?? 1;
    const pageSize = ADMIN_APPOINTMENTS_PAGE_SIZE;

    const where: Prisma.AppointmentWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.sessionState && { session: { state: query.sessionState } }),
      ...(query.doctorId && { doctorId: query.doctorId }),
      ...(query.patientId && { patientId: query.patientId }),
      ...((query.from || query.to) && {
        startAt: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lt: new Date(query.to) }),
        },
      }),
    };

    const [items, totalCount] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: ADMIN_APPOINTMENT_SUMMARY_INCLUDE,
        orderBy: { startAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { items: items.map(toAdminAppointmentSummary), page, pageSize, totalCount };
  }

  /**
   * One appointment's metadata, session state and full event timeline.
   *
   * @throws AdminAppointmentNotFoundException if `id` does not exist.
   */
  async getById(id: string): Promise<AdminAppointmentDetailDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!appointment) {
      throw new AdminAppointmentNotFoundException();
    }

    return {
      ...toAdminAppointmentSummary(appointment),
      session: {
        state: appointment.session?.state ?? SessionState.SCHEDULED,
        patientJoinedAt: appointment.session?.patientJoinedAt?.toISOString() ?? null,
        doctorJoinedAt: appointment.session?.doctorJoinedAt?.toISOString() ?? null,
        startedAt: appointment.session?.startedAt?.toISOString() ?? null,
        endedAt: appointment.session?.endedAt?.toISOString() ?? null,
      },
      events: appointment.events.map((event) => ({
        id: event.id,
        type: event.type,
        actorId: event.actorId,
        fromStartAt: event.fromStartAt ? event.fromStartAt.toISOString() : null,
        toStartAt: event.toStartAt ? event.toStartAt.toISOString() : null,
        reason: event.reason,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Force-cancels a SCHEDULED appointment (status `CANCELLED`). An admin is
   * never a participant, so this does not reuse `AppointmentsService.cancel`
   * (which enforces participant ownership) — it writes the same shape of
   * change directly, in its own transaction with its own audit entry.
   *
   * @throws AdminAppointmentNotFoundException if `id` does not exist.
   * @throws AppointmentNotModifiableException if the appointment is not SCHEDULED.
   */
  async cancel(
    actor: AuthUser,
    id: string,
    dto: AdminAppointmentActionDto,
    ipAddress?: string,
  ): Promise<AdminAppointmentSummaryDto> {
    return this.transition(actor, id, dto, ipAddress, {
      status: AppointmentStatus.CANCELLED,
      eventType: AppointmentEventType.CANCELLED,
      auditAction: AUDIT_ACTIONS.APPOINTMENT_CANCELLED_BY_ADMIN,
      notificationTitle: 'Appointment cancelled',
      notificationBody: (reason) => `An administrator cancelled this appointment: ${reason}`,
    });
  }

  /**
   * Force-invalidates a SCHEDULED appointment (status `INVALIDATED`) — for
   * appointments that should never have remained bookable/valid (see
   * `GET /admin/appointments/issues`), distinct from an ordinary cancellation.
   *
   * @throws AdminAppointmentNotFoundException if `id` does not exist.
   * @throws AppointmentNotModifiableException if the appointment is not SCHEDULED.
   */
  async invalidate(
    actor: AuthUser,
    id: string,
    dto: AdminAppointmentActionDto,
    ipAddress?: string,
  ): Promise<AdminAppointmentSummaryDto> {
    return this.transition(actor, id, dto, ipAddress, {
      status: AppointmentStatus.INVALIDATED,
      eventType: AppointmentEventType.INVALIDATED,
      auditAction: AUDIT_ACTIONS.APPOINTMENT_INVALIDATED,
      notificationTitle: 'Appointment invalidated',
      notificationBody: (reason) =>
        `An administrator invalidated this appointment (it was no longer valid to keep): ${reason}`,
    });
  }

  /**
   * Shared implementation of {@link cancel} and {@link invalidate} — same
   * transaction shape (status update + `AppointmentEvent` + audit entry),
   * differing only in the target status/event type/audit action/notification
   * copy. Notifies both participants directly via `NotificationsService`
   * rather than emitting `APPOINTMENT_CANCELLED_EVENT`: that event's listener
   * resolves the recipient as "whichever participant is not `actorId`", which
   * assumes the actor is one of the two participants — never true for an
   * admin, so reusing it verbatim would silently notify only one side.
   */
  private async transition(
    actor: AuthUser,
    id: string,
    dto: AdminAppointmentActionDto,
    ipAddress: string | undefined,
    config: {
      status: typeof AppointmentStatus.CANCELLED | typeof AppointmentStatus.INVALIDATED;
      eventType: typeof AppointmentEventType.CANCELLED | typeof AppointmentEventType.INVALIDATED;
      auditAction: string;
      notificationTitle: string;
      notificationBody: (reason: string) => string;
    },
  ): Promise<AdminAppointmentSummaryDto> {
    const reason = dto.reason.trim();
    const existing = await this.prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      throw new AdminAppointmentNotFoundException();
    }
    if (existing.status !== AppointmentStatus.SCHEDULED) {
      throw new AppointmentNotModifiableException(
        `Only a scheduled appointment can be ${config.status === AppointmentStatus.CANCELLED ? 'cancelled' : 'invalidated'}.`,
      );
    }

    const before = { status: existing.status };
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.appointment.updateMany({
        where: { id, status: AppointmentStatus.SCHEDULED },
        data: {
          status: config.status,
          cancelledById: actor.id,
          cancelledAt: new Date(),
          cancellationReason: reason,
          version: { increment: 1 },
        },
      });
      if (result.count === 0) {
        throw new AppointmentNotModifiableException(
          `Only a scheduled appointment can be ${config.status === AppointmentStatus.CANCELLED ? 'cancelled' : 'invalidated'}.`,
        );
      }
      await tx.appointmentEvent.create({
        data: { appointmentId: id, type: config.eventType, actorId: actor.id, reason },
      });
      await this.audit.record(tx, {
        actorId: actor.id,
        action: config.auditAction,
        entityType: AUDIT_ENTITY_TYPES.APPOINTMENT,
        entityId: id,
        before,
        after: { status: config.status },
        reason,
        ipAddress,
      });
      return tx.appointment.findUniqueOrThrow({ where: { id }, include: ADMIN_APPOINTMENT_SUMMARY_INCLUDE });
    });

    const body = config.notificationBody(reason);
    await Promise.all([
      this.notifications.create(
        updated.patientId,
        NotificationType.APPOINTMENT_CANCELLED,
        config.notificationTitle,
        body,
        PATIENT_APPOINTMENTS_LINK,
      ),
      this.notifications.create(
        updated.doctorId,
        NotificationType.APPOINTMENT_CANCELLED,
        config.notificationTitle,
        body,
        DOCTOR_APPOINTMENTS_LINK,
      ),
    ]);

    return toAdminAppointmentSummary(updated);
  }

  /**
   * Demo/admin tool: moves an appointment to any date and time, down to the
   * minute, regardless of its status. Unlike a patient's own reschedule, this
   * bypasses slot alignment, lead time, the booking horizon, and the
   * per-person/per-account upcoming limits entirely — it exists to let a demo
   * presenter line up an appointment's time freely (e.g. move it to start in
   * two minutes to demo joining a consultation live), not to model a real
   * reschedule. `endAt` shifts by the same amount as `startAt`, so the
   * appointment's original duration is preserved. The two database-level
   * constraints still apply and are surfaced as ordinary 409s: `endAt` must
   * stay after `startAt` (guaranteed here, since both shift together) and, if
   * the appointment is SCHEDULED, it must not end up overlapping another
   * SCHEDULED appointment for the same doctor or patient.
   *
   * No participant notification and no `AppointmentEvent` beyond the audit
   * trail — this is a backstage tool, not a real-world reschedule the other
   * party should be told about.
   *
   * @throws AdminAppointmentNotFoundException if `id` does not exist.
   * @throws SlotTakenException | PatientOverlapException if the new time
   *   collides with another SCHEDULED appointment (only possible when this
   *   appointment is itself SCHEDULED).
   */
  async setDateTime(
    actor: AuthUser,
    id: string,
    dto: AdminSetAppointmentDateTimeDto,
    ipAddress?: string,
  ): Promise<AdminAppointmentSummaryDto> {
    const existing = await this.prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      throw new AdminAppointmentNotFoundException();
    }

    const durationMs = existing.endAt.getTime() - existing.startAt.getTime();
    const newStartAt = new Date(dto.startAt);
    const newEndAt = new Date(newStartAt.getTime() + durationMs);
    const before = { startAt: existing.startAt.toISOString(), endAt: existing.endAt.toISOString() };
    const after = { startAt: newStartAt.toISOString(), endAt: newEndAt.toISOString() };

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.appointment.update({
          where: { id },
          data: { startAt: newStartAt, endAt: newEndAt, version: { increment: 1 } },
          include: ADMIN_APPOINTMENT_SUMMARY_INCLUDE,
        });
        await this.audit.record(tx, {
          actorId: actor.id,
          action: AUDIT_ACTIONS.APPOINTMENT_DATETIME_EDITED,
          entityType: AUDIT_ENTITY_TYPES.APPOINTMENT,
          entityId: id,
          before,
          after,
          ipAddress,
        });
        return result;
      });
      return toAdminAppointmentSummary(updated);
    } catch (error) {
      mapAppointmentConstraintError(error);
    }
  }
}
