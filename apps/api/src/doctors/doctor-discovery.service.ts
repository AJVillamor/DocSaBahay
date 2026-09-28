import { Injectable } from '@nestjs/common';
import type { ConsultationMinutes } from '@doksabahay/shared';
import { AccountStatus, Role, VerificationStatus } from '@prisma/client';
import { DateTime } from 'luxon';

import { PrismaService } from '../prisma/prisma.service';
import {
  compareByNextAvailableThenLastName,
  DOCTOR_SUMMARY_SELECT,
  toDoctorListItemDto,
} from './doctor-summary.mapper';
import { DoctorNotBookableException } from './doctors.exceptions';
import type {
  DoctorListQueryDto,
  DoctorListResponseDto,
  DoctorPublicProfileDto,
} from './dto/doctor-discovery.dto';
import { NextAvailableSlotService } from './next-available-slot.service';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class DoctorDiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nextAvailableSlot: NextAvailableSlotService,
  ) {}

  /**
   * Lists APPROVED + ACTIVE doctors matching the given filters, sorted by
   * `nextAvailableSlot` ascending (doctors with no slot in the next 14 days
   * last), then last name ascending, and paginated.
   *
   * `q`/`specializationId` are pushed down to the database query;
   * `language`/`availableWithinDays` and the sort itself require
   * `nextAvailableSlot`, which is not a database column, so they are applied
   * in memory over the (database-filtered) result set. This is a demo app
   * with a handful of seeded doctors, so that is deliberately not a
   * scalability concern.
   */
  async list(query: DoctorListQueryDto): Promise<DoctorListResponseDto> {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const rows = await this.prisma.user.findMany({
      where: {
        role: Role.DOCTOR,
        status: AccountStatus.ACTIVE,
        doctorProfile: {
          verificationStatus: VerificationStatus.APPROVED,
          ...(query.q && {
            OR: [
              { firstName: { contains: query.q, mode: 'insensitive' } },
              { lastName: { contains: query.q, mode: 'insensitive' } },
            ],
          }),
        },
        ...(query.specializationId && {
          doctorSpecializations: { some: { specializationId: query.specializationId } },
        }),
      },
      select: DOCTOR_SUMMARY_SELECT,
    });

    const nextSlots = await this.nextAvailableSlot.getMany(rows.map((r) => r.id));
    let items = rows.map((row) => toDoctorListItemDto(row, nextSlots.get(row.id) ?? null));

    if (query.language) {
      const wanted = query.language.toLowerCase();
      items = items.filter((doctor) => doctor.languages.some((l) => l.toLowerCase() === wanted));
    }

    if (query.availableWithinDays !== undefined) {
      const cutoff = DateTime.utc().plus({ days: query.availableWithinDays }).toJSDate();
      items = items.filter(
        (doctor) =>
          doctor.nextAvailableSlot !== null && new Date(doctor.nextAvailableSlot) <= cutoff,
      );
    }

    items.sort(compareByNextAvailableThenLastName);

    const total = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return { items: paged, total, page, pageSize, hasMore: start + paged.length < total };
  }

  /**
   * Returns a public-ish profile for one doctor.
   *
   * @throws DoctorNotBookableException (404) if the doctor does not exist,
   *   or is not `verificationStatus: APPROVED` and account `status: ACTIVE`
   *   — the same 404 either way so a caller cannot probe pending/rejected/
   *   inactive doctor ids.
   */
  async getById(id: string): Promise<DoctorPublicProfileDto> {
    const doctor = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        doctorProfile: {
          select: {
            firstName: true,
            lastName: true,
            title: true,
            bio: true,
            yearsExperience: true,
            languages: true,
            consultationMinutes: true,
            verificationStatus: true,
          },
        },
        doctorSpecializations: {
          select: {
            specializationId: true,
            isPrimary: true,
            specialization: { select: { name: true, slug: true } },
          },
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

    const { firstName, lastName, title, bio, yearsExperience, languages, consultationMinutes } =
      doctor.doctorProfile;

    return {
      id: doctor.id,
      firstName,
      lastName,
      title,
      bio,
      yearsExperience,
      languages,
      // Stored as a plain Int; only 15/30/45/60 are ever written (validated by the profile DTO).
      consultationMinutes: consultationMinutes as ConsultationMinutes,
      specializations: doctor.doctorSpecializations.map((s) => ({
        specializationId: s.specializationId,
        name: s.specialization.name,
        slug: s.specialization.slug,
        isPrimary: s.isPrimary,
      })),
    };
  }
}
