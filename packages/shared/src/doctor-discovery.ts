import { z } from 'zod';

import { consultationMinutesSchema, doctorProfileSpecializationSchema } from './doctors';

/**
 * One doctor as returned by `GET /doctors` and nested in matching results
 * (`POST /matching/suggest`).
 */
export const doctorListItemSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  title: z.string(),
  yearsExperience: z.number().int(),
  languages: z.array(z.string()),
  specializations: z.array(doctorProfileSpecializationSchema),
  /**
   * ISO instant of the doctor's earliest free slot within the next 14 days,
   * or `null` if none. Cached server-side for up to 60 seconds.
   */
  nextAvailableSlot: z.iso.datetime().nullable(),
});

export type DoctorListItem = z.infer<typeof doctorListItemSchema>;

/** Response body of `GET /doctors`. */
export const doctorListResponseSchema = z.object({
  items: z.array(doctorListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  hasMore: z.boolean(),
});

export type DoctorListResponse = z.infer<typeof doctorListResponseSchema>;

/**
 * Response body of `GET /doctors/:id`: a public-ish doctor profile.
 * Deliberately omits `licenseNumber` (not for patient eyes).
 */
export const doctorPublicProfileSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  title: z.string(),
  bio: z.string(),
  yearsExperience: z.number().int(),
  languages: z.array(z.string()),
  consultationMinutes: consultationMinutesSchema,
  specializations: z.array(doctorProfileSpecializationSchema),
});

export type DoctorPublicProfile = z.infer<typeof doctorPublicProfileSchema>;
