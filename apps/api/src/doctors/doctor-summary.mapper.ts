import type { DoctorListItemDto } from './dto/doctor-discovery.dto';

/** The `select` shape both discovery and matching queries fetch a doctor row with. */
export const DOCTOR_SUMMARY_SELECT = {
  id: true,
  doctorProfile: {
    select: {
      firstName: true,
      lastName: true,
      title: true,
      yearsExperience: true,
      languages: true,
    },
  },
  doctorSpecializations: {
    select: {
      specializationId: true,
      isPrimary: true,
      specialization: { select: { name: true, slug: true } },
    },
  },
} as const;

/** A doctor row shaped by {@link DOCTOR_SUMMARY_SELECT}, with `doctorProfile` guaranteed present. */
export interface DoctorSummaryRow {
  id: string;
  doctorProfile: {
    firstName: string;
    lastName: string;
    title: string;
    yearsExperience: number;
    languages: string[];
  } | null;
  doctorSpecializations: {
    specializationId: string;
    isPrimary: boolean;
    specialization: { name: string; slug: string };
  }[];
}

/**
 * Maps a doctor row (fetched with {@link DOCTOR_SUMMARY_SELECT}) plus its
 * already-computed `nextAvailableSlot` to the response shape shared by
 * `GET /doctors` and `POST /matching/suggest`.
 *
 * @throws Error if `row.doctorProfile` is null — callers must only pass rows
 *   already filtered to doctors with a profile (APPROVED + ACTIVE).
 */
export function toDoctorListItemDto(
  row: DoctorSummaryRow,
  nextAvailableSlot: string | null,
): DoctorListItemDto {
  if (!row.doctorProfile) {
    throw new Error('toDoctorListItemDto: doctor has no profile.');
  }
  const { firstName, lastName, title, yearsExperience, languages } = row.doctorProfile;
  return {
    id: row.id,
    firstName,
    lastName,
    title,
    yearsExperience,
    languages,
    specializations: row.doctorSpecializations.map((s) => ({
      specializationId: s.specializationId,
      name: s.specialization.name,
      slug: s.specialization.slug,
      isPrimary: s.isPrimary,
    })),
    nextAvailableSlot,
  };
}

/**
 * Sorts doctors by `nextAvailableSlot` ascending (doctors with no available
 * slot last), then by last name ascending. Shared by `GET /doctors` (default
 * list order) and `POST /matching/suggest` (per-specialization doctor lists).
 */
export function compareByNextAvailableThenLastName(
  a: DoctorListItemDto,
  b: DoctorListItemDto,
): number {
  if (a.nextAvailableSlot !== b.nextAvailableSlot) {
    if (a.nextAvailableSlot === null) return 1;
    if (b.nextAvailableSlot === null) return -1;
    return a.nextAvailableSlot < b.nextAvailableSlot ? -1 : 1;
  }
  return a.lastName.localeCompare(b.lastName);
}
