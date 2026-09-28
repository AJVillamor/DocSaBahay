import type { VerificationStatus } from '@prisma/client';

/**
 * Event name a doctor review is emitted under. Must stay in sync with
 * `NotificationsListener`'s `@OnEvent('doctor.reviewed')` stub.
 */
export const DOCTOR_REVIEWED_EVENT = 'doctor.reviewed';

/** Emitted after `AdminDoctorsService.review` commits a decision. */
export interface DoctorReviewedEvent {
  doctorId: string;
  decision: VerificationStatus;
  note: string | null;
  actorId: string;
}
