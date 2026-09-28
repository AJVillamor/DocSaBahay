import { Injectable } from '@nestjs/common';
import type { ConsultationMinutes } from '@doksabahay/shared';
import { Prisma, VerificationStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { DoctorProfileResponseDto, UpdateDoctorProfileDto } from './dto/doctor-profile.dto';
import {
  DoctorProfileNotFoundException,
  InvalidSpecializationSelectionException,
  UnknownSpecializationException,
} from './doctors.exceptions';

/** The reviewer's note set when an approved profile is reset to PENDING by an edit. */
const RESET_REVIEW_NOTE = 'Profile changed: specializations/license updated';

type Tx = Prisma.TransactionClient;

@Injectable()
export class DoctorProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the signed-in doctor's own profile.
   *
   * @throws DoctorProfileNotFoundException if the caller has no `DoctorProfile` row.
   */
  async getMyProfile(userId: string): Promise<DoctorProfileResponseDto> {
    return this.toResponse(this.prisma, userId);
  }

  /**
   * Updates the signed-in doctor's profile and replaces their specialization
   * selection. Runs in a transaction: validation, the profile update and the
   * specialization replace all succeed or fail together.
   *
   * If the profile is currently APPROVED and this update changes the
   * specialization selection or `licenseNumber`, `verificationStatus` is
   * atomically reset to PENDING (with `reviewNote` explaining why, and the
   * previous review cleared) — editing only bio/languages/title/years/
   * consultationMinutes/timezone never triggers this.
   *
   * @throws DoctorProfileNotFoundException if the caller has no `DoctorProfile` row.
   * @throws InvalidSpecializationSelectionException if the selection is not
   *   exactly 1 primary + up to 2 secondary, or repeats a specialization.
   * @throws UnknownSpecializationException if a specialization id does not exist.
   */
  async updateMyProfile(
    userId: string,
    dto: UpdateDoctorProfileDto,
  ): Promise<DoctorProfileResponseDto> {
    validateSpecializationSelection(dto.specializations);

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.doctorProfile.findUnique({ where: { userId } });
      if (!current) {
        throw new DoctorProfileNotFoundException();
      }

      const specializationIds = dto.specializations.map((s) => s.specializationId);
      const existing = await tx.specialization.findMany({
        where: { id: { in: specializationIds } },
        select: { id: true },
      });
      if (existing.length !== new Set(specializationIds).size) {
        throw new UnknownSpecializationException();
      }

      const currentSpecializations = await tx.doctorSpecialization.findMany({
        where: { doctorId: userId },
        select: { specializationId: true, isPrimary: true },
      });
      const specializationsChanged = !sameSpecializationSelection(
        currentSpecializations,
        dto.specializations,
      );
      const licenseChanged = current.licenseNumber !== dto.licenseNumber;
      const shouldResetVerification =
        current.verificationStatus === VerificationStatus.APPROVED &&
        (specializationsChanged || licenseChanged);

      await tx.doctorProfile.update({
        where: { userId },
        data: {
          title: dto.title,
          bio: dto.bio,
          yearsExperience: dto.yearsExperience,
          licenseNumber: dto.licenseNumber,
          languages: dto.languages,
          consultationMinutes: dto.consultationMinutes,
          timezone: dto.timezone,
          ...(shouldResetVerification && {
            verificationStatus: VerificationStatus.PENDING,
            reviewNote: RESET_REVIEW_NOTE,
            reviewedById: null,
            reviewedAt: null,
          }),
        },
      });

      if (specializationsChanged) {
        await tx.doctorSpecialization.deleteMany({ where: { doctorId: userId } });
        await tx.doctorSpecialization.createMany({
          data: dto.specializations.map((s) => ({
            doctorId: userId,
            specializationId: s.specializationId,
            isPrimary: s.isPrimary,
          })),
        });
      }

      return this.toResponse(tx, userId);
    });
  }

  private async toResponse(
    client: Tx | PrismaService,
    userId: string,
  ): Promise<DoctorProfileResponseDto> {
    const profile = await client.doctorProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new DoctorProfileNotFoundException();
    }
    const specializations = await client.doctorSpecialization.findMany({
      where: { doctorId: userId },
      select: {
        specializationId: true,
        isPrimary: true,
        specialization: { select: { name: true, slug: true } },
      },
      orderBy: [{ isPrimary: 'desc' }],
    });

    return {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      title: profile.title,
      bio: profile.bio,
      yearsExperience: profile.yearsExperience,
      licenseNumber: profile.licenseNumber,
      languages: profile.languages,
      // Stored as a plain Int; only 15/30/45/60 are ever written (validated by the DTO).
      consultationMinutes: profile.consultationMinutes as ConsultationMinutes,
      timezone: profile.timezone,
      verificationStatus: profile.verificationStatus,
      reviewNote: profile.reviewNote,
      specializations: specializations.map((s) => ({
        specializationId: s.specializationId,
        name: s.specialization.name,
        slug: s.specialization.slug,
        isPrimary: s.isPrimary,
      })),
    };
  }
}

/**
 * @throws InvalidSpecializationSelectionException unless the selection is
 *   exactly 1 primary and at most 2 secondary specializations.
 */
function validateSpecializationSelection(
  specializations: { specializationId: string; isPrimary: boolean }[],
): void {
  const primaryCount = specializations.filter((s) => s.isPrimary).length;
  if (primaryCount !== 1) {
    throw new InvalidSpecializationSelectionException('Choose exactly one primary specialization.');
  }
  if (specializations.length > 3) {
    throw new InvalidSpecializationSelectionException(
      'Choose at most 1 primary and 2 secondary specializations.',
    );
  }
  const ids = specializations.map((s) => s.specializationId);
  if (new Set(ids).size !== ids.length) {
    throw new InvalidSpecializationSelectionException(
      'Each specialization can only be chosen once.',
    );
  }
}

/** True when both selections contain the same {specializationId, isPrimary} pairs, order-independent. */
function sameSpecializationSelection(
  a: { specializationId: string; isPrimary: boolean }[],
  b: { specializationId: string; isPrimary: boolean }[],
): boolean {
  if (a.length !== b.length) return false;
  const key = (s: { specializationId: string; isPrimary: boolean }) =>
    `${s.specializationId}:${s.isPrimary}`;
  const setA = new Set(a.map(key));
  const setB = new Set(b.map(key));
  return setA.size === setB.size && [...setA].every((k) => setB.has(k));
}
