import type { ConsultationNote, Prescription, PrescriptionItem } from '@prisma/client';

import type { ConsultationNoteResponseDto } from './dto/note-response.dto';
import type { PrescriptionResponseDto } from './dto/prescription-response.dto';

/** Maps a Prisma `ConsultationNote` row to its API response shape. */
export function toNoteResponse(note: ConsultationNote): ConsultationNoteResponseDto {
  return {
    id: note.id,
    appointmentId: note.appointmentId,
    doctorId: note.doctorId,
    patientId: note.patientId,
    chiefComplaint: note.chiefComplaint,
    findings: note.findings,
    diagnosis: note.diagnosis,
    recommendations: note.recommendations,
    summary: note.summary,
    status: note.status,
    finalizedAt: note.finalizedAt ? note.finalizedAt.toISOString() : null,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

/** Maps a Prisma `Prescription` row (with its `items` included) to its API response shape. */
export function toPrescriptionResponse(
  prescription: Prescription & { items: PrescriptionItem[] },
): PrescriptionResponseDto {
  return {
    id: prescription.id,
    appointmentId: prescription.appointmentId,
    doctorId: prescription.doctorId,
    patientId: prescription.patientId,
    status: prescription.status,
    issuedAt: prescription.issuedAt ? prescription.issuedAt.toISOString() : null,
    createdAt: prescription.createdAt.toISOString(),
    updatedAt: prescription.updatedAt.toISOString(),
    items: prescription.items.map((item) => ({
      id: item.id,
      medicationName: item.medicationName,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions ?? undefined,
    })),
  };
}
