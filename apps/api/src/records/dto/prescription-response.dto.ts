import type { PrescriptionStatus } from '@prisma/client';

/** One medication row, as returned. */
export class PrescriptionItemResponseDto {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

/**
 * Response body wherever a `Prescription` is returned. Structurally mirrors
 * `@doksabahay/shared`'s `prescriptionSchema` but is typed with
 * `@prisma/client`'s `PrescriptionStatus` rather than the shared package's —
 * see `ConsultationResponseDto`'s doc comment for why.
 */
export class PrescriptionResponseDto {
  id: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  status: PrescriptionStatus;
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: PrescriptionItemResponseDto[];
}

/** Response body of `GET /consultations/:appointmentId/prescriptions`. */
export class PrescriptionListDto {
  items: PrescriptionResponseDto[];
}
