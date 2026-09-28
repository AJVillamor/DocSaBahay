import { z } from 'zod';

import { AccountStatus, Role, VerificationStatus } from './enums';

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
  /** Patients only. */
  profileCompleted: z.boolean().optional(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;
