import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ADMIN_USERS_PAGE_SIZE } from '@doksabahay/shared';
import { AccountStatus, AppointmentStatus, Prisma, Role, User } from '@prisma/client';

import {
  AppointmentNotFoundException,
  AppointmentNotModifiableException,
} from '../../appointments/appointments.exceptions';
import { AppointmentsService } from '../../appointments/appointments.service';
import { AuthStateService } from '../../auth/auth-state.service';
import type { AuthUser } from '../../auth/auth.types';
import { TokenService } from '../../auth/token.service';
import { ValidationFailedException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminStatusChangeException, SelfStatusChangeException, UserNotFoundException } from '../admin.exceptions';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { ACCOUNT_STATUS_CHANGED_EVENT, type AccountStatusChangedEvent } from './admin-users.events';
import type { ListUsersQueryDto, UpdateUserStatusDto } from './dto/admin-users.dto';

type UserWithNames = User & {
  patientProfile: { firstName: string; lastName: string } | null;
  doctorProfile: { firstName: string; lastName: string } | null;
};

/**
 * Response shapes, typed with Prisma's enums (not `@doksabahay/shared`'s
 * zod-inferred ones — a separately declared TS enum with matching string
 * values is still a distinct nominal type, so the two are not directly
 * assignable even though `enums.spec.ts` keeps their values in sync). The
 * frontend validates the actual JSON with the shared zod schema instead,
 * which checks by value, not by TS type identity.
 */
