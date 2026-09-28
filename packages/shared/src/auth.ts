import { z } from 'zod';

import { AccountStatus, Role, VerificationStatus } from './enums';

/** Names of the httpOnly auth cookies set by the API. */
export const AUTH_COOKIES = { access: 'access_token', refresh: 'refresh_token' } as const;

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
/** 10–128 characters with at least one letter and one digit. */
export const PASSWORD_PATTERN = new RegExp(
  `^(?=[\\s\\S]*\\p{L})(?=[\\s\\S]*\\d)[\\s\\S]{${PASSWORD_MIN_LENGTH},${PASSWORD_MAX_LENGTH}}$`,
  'u',
);
export const PASSWORD_POLICY_MESSAGE = `Password must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters and include a letter and a number.`;

/** Password policy for new accounts. Mirrors the API's class-validator rules. */
export const passwordSchema = z.string().regex(PASSWORD_PATTERN, PASSWORD_POLICY_MESSAGE);

/** Response body of `GET /auth/me` (also returned by register and login). */
export const meResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  role: z.enum(Role),
  status: z.enum(AccountStatus),
  profile: z.object({ firstName: z.string(), lastName: z.string() }).nullable(),
  /** Doctors only. */
  verificationStatus: z.enum(VerificationStatus).optional(),
  /** Doctors only: the admin's note from the last review, if any. */
  reviewNote: z.string().nullable().optional(),
  /** Patients only. */
  profileCompleted: z.boolean().optional(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;

const emailField = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .pipe(z.email('Enter a valid email address.'));

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `Enter your ${label}.`).max(max, `Use at most ${max} characters.`);

/** Body of `POST /auth/login`. */
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password.'),
});

/** Body of `POST /auth/register/patient`. */
export const registerPatientSchema = z.object({
  email: emailField,
  password: passwordSchema,
});

/** Body of `POST /auth/register/doctor`. */
export const registerDoctorSchema = registerPatientSchema.extend({
  firstName: requiredText('first name', 100),
  lastName: requiredText('last name', 100),
  primarySpecializationId: z.uuid('Choose a specialization.'),
  licenseNumber: requiredText('license number', 50),
  bio: z.string().trim().max(2000, 'Use at most 2000 characters.').optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;
export type RegisterDoctorInput = z.infer<typeof registerDoctorSchema>;
