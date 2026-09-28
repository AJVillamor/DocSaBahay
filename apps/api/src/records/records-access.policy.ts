import { Injectable } from '@nestjs/common';
import { AppointmentStatus, NoteStatus, PrescriptionStatus, Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

/** Minimal shape `canViewNote`/`canViewPrescription` need — either the Prisma row or a DTO works. */
interface OwnedRecord {
  doctorId: string;
  patientId: string;
}

/**
 * The single place every record-reading endpoint routes authorization
 * through (notes, prescriptions, patient timelines). Rules, per the spec:
 *
 * - `PATIENT`: only their own **FINALIZED** notes / **ISSUED** prescriptions.
 *   Never a draft, under any circumstance.
 * - `DOCTOR`: their own note/prescription at any status, or another
 *   doctor's **FINALIZED** note (or **ISSUED** prescription) — but only for
 *   a patient they treat (>=1 `SCHEDULED` or `COMPLETED` appointment with
 *   them). A doctor never sees another doctor's draft.
 * - `ADMIN`: never reaches this policy — every records-content route is
 *   `@Roles(PATIENT, DOCTOR)` only, so `RolesGuard` already 403s an admin
 *   before a controller method runs.
 */
@Injectable()
export class RecordsAccessPolicy {
  constructor(private readonly prisma: PrismaService) {}

  /** Whether `doctorId` has at least one `SCHEDULED` or `COMPLETED` appointment with `patientId`. */
  async doctorTreatsPatient(doctorId: string, patientId: string): Promise<boolean> {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId,
        patientId,
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED] },
      },
      select: { id: true },
    });
    return appointment !== null;
  }

  /** @returns Whether `caller` may view a note owned by `note.doctorId`/`note.patientId` in `note.status`. */
  async canViewNote(caller: AuthUser, note: OwnedRecord & { status: NoteStatus }): Promise<boolean> {
    if (caller.role === Role.PATIENT) {
      return note.patientId === caller.id && note.status === NoteStatus.FINALIZED;
    }
    if (caller.role !== Role.DOCTOR) {
      return false;
    }
    if (note.doctorId === caller.id) {
      return true;
    }
    return note.status === NoteStatus.FINALIZED && this.doctorTreatsPatient(caller.id, note.patientId);
  }

  /** Same rules as {@link canViewNote}, for prescriptions (`ISSUED` instead of `FINALIZED`). */
  async canViewPrescription(
    caller: AuthUser,
    prescription: OwnedRecord & { status: PrescriptionStatus },
  ): Promise<boolean> {
    if (caller.role === Role.PATIENT) {
      return prescription.patientId === caller.id && prescription.status === PrescriptionStatus.ISSUED;
    }
    if (caller.role !== Role.DOCTOR) {
      return false;
    }
    if (prescription.doctorId === caller.id) {
      return true;
    }
    return (
      prescription.status === PrescriptionStatus.ISSUED &&
      this.doctorTreatsPatient(caller.id, prescription.patientId)
    );
  }
}
