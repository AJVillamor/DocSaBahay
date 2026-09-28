import { Injectable } from '@nestjs/common';
import type { PatientProfile } from '@prisma/client';
import { DateTime } from 'luxon';

import { PrismaService } from '../prisma/prisma.service';
import { PatientProfileDto, UpsertPatientProfileDto } from './dto/patient-profile.dto';
import { PatientProfileNotFoundException } from './patients.exceptions';

/**
 * A profile counts as complete once every field that gates booking is
 * present. Medical history and emergency-contact fields are optional and
 * never gate completion. Computed here, never trusted from the client.
 */
function isProfileComplete(dto: UpsertPatientProfileDto): boolean {
  return Boolean(
    dto.firstName.trim() &&
    dto.lastName.trim() &&
    dto.birthDate &&
    dto.weightKg != null &&
    dto.heightCm != null &&
    dto.phone.trim() &&
    dto.city.trim() &&
    dto.country.trim(),
  );
}

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the caller's patient profile.
   *
   * @throws PatientProfileNotFoundException if the patient has not saved a profile yet.
   */
  async getMyProfile(userId: string): Promise<PatientProfileDto> {
    const profile = await this.prisma.patientProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new PatientProfileNotFoundException();
    }
    return this.toDto(profile);
  }

  /**
   * Creates the caller's patient profile on the first call and updates it on
   * every later call (a full replace of every field in `dto`).
   */
  async upsertMyProfile(userId: string, dto: UpsertPatientProfileDto): Promise<PatientProfileDto> {
    const data = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      birthDate: DateTime.fromISO(dto.birthDate, { zone: 'utc' }).toJSDate(),
      weightKg: dto.weightKg,
      heightCm: dto.heightCm,
      phone: dto.phone,
      city: dto.city,
      country: dto.country,
      emergencyContactName: dto.emergencyContactName ?? null,
      emergencyContactPhone: dto.emergencyContactPhone ?? null,
      allergies: dto.allergies ?? null,
      chronicConditions: dto.chronicConditions ?? null,
      currentMedications: dto.currentMedications ?? null,
      pastSurgeries: dto.pastSurgeries ?? null,
      profileCompleted: isProfileComplete(dto),
    };

    const profile = await this.prisma.patientProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return this.toDto(profile);
  }

  private toDto(profile: PatientProfile): PatientProfileDto {
    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      birthDate: DateTime.fromJSDate(profile.birthDate, { zone: 'utc' }).toISODate() ?? '',
      weightKg: profile.weightKg.toNumber(),
      heightCm: profile.heightCm.toNumber(),
      phone: profile.phone,
      city: profile.city,
      country: profile.country,
      emergencyContactName: profile.emergencyContactName,
      emergencyContactPhone: profile.emergencyContactPhone,
      allergies: profile.allergies,
      chronicConditions: profile.chronicConditions,
      currentMedications: profile.currentMedications,
      pastSurgeries: profile.pastSurgeries,
      profileCompleted: profile.profileCompleted,
    };
  }
}
