import { z } from 'zod';

import { ErrorCode } from './enums';

/** One appointment affected by a SCHEDULE_CONFLICT error's `details.appointments`. */
export const affectedAppointmentSchema = z.object({
  id: z.uuid(),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
});

/** `details` payload of a SCHEDULE_CONFLICT error. */
export const scheduleConflictDetailsSchema = z.object({
  appointments: z.array(affectedAppointmentSchema),
});

export type AffectedAppointment = z.infer<typeof affectedAppointmentSchema>;
export type ScheduleConflictDetails = z.infer<typeof scheduleConflictDetailsSchema>;

/** JSON body of every API error response. `details` carries structured, error-specific extras. */
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  message: z.string(),
  code: z.enum(ErrorCode),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
