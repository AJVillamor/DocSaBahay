import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ADMIN_DOCTORS_PAGE_SIZE, type ConsultationMinutes } from '@doksabahay/shared';
import { AccountStatus, DoctorProfile, Prisma, User, VerificationStatus } from '@prisma/client';

import type { AuthUser } from '../../auth/auth.types';
import { validateSpecializationSelection } from '../../doctors/doctor-profile.service';
import { UnknownSpecializationException } from '../../doctors/doctors.exceptions';
import type { UpdateDoctorProfileDto } from '../../doctors/dto/doctor-profile.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminDoctorNotFoundException } from '../admin.exceptions';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { DOCTOR_REVIEWED_EVENT, type DoctorReviewedEvent } from './admin-doctors.events';
import type { DoctorReviewDto, ListDoctorsQueryDto } from './dto/admin-doctors.dto';

type DoctorProfileWithUser = DoctorProfile & { user: { id: string; email: string; status: User['status'] } };

/**
 * Response shapes, typed with Prisma's enums (not `@doksabahay/shared`'s
 * zod-inferred ones — see the matching note in `admin-users.service.ts`).
 */
export interface AdminDoctorSummaryDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title: string;
  verificationStatus: VerificationStatus;
  accountStatus: AccountStatus;
  createdAt: string;
}

export interface AdminDoctorDetailDto {
  id: string;
  email: string;
  accountStatus: AccountStatus;
  firstName: string;
  lastName: string;
  title: string;
  bio: string;
  yearsExperience: number;
  licenseNumber: string;
  languages: string[];
  consultationMinutes: ConsultationMinutes;
  timezone: string;
  verificationStatus: VerificationStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  specializations: { specializationId: string; name: string; slug: string; isPrimary: boolean }[];
}

