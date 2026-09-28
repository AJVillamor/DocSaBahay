import type { NoteStatus } from '@prisma/client';

/**
 * Response body wherever a `ConsultationNote` is returned. Structurally
 * mirrors `@doksabahay/shared`'s `consultationNoteSchema` but is typed with
 * `@prisma/client`'s `NoteStatus` rather than the shared package's — see
 * `ConsultationResponseDto`'s doc comment for why.
 */
export class ConsultationNoteResponseDto {
  id: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  chiefComplaint: string;
  findings: string;
  diagnosis: string | null;
  recommendations: string;
  summary: string;
  status: NoteStatus;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
