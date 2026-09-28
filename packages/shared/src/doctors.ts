import { z } from 'zod';

import { VerificationStatus } from './enums';

/** Allowed consultation lengths. Mirrors the API's class-validator `@IsIn`. */
export const CONSULTATION_MINUTES_OPTIONS = [15, 30, 45, 60] as const;
export type ConsultationMinutes = (typeof CONSULTATION_MINUTES_OPTIONS)[number];

export const consultationMinutesSchema = z.union(
  CONSULTATION_MINUTES_OPTIONS.map((value) => z.literal(value)),
);

/**
 * A curated list for the timezone picker. The API accepts any valid IANA
 * zone (validated with Luxon), so this is a UI convenience, not the source
 * of truth for what is allowed.
 */
export const TIMEZONE_OPTIONS = [
  'Asia/Manila',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Jakarta',
  'Asia/Bangkok',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Sao_Paulo',
  'Pacific/Auckland',
  'UTC',
] as const;

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `Enter ${label}.`).max(max, `Use at most ${max} characters.`);

/** One entry of a doctor profile's specialization selection. */
export const doctorSpecializationSelectionSchema = z.object({
  specializationId: z.uuid(),
  isPrimary: z.boolean(),
});

/** Exactly one primary and up to two secondary specializations. */
export const doctorSpecializationsSchema = z
  .array(doctorSpecializationSelectionSchema)
  .min(1, 'Choose a primary specialization.')
  .max(3, 'Choose at most 1 primary and 2 secondary specializations.')
  .superRefine((specializations, ctx) => {
    const primaryCount = specializations.filter((s) => s.isPrimary).length;
    if (primaryCount !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Choose exactly one primary specialization.',
      });
    }
    const ids = specializations.map((s) => s.specializationId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', message: 'Each specialization can only be chosen once.' });
    }
  });

/** Body of `PUT /doctors/me/profile`. */
export const updateDoctorProfileSchema = z.object({
  title: requiredText('a title', 100),
  bio: z.string().trim().max(2000, 'Use at most 2000 characters.'),
  yearsExperience: z
    .number()
    .int('Enter a whole number.')
    .min(0, 'Must be 0 or more.')
    .max(70, 'Must be 70 or less.'),
  licenseNumber: requiredText('a license number', 50),
  languages: z.array(requiredText('a language', 50)).max(20, 'Use at most 20 languages.'),
  consultationMinutes: consultationMinutesSchema,
  timezone: z.string().trim().min(1, 'Choose a timezone.'),
  specializations: doctorSpecializationsSchema,
});

export type UpdateDoctorProfileInput = z.infer<typeof updateDoctorProfileSchema>;

/** One specialization on a doctor's profile, as returned by the API. */
export const doctorProfileSpecializationSchema = z.object({
  specializationId: z.uuid(),
  name: z.string(),
  slug: z.string(),
  isPrimary: z.boolean(),
});

/** Response body of `GET /doctors/me/profile` and `PUT /doctors/me/profile`. */
export const doctorProfileSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  title: z.string(),
  bio: z.string(),
  yearsExperience: z.number().int(),
  licenseNumber: z.string(),
  languages: z.array(z.string()),
  consultationMinutes: consultationMinutesSchema,
  timezone: z.string(),
  verificationStatus: z.enum(VerificationStatus),
  reviewNote: z.string().nullable(),
  specializations: z.array(doctorProfileSpecializationSchema),
});

export type DoctorProfile = z.infer<typeof doctorProfileSchema>;

/** "HH:mm", 24-hour, matching the DB's `CHECK` constraint. */
const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm, e.g. 09:00.');

/** Body of `POST /doctors/me/availability/rules`. */
export const createAvailabilityRuleSchema = z.object({
  dayOfWeek: z
    .number()
    .int()
    .min(0, '0 (Sunday) to 6 (Saturday).')
    .max(6, '0 (Sunday) to 6 (Saturday).'),
  startTime: hhmmSchema,
  endTime: hhmmSchema,
});

/** Body of `PATCH /doctors/me/availability/rules/:id`. */
export const updateAvailabilityRuleSchema = createAvailabilityRuleSchema.partial();

export type CreateAvailabilityRuleInput = z.infer<typeof createAvailabilityRuleSchema>;
export type UpdateAvailabilityRuleInput = z.infer<typeof updateAvailabilityRuleSchema>;

/** One weekly recurring availability rule, as returned by the API. */
export const availabilityRuleSchema = z.object({
  id: z.uuid(),
  dayOfWeek: z.number().int(),
  startTime: z.string(),
  endTime: z.string(),
});

export type AvailabilityRule = z.infer<typeof availabilityRuleSchema>;

/** Body of `POST /doctors/me/availability/exceptions`. */
export const createAvailabilityExceptionSchema = z
  .object({
    startAt: z.iso.datetime({ message: 'Enter a valid date and time.' }),
    endAt: z.iso.datetime({ message: 'Enter a valid date and time.' }),
    reason: z.string().trim().max(500, 'Use at most 500 characters.').optional(),
  })
  .refine((value) => new Date(value.endAt) > new Date(value.startAt), {
    message: 'End must be after start.',
    path: ['endAt'],
  });

/** Body of `PATCH /doctors/me/availability/exceptions/:id`. */
export const updateAvailabilityExceptionSchema = z.object({
  startAt: z.iso.datetime({ message: 'Enter a valid date and time.' }).optional(),
  endAt: z.iso.datetime({ message: 'Enter a valid date and time.' }).optional(),
  reason: z.string().trim().max(500, 'Use at most 500 characters.').optional(),
});

export type CreateAvailabilityExceptionInput = z.infer<typeof createAvailabilityExceptionSchema>;
export type UpdateAvailabilityExceptionInput = z.infer<typeof updateAvailabilityExceptionSchema>;

/** One availability exception, as returned by the API. */
export const availabilityExceptionSchema = z.object({
  id: z.uuid(),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  reason: z.string().nullable(),
});

export type AvailabilityException = z.infer<typeof availabilityExceptionSchema>;

/** One free consultation slot, as returned by `GET /doctors/:id/slots`. */
export const slotSchema = z.object({
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
});

export const slotListSchema = z.array(slotSchema);

export type Slot = z.infer<typeof slotSchema>;