export interface AdminUserSummaryDto {
  id: string;
  email: string;
  role: Role;
  status: AccountStatus;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserDetailDto extends AdminUserSummaryDto {
  statusReason: string | null;
  upcomingAppointmentCount: number;
}

export interface PaginatedAdminUsersDto {
  items: AdminUserSummaryDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

function toSummary(row: UserWithNames): AdminUserSummaryDto {
  const profile = row.patientProfile ?? row.doctorProfile;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    firstName: profile?.firstName ?? null,
    lastName: profile?.lastName ?? null,
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
  };
}

const NAME_SELECT = {
  patientProfile: { select: { firstName: true, lastName: true } },
  doctorProfile: { select: { firstName: true, lastName: true } },
} satisfies Prisma.UserInclude;

/**
 * Admin user search/detail/status-management. Suspending or deactivating a
 * user kills their sessions at once (bumped `tokenVersion` + every refresh
 * token revoked) and cancels their future SCHEDULED appointments by reusing
 * `AppointmentsService.cancel` (so the other party is notified exactly as if
 * that participant had cancelled themselves — no duplicate cancellation/
 * notification logic here).
 */
@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authState: AuthStateService,
    private readonly tokens: TokenService,
    private readonly appointments: AppointmentsService,
    private readonly events: EventEmitter2,
  ) {}

  /** Searches/filters users, newest first. */
  async list(query: ListUsersQueryDto): Promise<PaginatedAdminUsersDto> {
    const page = query.page ?? 1;
    const pageSize = ADMIN_USERS_PAGE_SIZE;
    const q = query.q?.trim();

    const where: Prisma.UserWhereInput = {
      ...(query.role && { role: query.role }),
      ...(query.status && { status: query.status }),
      ...(q && {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          {
            patientProfile: {
              is: {
                OR: [
                  { firstName: { contains: q, mode: 'insensitive' } },
                  { lastName: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          },
          {
            doctorProfile: {
              is: {
                OR: [
                  { firstName: { contains: q, mode: 'insensitive' } },
                  { lastName: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      }),
    };

    const [items, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: NAME_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: items.map(toSummary), page, pageSize, totalCount };
  }

  /**
   * @throws UserNotFoundException if `id` does not exist.
   */
  async getById(id: string): Promise<AdminUserDetailDto> {
    const user = await this.prisma.user.findUnique({ where: { id }, include: NAME_SELECT });
    if (!user) {
      throw new UserNotFoundException();
    }
    const upcomingAppointmentCount = await this.countUpcomingAppointments(id);
    return { ...toSummary(user), statusReason: user.statusReason, upcomingAppointmentCount };
  }

  /**
   * Changes `status` (and `statusReason`), invalidates every outstanding
   * session for that user, records an audit entry, notifies the affected
   * user, and — if the new status is not ACTIVE — cancels their future
   * SCHEDULED appointments.
   *
   * @throws SelfStatusChangeException if `actor.id === id`.
   * @throws AdminStatusChangeException if the target user is an ADMIN.
   * @throws UserNotFoundException if `id` does not exist.
   * @throws ValidationFailedException if `status` is SUSPENDED/DEACTIVATED without a `reason`.
   */
  async updateStatus(
    actor: AuthUser,
    id: string,
    dto: UpdateUserStatusDto,
    ipAddress?: string,
  ): Promise<AdminUserDetailDto> {
    if (id === actor.id) {
      throw new SelfStatusChangeException();
    }
    if (dto.status !== AccountStatus.ACTIVE && !dto.reason?.trim()) {
      throw new ValidationFailedException(
        'reason is required when suspending or deactivating an account.',
      );
    }

    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) {
      throw new UserNotFoundException();
    }
    if (target.role === Role.ADMIN) {
      throw new AdminStatusChangeException();
    }

    const reason = dto.reason?.trim() || null;

    // Idempotency guard: re-submitting the same status (e.g. a second click
    // after it already succeeded, or a stale dialog resubmitted) must not
    // re-audit, re-revoke sessions, re-cancel appointments or re-notify.
    if (target.status === dto.status) {
      return this.getById(id);
    }

    const before = { status: target.status, statusReason: target.statusReason };
    const after = { status: dto.status, statusReason: reason };

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { status: dto.status, statusReason: reason, tokenVersion: { increment: 1 } },
      });
      await this.audit.record(tx, {
        actorId: actor.id,
        action: AUDIT_ACTIONS.USER_STATUS_CHANGED,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: id,
        before,
        after,
        reason,
        ipAddress,
      });
    });

    this.authState.invalidate(id);
    await this.tokens.revokeAllForUser(id);

    this.events.emit(ACCOUNT_STATUS_CHANGED_EVENT, {
      userId: id,
      role: target.role,
      status: dto.status,
      reason,
      actorId: actor.id,
    } satisfies AccountStatusChangedEvent);

    if (dto.status !== AccountStatus.ACTIVE) {
      await this.cancelFutureAppointments(target, dto.status);
    }

    return this.getById(id);
  }

  /** Cheap count used by the web status-change dialog's cascade warning. */
  private countUpcomingAppointments(userId: string): Promise<number> {
    return this.prisma.appointment.count({
      where: {
        status: AppointmentStatus.SCHEDULED,
        startAt: { gte: new Date() },
        OR: [{ patientId: userId }, { doctorId: userId }],
      },
    });
  }

  /**
   * Cancels every future SCHEDULED appointment where `target` participates,
   * via `AppointmentsService.cancel` — impersonating `target` as the caller
   * (they are always the patient owner or doctor owner of their own
   * appointments) so the existing ownership check, `AppointmentEvent`
   * write and `appointment.cancelled` emission all happen exactly as they
   * would for a self-service cancellation. A race where an appointment
   * started or was already cancelled between the query and the cancel call
   * is logged and skipped, not fatal to the rest of the cascade.
   */
  private async cancelFutureAppointments(target: User, status: AccountStatus): Promise<void> {
    const participantFilter: Prisma.AppointmentWhereInput =
      target.role === Role.DOCTOR ? { doctorId: target.id } : { patientId: target.id };
    const upcoming = await this.prisma.appointment.findMany({
      where: { ...participantFilter, status: AppointmentStatus.SCHEDULED, startAt: { gt: new Date() } },
      select: { id: true },
    });

    const caller: AuthUser = { id: target.id, role: target.role };
    const reason = `Account ${status}`;
    for (const appointment of upcoming) {
      try {
        await this.appointments.cancel(caller, appointment.id, { reason });
      } catch (error) {
        if (
          error instanceof AppointmentNotModifiableException ||
          error instanceof AppointmentNotFoundException
        ) {
          this.logger.warn(
            `Skipped cascading cancel of appointment ${appointment.id} for user ${target.id}: ${error.message}`,
          );
          continue;
        }
        throw error;
      }
    }
  }
}
