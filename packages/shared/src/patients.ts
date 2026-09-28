import { z } from 'zod';

/** Optional leading `+`, digits/spaces/hyphens, 7–20 characters. Mirrors the API. */
export const PHONE_PATTERN = /^\+?[0-9\s-]{7,20}$/;

export const NAME_MAX_LENGTH = 60;
export const CITY_COUNTRY_MAX_LENGTH = 100;
export const EMERGENCY_CONTACT_NAME_MAX_LENGTH = 100;
export const EMERGENCY_CONTACT_PHONE_MAX_LENGTH = 20;
export const MEDICAL_NOTES_MAX_LENGTH = 2000;
export const MIN_WEIGHT_KG = 1;
export const MAX_WEIGHT_KG = 400;
export const MIN_HEIGHT_CM = 30;
export const MAX_HEIGHT_CM = 250;
/** Implied age must stay under this many years. */
export const MAX_AGE_YEARS = 120;

/**
 * Whole years between an ISO `YYYY-MM-DD` date and `today`, using local
 * calendar fields (no time-of-day math). Returns `NaN` for a malformed date.
 * Shared so the onboarding/profile forms and the birth-date validation agree.
 */
export function calculateAge(isoDate: string, today: Date = new Date()): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match || !match[1] || !match[2] || !match[3]) {
    return NaN;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  let age = today.getFullYear() - year;
  const hadBirthdayThisYear =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hadBirthdayThisYear) {
    age -= 1;
  }
  return age;
}

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** ISO `YYYY-MM-DD` strings compare lexicographically in calendar order. */
function isPastIsoDate(value: string): boolean {
  const today = new Date();
  const todayIso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  return value < todayIso;
}

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `Enter ${label}.`).max(max, `Use at most ${max} characters.`);

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(max, `Use at most ${max} characters.`).optional(),
  );

const numberField = (min: number, max: number, label: string, rangeMessage: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}.`)
    .refine((value) => Number.isFinite(Number(value)), 'Enter a valid number.')
    .transform((value) => Number(value))
    .pipe(z.number().min(min, rangeMessage).max(max, rangeMessage));

export const birthDateSchema = z
  .string()
  .min(1, 'Enter your date of birth.')
  .refine(isValidIsoDate, 'Enter a valid date.')
  .refine(isPastIsoDate, 'Date of birth must be in the past.')
  .refine((value) => calculateAge(value) < MAX_AGE_YEARS, 'Enter a realistic date of birth.');

const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Enter your phone number.')
  .regex(PHONE_PATTERN, 'Enter a valid phone number, e.g. +63 917 123 4567.');

const optionalPhoneSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z
    .string()
    .trim()
    .max(
      EMERGENCY_CONTACT_PHONE_MAX_LENGTH,
      `Use at most ${EMERGENCY_CONTACT_PHONE_MAX_LENGTH} characters.`,
    )
    .regex(PHONE_PATTERN, 'Enter a valid phone number, e.g. +63 917 123 4567.')
    .optional(),
);

/** Shape shared by the onboarding wizard and the profile edit form. */
export const patientProfileSchema = z.object({
  firstName: requiredText('your first name', NAME_MAX_LENGTH),
  lastName: requiredText('your last name', NAME_MAX_LENGTH),
  birthDate: birthDateSchema,
  weightKg: numberField(
    MIN_WEIGHT_KG,
    MAX_WEIGHT_KG,
    'your weight',
    `Weight must be between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg.`,
  ),
  heightCm: numberField(
    MIN_HEIGHT_CM,
    MAX_HEIGHT_CM,
    'your height',
    `Height must be between ${MIN_HEIGHT_CM} and ${MAX_HEIGHT_CM} cm.`,
  ),
  phone: phoneSchema,
  city: requiredText('your city', CITY_COUNTRY_MAX_LENGTH),
  country: requiredText('your country', CITY_COUNTRY_MAX_LENGTH),
  emergencyContactName: optionalText(EMERGENCY_CONTACT_NAME_MAX_LENGTH),
  emergencyContactPhone: optionalPhoneSchema,
  allergies: optionalText(MEDICAL_NOTES_MAX_LENGTH),
  chronicConditions: optionalText(MEDICAL_NOTES_MAX_LENGTH),
  currentMedications: optionalText(MEDICAL_NOTES_MAX_LENGTH),
  pastSurgeries: optionalText(MEDICAL_NOTES_MAX_LENGTH),
});

/** Validated, submit-ready values (numbers coerced, blanks normalized). Sent to the API. */
export type PatientProfileInput = z.infer<typeof patientProfileSchema>;

/** Raw form field values (all strings) before validation. Use for `useForm` default values. */
export type PatientProfileFormValues = z.input<typeof patientProfileSchema>;

/** Response body of `GET`/`PUT /patients/me/profile`. */
export const patientProfileResponseSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  birthDate: z.string(),
  weightKg: z.number(),
  heightCm: z.number(),
  phone: z.string(),
  city: z.string(),
  country: z.string(),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhone: z.string().nullable(),
  allergies: z.string().nullable(),
  chronicConditions: z.string().nullable(),
  currentMedications: z.string().nullable(),
  pastSurgeries: z.string().nullable(),
  profileCompleted: z.boolean(),
});

export type PatientProfile = z.infer<typeof patientProfileResponseSchema>;
