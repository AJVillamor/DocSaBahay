import { Injectable } from '@nestjs/common';
import { AccountStatus, Role, VerificationStatus } from '@prisma/client';

import {
  compareByNextAvailableThenLastName,
  DOCTOR_SUMMARY_SELECT,
  toDoctorListItemDto,
} from '../doctors/doctor-summary.mapper';
import type { DoctorListItemDto } from '../doctors/dto/doctor-discovery.dto';
import { NextAvailableSlotService } from '../doctors/next-available-slot.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  SuggestMatchDto,
  SuggestMatchResponseDto,
  SymptomsByCategoryDto,
} from './dto/matching.dto';
import { scoreMatch } from './matching-scoring';

/** Up to this many doctors are returned per suggested specialization. */
const DOCTORS_PER_SPECIALIZATION = 5;

/**
 * The exact name of the fallback specialization used when nothing scores
 * above 0. Matches `apps/api/prisma/seed-data/catalog.ts`'s
 * `SPECIALIZATIONS` entry with slug `general-practice`.
 */
const GENERAL_PRACTICE_NAME = 'General Practice';

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nextAvailableSlot: NextAvailableSlotService,
  ) {}

  /** Lists every `Symptom`, grouped by category, categories and symptoms ordered by name. */
  async listSymptoms(): Promise<SymptomsByCategoryDto[]> {
    const symptoms = await this.prisma.symptom.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, category: true, isRedFlag: true },
    });

    const byCategory = new Map<string, SymptomsByCategoryDto>();
    for (const symptom of symptoms) {
      const group = byCategory.get(symptom.category);
      if (group) {
        group.symptoms.push(symptom);
      } else {
        byCategory.set(symptom.category, { category: symptom.category, symptoms: [symptom] });
      }
    }
    return [...byCategory.values()];
  }

  /**
   * Scores specializations against the given symptoms/description (via the
   * pure {@link scoreMatch}), then looks up up to
   * {@link DOCTORS_PER_SPECIALIZATION} bookable doctors per suggested
   * specialization. The scoring/ranking is deterministic for a given input;
   * the doctors and their `nextAvailableSlot` are live data and may change
   * between calls.
   */
  async suggest(dto: SuggestMatchDto): Promise<SuggestMatchResponseDto> {
    const [symptoms, keywords, specializations, generalPractice] = await Promise.all([
      dto.symptomIds.length > 0
        ? this.prisma.symptom.findMany({
            where: { id: { in: dto.symptomIds } },
            select: {
              id: true,
              name: true,
              isRedFlag: true,
              specializationRules: { select: { specializationId: true, weight: true } },
            },
          })
        : Promise.resolve([]),
      this.prisma.matchingKeyword.findMany({
        select: { phrase: true, specializationId: true, weight: true, isRedFlag: true },
      }),
      this.prisma.specialization.findMany({ select: { id: true, name: true } }),
      this.prisma.specialization.findFirst({
        where: { name: GENERAL_PRACTICE_NAME },
        select: { id: true },
      }),
    ]);

    const result = scoreMatch({
      selectedSymptoms: symptoms.map((s) => ({
        id: s.id,
        name: s.name,
        isRedFlag: s.isRedFlag,
        rules: s.specializationRules,
      })),
      description: dto.description,
      keywords,
      specializations,
      generalPracticeSpecializationId: generalPractice?.id,
    });

    const specializationIds = result.specializations.map((s) => s.specializationId);
    const doctorsBySpecialization = await this.doctorsFor(specializationIds);

    return {
      urgent: result.urgent,
      results: result.specializations.map((s) => ({
        specializationId: s.specializationId,
        name: s.name,
        score: s.score,
        explanation: s.explanation,
        doctors: doctorsBySpecialization.get(s.specializationId) ?? [],
      })),
    };
  }

  /**
   * Looks up bookable (APPROVED + ACTIVE) doctors for each specialization
   * id, sorted by `nextAvailableSlot` ascending then last name (via the
   * shared {@link compareByNextAvailableThenLastName}), capped at
   * {@link DOCTORS_PER_SPECIALIZATION} each. One database query covers every
   * requested specialization; `nextAvailableSlot` reuses
   * `NextAvailableSlotService`'s cache, shared with doctor discovery.
   */
  private async doctorsFor(specializationIds: string[]): Promise<Map<string, DoctorListItemDto[]>> {
    const map = new Map<string, DoctorListItemDto[]>();
    if (specializationIds.length === 0) return map;

    const rows = await this.prisma.user.findMany({
      where: {
        role: Role.DOCTOR,
        status: AccountStatus.ACTIVE,
        doctorProfile: { verificationStatus: VerificationStatus.APPROVED },
        doctorSpecializations: { some: { specializationId: { in: specializationIds } } },
      },
      select: DOCTOR_SUMMARY_SELECT,
    });

    const nextSlots = await this.nextAvailableSlot.getMany(rows.map((r) => r.id));
    const entries = rows.map((row) => ({
      specializationIds: row.doctorSpecializations.map((ds) => ds.specializationId),
      dto: toDoctorListItemDto(row, nextSlots.get(row.id) ?? null),
    }));

    for (const specializationId of specializationIds) {
      const matching = entries
        .filter((entry) => entry.specializationIds.includes(specializationId))
        .map((entry) => entry.dto)
        .sort(compareByNextAvailableThenLastName)
        .slice(0, DOCTORS_PER_SPECIALIZATION);
      map.set(specializationId, matching);
    }
    return map;
  }
}
