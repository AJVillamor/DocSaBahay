import { Injectable } from '@nestjs/common';
import { NoteStatus, Prisma, PrescriptionStatus } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import type { PatientRecordsTimelineDto, RecordEntryDto } from './dto/record-entry.dto';
import { RecordsAccessPolicy } from './records-access.policy';
import { PatientRecordsNotFoundException } from './records.exceptions';
import { toNoteResponse, toPrescriptionResponse } from './records.mappers';

/** Everything one timeline entry needs: the two participants, the note, and only the ISSUED prescriptions. */
const TIMELINE_INCLUDE = {
  patient: {
    select: { id: true, patientProfile: { select: { firstName: true, lastName: true } } },
  },
  doctor: {
    select: { id: true, doctorProfile: { select: { firstName: true, lastName: true, title: true } } },
  },
  note: true,
  prescriptions: {
    where: { status: PrescriptionStatus.ISSUED },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.AppointmentInclude;

type TimelineRow = Prisma.AppointmentGetPayload<{ include: typeof TIMELINE_INCLUDE }>;

/**
 * Builds a patient's records timeline — past consultations with a FINALIZED
 * note and/or ISSUED prescriptions — reused by both `GET /records/me` (the
 * patient's own view) and `GET /patients/:id/records` (a treating doctor's
 * view of a patient), so the same server-side shape backs the same web
 * display component either way.
 */
@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: RecordsAccessPolicy,
  ) {}

  /** The caller's own timeline. Never gated — a patient always sees their own finalized records. */
  async getMyTimeline(patientId: string): Promise<PatientRecordsTimelineDto> {
    return this.buildTimeline(patientId);
  }

  /**
   * A treating doctor's view of one patient's timeline.
   *
   * @throws PatientRecordsNotFoundException (404) unless `caller` has ≥1 SCHEDULED/COMPLETED appointment with `patientId`.
   */
  async getPatientTimelineForDoctor(caller: AuthUser, patientId: string): Promise<PatientRecordsTimelineDto> {
    if (!(await this.policy.doctorTreatsPatient(caller.id, patientId))) {
      throw new PatientRecordsNotFoundException();
    }
    return this.buildTimeline(patientId);
  }

  private async buildTimeline(patientId: string): Promise<PatientRecordsTimelineDto> {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        patientId,
        OR: [
          { note: { is: { status: NoteStatus.FINALIZED } } },
          { prescriptions: { some: { status: PrescriptionStatus.ISSUED } } },
        ],
      },
      orderBy: { startAt: 'desc' },
      include: TIMELINE_INCLUDE,
    });

    return { items: appointments.map((appointment) => this.toEntry(appointment)) };
  }

  private toEntry(appointment: TimelineRow): RecordEntryDto {
    return {
      appointmentId: appointment.id,
      startAt: appointment.startAt.toISOString(),
      endAt: appointment.endAt.toISOString(),
      reasonForVisit: appointment.reasonForVisit,
      doctor: {
        id: appointment.doctor.id,
        firstName: appointment.doctor.doctorProfile?.firstName ?? '',
        lastName: appointment.doctor.doctorProfile?.lastName ?? '',
        title: appointment.doctor.doctorProfile?.title ?? '',
      },
      patient: {
        id: appointment.patient.id,
        firstName: appointment.patient.patientProfile?.firstName ?? '',
        lastName: appointment.patient.patientProfile?.lastName ?? '',
      },
      // Guards against the OR branch that matched purely on an ISSUED prescription while the note is still a DRAFT.
      note: appointment.note?.status === NoteStatus.FINALIZED ? toNoteResponse(appointment.note) : null,
      prescriptions: appointment.prescriptions.map((prescription) => toPrescriptionResponse(prescription)),
    };
  }
}