export interface PaginatedAdminDoctorsDto {
  items: AdminDoctorSummaryDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

function toSummary(row: DoctorProfileWithUser): AdminDoctorSummaryDto {
  return {
    id: row.userId,
    email: row.user.email,
    firstName: row.firstName,
    lastName: row.lastName,
    title: row.title,
    verificationStatus: row.verificationStatus,
    accountStatus: row.user.status,
    createdAt: row.createdAt.toISOString(),
  };
}

type Tx = Prisma.TransactionClient;

/** Snapshot of the profile fields an audit entry documents (never the sensitive user row). */
interface ProfileSnapshot {
  title: string;
  bio: string;
  yearsExperience: number;
  licenseNumber: string;
  languages: string[];
  consultationMinutes: number;
  timezone: string;
}

function toProfileSnapshot(profile: DoctorProfile): ProfileSnapshot {
  return {
    title: profile.title,
    bio: profile.bio,
    yearsExperience: profile.yearsExperience,
    licenseNumber: profile.licenseNumber,
    languages: profile.languages,
    consultationMinutes: profile.consultationMinutes,
    timezone: profile.timezone,
  };
}

const USER_SELECT = { select: { id: true, email: true, status: true } } satisfies {
  select: Prisma.UserSelect;
};

/**
 * Admin doctor-profile review and direct editing. `:id` throughout is the
 * doctor's `User.id` (matching how every other doctor-facing endpoint
 * identifies a doctor), not `DoctorProfile.id`.
 */
@Injectable()
export class AdminDoctorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  /** Lists doctor profiles, newest first. */
  async list(query: ListDoctorsQueryDto): Promise<PaginatedAdminDoctorsDto> {
    const page = query.page ?? 1;
    const pageSize = ADMIN_DOCTORS_PAGE_SIZE;
    const q = query.q?.trim();

    const where: Prisma.DoctorProfileWhereInput = {
      ...(query.verificationStatus && { verificationStatus: query.verificationStatus }),
      ...(q && {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, totalCount] = await Promise.all([
      this.prisma.doctorProfile.findMany({
        where,
        include: { user: USER_SELECT },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.doctorProfile.count({ where }),
    ]);

    return { items: items.map(toSummary), page, pageSize, totalCount };
  }

  /**
   * @throws AdminDoctorNotFoundException if `id` has no `DoctorProfile`.
   */
  async getById(id: string): Promise<AdminDoctorDetailDto> {
    return this.toDetail(this.prisma, id);
  }

  /**
   * Sets `verificationStatus`/`reviewNote`/`reviewedById`/`reviewedAt` and
   * notifies the doctor.
   *
   * @throws AdminDoctorNotFoundException if `id` has no `DoctorProfile`.
   */
  async review(
    actor: AuthUser,
    id: string,
    dto: DoctorReviewDto,
    ipAddress?: string,
  ): Promise<AdminDoctorDetailDto> {
    const decision =
      dto.decision === 'APPROVED' ? VerificationStatus.APPROVED : VerificationStatus.REJECTED;
    const note = dto.note?.trim() || null;

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.doctorProfile.findUnique({ where: { userId: id } });
      if (!current) {
        throw new AdminDoctorNotFoundException();
      }
      const before = { verificationStatus: current.verificationStatus, reviewNote: current.reviewNote };
      await tx.doctorProfile.update({
        where: { userId: id },
        data: {
          verificationStatus: decision,
          reviewNote: note,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
      });
      await this.audit.record(tx, {
        actorId: actor.id,
        action: AUDIT_ACTIONS.DOCTOR_REVIEWED,
        entityType: AUDIT_ENTITY_TYPES.DOCTOR_PROFILE,
        entityId: id,
        before,
        after: { verificationStatus: decision, reviewNote: note },
        reason: note,
        ipAddress,
      });
    });

    this.events.emit(DOCTOR_REVIEWED_EVENT, {
      doctorId: id,
      decision,
      note,
      actorId: actor.id,
    } satisfies DoctorReviewedEvent);

    return this.getById(id);
  }

  /**
   * Admin edit of a doctor's profile fields and specializations. Unlike a
   * doctor editing their own profile, this never resets `verificationStatus`
   * to PENDING — an admin's own edit is authoritative.
   *
   * @throws AdminDoctorNotFoundException if `id` has no `DoctorProfile`.
   * @throws InvalidSpecializationSelectionException / UnknownSpecializationException, see
   *   `DoctorProfileService.updateMyProfile`.
   */
  async updateProfile(
    actor: AuthUser,
    id: string,
    dto: UpdateDoctorProfileDto,
    ipAddress?: string,
  ): Promise<AdminDoctorDetailDto> {
    validateSpecializationSelection(dto.specializations);

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.doctorProfile.findUnique({ where: { userId: id } });
      if (!current) {
        throw new AdminDoctorNotFoundException();
      }

      const specializationIds = dto.specializations.map((s) => s.specializationId);
      const existing = await tx.specialization.findMany({
        where: { id: { in: specializationIds } },
        select: { id: true },
      });
      if (existing.length !== new Set(specializationIds).size) {
        throw new UnknownSpecializationException();
      }

      const before = toProfileSnapshot(current);
      await tx.doctorProfile.update({
        where: { userId: id },
        data: {
          title: dto.title,
          bio: dto.bio,
          yearsExperience: dto.yearsExperience,
          licenseNumber: dto.licenseNumber,
          languages: dto.languages,
          consultationMinutes: dto.consultationMinutes,
          timezone: dto.timezone,
        },
      });
      await tx.doctorSpecialization.deleteMany({ where: { doctorId: id } });
      await tx.doctorSpecialization.createMany({
        data: dto.specializations.map((s) => ({
          doctorId: id,
          specializationId: s.specializationId,
          isPrimary: s.isPrimary,
        })),
      });

      const after: ProfileSnapshot = {
        title: dto.title,
        bio: dto.bio,
        yearsExperience: dto.yearsExperience,
        licenseNumber: dto.licenseNumber,
        languages: dto.languages,
        consultationMinutes: dto.consultationMinutes,
        timezone: dto.timezone,
      };
      await this.audit.record(tx, {
        actorId: actor.id,
        action: AUDIT_ACTIONS.DOCTOR_PROFILE_UPDATED,
        entityType: AUDIT_ENTITY_TYPES.DOCTOR_PROFILE,
        entityId: id,
        before,
        after,
        ipAddress,
      });
    });

    return this.getById(id);
  }

  private async toDetail(client: Tx | PrismaService, id: string): Promise<AdminDoctorDetailDto> {
    const profile = await client.doctorProfile.findUnique({
      where: { userId: id },
      include: { user: USER_SELECT },
    });
    if (!profile) {
      throw new AdminDoctorNotFoundException();
    }
    const specializations = await client.doctorSpecialization.findMany({
      where: { doctorId: id },
      select: {
        specializationId: true,
        isPrimary: true,
        specialization: { select: { name: true, slug: true } },
      },
      orderBy: [{ isPrimary: 'desc' }],
    });

    return {
      id: profile.userId,
      email: profile.user.email,
      accountStatus: profile.user.status,
      firstName: profile.firstName,
      lastName: profile.lastName,
      title: profile.title,
      bio: profile.bio,
      yearsExperience: profile.yearsExperience,
      licenseNumber: profile.licenseNumber,
      languages: profile.languages,
      // Stored as a plain Int; only 15/30/45/60 are ever written (validated by the profile DTO).
      consultationMinutes: profile.consultationMinutes as ConsultationMinutes,
      timezone: profile.timezone,
      verificationStatus: profile.verificationStatus,
      reviewNote: profile.reviewNote,
      reviewedAt: profile.reviewedAt ? profile.reviewedAt.toISOString() : null,
      specializations: specializations.map((s) => ({
        specializationId: s.specializationId,
        name: s.specialization.name,
        slug: s.specialization.slug,
        isPrimary: s.isPrimary,
      })),
    };
  }
}
