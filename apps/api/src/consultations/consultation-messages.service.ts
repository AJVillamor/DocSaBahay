import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConsultationMessage, Role } from '@prisma/client';

import { AppointmentNotFoundException } from '../appointments/appointments.exceptions';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { ConsultationsService } from './consultations.service';
import { CONSULTATION_MESSAGE_SENT_EVENT, type ConsultationMessageSentEvent } from './consultations.events';
import type { ConsultationMessageResponseDto } from './dto/consultation-message-response.dto';
import type { SendConsultationMessageDto } from './dto/send-consultation-message.dto';

/**
 * Chat scoped to one consultation, gated entirely through
 * `ConsultationsService.assertMessagingReadable`/`assertMessagingWritable` so
 * this never duplicates the session-state machine. Never logs message
 * content (see `ConsultationMessage`'s schema comment), matching this
 * project's rule for clinical note content.
 */
@Injectable()
export class ConsultationMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consultations: ConsultationsService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Full chat history for one appointment, oldest first.
   *
   * @throws AppointmentNotFoundException (404) for an unknown appointment or a non-participant.
   * @throws ConsultationUnavailableException if the session hasn't started yet.
   */
  async list(caller: AuthUser, appointmentId: string): Promise<ConsultationMessageResponseDto[]> {
    await this.loadParticipantAppointment(caller, appointmentId);
    await this.consultations.assertMessagingReadable(appointmentId);
    const rows = await this.prisma.consultationMessage.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toResponse);
  }

  /**
   * Persists a message, then emits {@link CONSULTATION_MESSAGE_SENT_EVENT} for
   * `NotificationsGateway` to broadcast to the consultation's socket room.
   *
   * @throws AppointmentNotFoundException (404) for an unknown appointment or a non-participant.
   * @throws ConsultationUnavailableException if the session isn't `IN_PROGRESS`.
   */
  async send(
    caller: AuthUser,
    appointmentId: string,
    dto: SendConsultationMessageDto,
  ): Promise<ConsultationMessageResponseDto> {
    await this.loadParticipantAppointment(caller, appointmentId);
    await this.consultations.assertMessagingWritable(appointmentId);

    const row = await this.prisma.consultationMessage.create({
      data: { appointmentId, senderId: caller.id, body: dto.body },
    });
    const response = toResponse(row);
    this.events.emit(CONSULTATION_MESSAGE_SENT_EVENT, {
      appointmentId,
      message: response,
    } satisfies ConsultationMessageSentEvent);
    return response;
  }

  /** 404s for a non-participant, matching `ConsultationsService`'s own privacy rule. */
  private async loadParticipantAppointment(
    caller: AuthUser,
    appointmentId: string,
  ): Promise<{ patientId: string; doctorId: string }> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { patientId: true, doctorId: true },
    });
    const isParticipant =
      !!appointment &&
      ((caller.role === Role.PATIENT && appointment.patientId === caller.id) ||
        (caller.role === Role.DOCTOR && appointment.doctorId === caller.id));
    if (!appointment || !isParticipant) {
      throw new AppointmentNotFoundException();
    }
    return appointment;
  }
}

function toResponse(row: ConsultationMessage): ConsultationMessageResponseDto {
  return {
    id: row.id,
    appointmentId: row.appointmentId,
    senderId: row.senderId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}
