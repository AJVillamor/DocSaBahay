import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Appointment, PrescriptionStatus, Role } from '@prisma/client';

import { AppointmentNotFoundException } from '../appointments/appointments.exceptions';
import type { AuthUser } from '../auth/auth.types';
import { ConsultationsService } from '../consultations/consultations.service';
import { PrismaService } from '../prisma/prisma.service';
import type { PrescriptionResponseDto } from './dto/prescription-response.dto';
import type { UpsertPrescriptionDto } from './dto/upsert-prescription.dto';
import { RecordsAccessPolicy } from './records-access.policy';
import { PrescriptionIssuedException, PrescriptionNotFoundException } from './records.exceptions';
import { RECORD_AVAILABLE_EVENT, type RecordAvailableEvent } from './records.events';
import { toPrescriptionResponse } from './records.mappers';

const PRESCRIPTION_WITH_ITEMS = { items: true } as const;

/**
 * Prescriptions authored by the doctor who owns the appointment. An
 * appointment may have several (`Prescription.appointmentId` is a plain
 * index, not unique) — `upsert` always targets the appointment's current
 * `DRAFT` prescription if one exists, or starts a new one otherwise, so a
 * doctor can issue one prescription and then start drafting another later
 * in the same consultation. Each `Prescription` owns 1–15 `PrescriptionItem`
 * rows, fully replaced (not merged) on every `upsert`.
 */
@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consultations: ConsultationsService,
    private readonly policy: RecordsAccessPolicy,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Upserts the appointment's current draft prescription, replacing its
   * items wholesale.
   *
   * @throws AppointmentNotFoundException (404) if `appointmentId` doesn't exist or `caller` isn't its doctor.
   * @throws ConsultationUnavailableException unless the session is IN_PROGRESS or COMPLETED.
   */
  async upsert(
    caller: AuthUser,
    appointmentId: string,
    dto: UpsertPrescriptionDto,
  ): Promise<PrescriptionResponseDto> {
    const appointment = await this.loadOwnedAppointment(caller, appointmentId);
    await this.consultations.assertRecordWritable(appointmentId);

    const draft = await this.prisma.prescription.findFirst({
      where: { appointmentId, status: PrescriptionStatus.DRAFT },
      orderBy: { createdAt: 'desc' },
    });

    const items = dto.items.map((item) => ({
      medicationName: item.medicationName,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions ?? null,
    }));

    const prescription = draft
      ? await this.prisma.prescription.update({
          where: { id: draft.id },
          data: { items: { deleteMany: {}, create: items } },
          include: PRESCRIPTION_WITH_ITEMS,
        })
      : await this.prisma.prescription.create({
          data: {
            appointmentId,
            doctorId: appointment.doctorId,
            patientId: appointment.patientId,
            items: { create: items },
          },
          include: PRESCRIPTION_WITH_ITEMS,
        });

    return toPrescriptionResponse(prescription);
  }

  /**
   * Issues a prescription (`DRAFT → ISSUED`), permanently read-only
   * afterward. Emits `RECORD_AVAILABLE_EVENT` for the patient.
   *
   * @throws PrescriptionNotFoundException (404) if it doesn't exist or `caller` isn't its doctor.
   * @throws PrescriptionIssuedException if already issued.
   * @throws ConsultationUnavailableException unless the session is IN_PROGRESS or COMPLETED.
   */
  async issue(caller: AuthUser, id: string): Promise<PrescriptionResponseDto> {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription || caller.role !== Role.DOCTOR || prescription.doctorId !== caller.id) {
      throw new PrescriptionNotFoundException();
    }
    if (prescription.status === PrescriptionStatus.ISSUED) {
      throw new PrescriptionIssuedException();
    }
    await this.consultations.assertRecordWritable(prescription.appointmentId);

    const issued = await this.prisma.prescription.update({
      where: { id },
      data: { status: PrescriptionStatus.ISSUED, issuedAt: new Date() },
      include: PRESCRIPTION_WITH_ITEMS,
    });

    this.events.emit(RECORD_AVAILABLE_EVENT, {
      kind: 'prescription',
      recordId: issued.id,
      appointmentId: issued.appointmentId,
      patientId: issued.patientId,
      doctorId: issued.doctorId,
    } satisfies RecordAvailableEvent);

    return toPrescriptionResponse(issued);
  }

  /**
   * Every prescription on the appointment (any status), oldest first. Backs
   * the workspace panel's initial load — including past ISSUED prescriptions
   * from earlier in the same consultation, alongside the current draft.
   *
   * @throws AppointmentNotFoundException (404) if `appointmentId` doesn't exist or `caller` isn't its doctor.
   */
  async listForAppointment(caller: AuthUser, appointmentId: string): Promise<{ items: PrescriptionResponseDto[] }> {
    await this.loadOwnedAppointment(caller, appointmentId);
    const prescriptions = await this.prisma.prescription.findMany({
      where: { appointmentId },
      include: PRESCRIPTION_WITH_ITEMS,
      orderBy: { createdAt: 'asc' },
    });
    return { items: prescriptions.map((prescription) => toPrescriptionResponse(prescription)) };
  }

  /**
   * Loads one prescription by id, gated by `RecordsAccessPolicy`.
   *
   * @throws PrescriptionNotFoundException (404) if it doesn't exist, or `caller` isn't authorized to view it.
   */
  async getOne(caller: AuthUser, id: string): Promise<PrescriptionResponseDto> {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: PRESCRIPTION_WITH_ITEMS,
    });
    if (!prescription || !(await this.policy.canViewPrescription(caller, prescription))) {
      throw new PrescriptionNotFoundException();
    }
    return toPrescriptionResponse(prescription);
  }

  /** Loads the appointment, 404ing (never 403 — hides existence) unless `caller` is its doctor. */
  private async loadOwnedAppointment(caller: AuthUser, appointmentId: string): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment || caller.role !== Role.DOCTOR || appointment.doctorId !== caller.id) {
      throw new AppointmentNotFoundException();
    }
    return appointment;
  }
}
