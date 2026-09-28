import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Appointment, NoteStatus, Role, SessionState } from '@prisma/client';

import { AppointmentNotFoundException } from '../appointments/appointments.exceptions';
import type { AuthUser } from '../auth/auth.types';
import { ConsultationUnavailableException } from '../consultations/consultations.exceptions';
import { ConsultationsService } from '../consultations/consultations.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ConsultationNoteResponseDto } from './dto/note-response.dto';
import type { UpsertConsultationNoteDto } from './dto/upsert-note.dto';
import { RecordsAccessPolicy } from './records-access.policy';
import { NoteFinalizedException, NoteIncompleteException, NoteNotFoundException } from './records.exceptions';
import { RECORD_AVAILABLE_EVENT, type RecordAvailableEvent } from './records.events';
import { toNoteResponse } from './records.mappers';

/**
 * Clinical note authored by the doctor who owns the appointment — one per
 * appointment (`ConsultationNote.appointmentId` is unique). Always upserted
 * as `DRAFT` (see `upsert`); `finalize` makes it permanently read-only.
 */
@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consultations: ConsultationsService,
    private readonly policy: RecordsAccessPolicy,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Upserts the appointment's note as `DRAFT`. Every field may be blank — the
   * doctor may still be mid-visit — this is the endpoint the web app's
   * autosave calls on every debounced keystroke.
   *
   * @throws AppointmentNotFoundException (404) if `appointmentId` doesn't exist or `caller` isn't its doctor.
   * @throws ConsultationUnavailableException unless the session is IN_PROGRESS or COMPLETED.
   * @throws NoteFinalizedException if the note was already finalized.
   */
  async upsert(
    caller: AuthUser,
    appointmentId: string,
    dto: UpsertConsultationNoteDto,
  ): Promise<ConsultationNoteResponseDto> {
    const appointment = await this.loadOwnedAppointment(caller, appointmentId);
    const existing = await this.prisma.consultationNote.findUnique({ where: { appointmentId } });
    if (existing?.status === NoteStatus.FINALIZED) {
      throw new NoteFinalizedException();
    }
    await this.consultations.assertRecordWritable(appointmentId);

    const data = {
      chiefComplaint: dto.chiefComplaint,
      findings: dto.findings,
      diagnosis: dto.diagnosis ?? null,
      recommendations: dto.recommendations,
      summary: dto.summary,
    };
    const note = await this.prisma.consultationNote.upsert({
      where: { appointmentId },
      create: {
        appointmentId,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
        ...data,
      },
      update: data,
    });
    return toNoteResponse(note);
  }

  /**
   * Finalizes the appointment's note (`DRAFT → FINALIZED`), permanently
   * read-only afterward. Emits `RECORD_AVAILABLE_EVENT` for the patient.
   *
   * @throws AppointmentNotFoundException (404) if `appointmentId` doesn't exist or `caller` isn't its doctor.
   * @throws ConsultationUnavailableException unless the session is exactly COMPLETED (stricter than `upsert`'s gate).
   * @throws NoteIncompleteException if no draft exists yet, or a required field is still blank.
   * @throws NoteFinalizedException if already finalized.
   */
  async finalize(caller: AuthUser, appointmentId: string): Promise<ConsultationNoteResponseDto> {
    await this.loadOwnedAppointment(caller, appointmentId);
    const session = await this.prisma.consultationSession.findUnique({ where: { appointmentId } });
    if (!session || session.state !== SessionState.COMPLETED) {
      throw new ConsultationUnavailableException(
        'The consultation must be completed before its note can be finalized.',
      );
    }
    const existing = await this.prisma.consultationNote.findUnique({ where: { appointmentId } });
    if (!existing) {
      throw new NoteIncompleteException();
    }
    if (existing.status === NoteStatus.FINALIZED) {
      throw new NoteFinalizedException();
    }
    const requiredFieldsFilled = [
      existing.chiefComplaint,
      existing.findings,
      existing.recommendations,
      existing.summary,
    ].every((value) => value.trim().length > 0);
    if (!requiredFieldsFilled) {
      throw new NoteIncompleteException();
    }

    const finalized = await this.prisma.consultationNote.update({
      where: { appointmentId },
      data: { status: NoteStatus.FINALIZED, finalizedAt: new Date() },
    });

    this.events.emit(RECORD_AVAILABLE_EVENT, {
      kind: 'note',
      recordId: finalized.id,
      appointmentId,
      patientId: finalized.patientId,
      doctorId: finalized.doctorId,
    } satisfies RecordAvailableEvent);

    return toNoteResponse(finalized);
  }

  /**
   * The appointment's current note (any status), or `null` if the doctor
   * hasn't saved a draft yet. Backs the workspace panel's initial load.
   *
   * @throws AppointmentNotFoundException (404) if `appointmentId` doesn't exist or `caller` isn't its doctor.
   */
  async getForAppointment(caller: AuthUser, appointmentId: string): Promise<ConsultationNoteResponseDto | null> {
    await this.loadOwnedAppointment(caller, appointmentId);
    const note = await this.prisma.consultationNote.findUnique({ where: { appointmentId } });
    return note ? toNoteResponse(note) : null;
  }

  /**
   * Loads one note by id, gated by `RecordsAccessPolicy`.
   *
   * @throws NoteNotFoundException (404) if it doesn't exist, or `caller` isn't authorized to view it.
   */
  async getOne(caller: AuthUser, id: string): Promise<ConsultationNoteResponseDto> {
    const note = await this.prisma.consultationNote.findUnique({ where: { id } });
    if (!note || !(await this.policy.canViewNote(caller, note))) {
      throw new NoteNotFoundException();
    }
    return toNoteResponse(note);
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
