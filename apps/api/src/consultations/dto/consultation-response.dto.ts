import type { ConsultationPatientSummary } from '@doksabahay/shared';
import type { AppointmentStatus, SessionState } from '@prisma/client';

/**
 * Response shape of every `/consultations/:appointmentId*` endpoint.
 * Structurally mirrors `@doksabahay/shared`'s `consultationSessionSchema`
 * (which the web app parses the JSON response against) but is typed with
 * `@prisma/client`'s enums rather than the shared package's — the same split
 * `AppointmentResponseDto` already uses, since a Prisma enum value can't be
 * assigned to the shared package's structurally-identical-but-nominally-
 * distinct `enum` type. `ConsultationPatientSummary` has no enum fields, so
 * it's safe to reuse directly.
 */
export interface ConsultationResponseDto {
  id: string;
  appointmentId: string;
  state: SessionState;
  patientJoinedAt: string | null;
  doctorJoinedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  appointment: {
    id: string;
    startAt: string;
    endAt: string;
    status: AppointmentStatus;
    reasonForVisit: string;
    patient: { id: string; firstName: string; lastName: string };
    doctor: {
      id: string;
      firstName: string;
      lastName: string;
      title: string;
      specializations: { name: string }[];
    };
  };
  /** Only present when the caller is the doctor on this consultation. */
  patientSummary: ConsultationPatientSummary | null;
}
