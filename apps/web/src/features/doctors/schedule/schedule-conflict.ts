import {
  ErrorCode,
  scheduleConflictDetailsSchema,
  type AffectedAppointment,
} from '@doksabahay/shared';

import type { ApiError } from '@/lib/api';

/**
 * Extracts the affected appointments from a `SCHEDULE_CONFLICT` error's
 * `details`, or `null` if `error` is not that error (or the payload does
 * not match the expected shape).
 */
export function affectedAppointmentsFrom(error: ApiError): AffectedAppointment[] | null {
  if (error.code !== ErrorCode.SCHEDULE_CONFLICT) {
    return null;
  }
  const parsed = scheduleConflictDetailsSchema.safeParse(error.details);
  return parsed.success ? parsed.data.appointments : null;
}
