import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { ConsultationNoteResponseDto } from './dto/note-response.dto';
import type { PrescriptionListDto, PrescriptionResponseDto } from './dto/prescription-response.dto';
import { UpsertConsultationNoteDto } from './dto/upsert-note.dto';
import { UpsertPrescriptionDto } from './dto/upsert-prescription.dto';
import { NotesService } from './notes.service';
import { PrescriptionsService } from './prescriptions.service';

/**
 * Clinical-record writes, doctor-only, nested under the same
 * `/consultations/:appointmentId` prefix as `ConsultationsController` (see
 * that controller's own note on why the shared prefix doesn't collide: every
 * route here ends in `/note`, `/note/finalize` or `/prescriptions`, none of
 * which exist over there).
 */
@Controller('consultations')
@Roles(Role.DOCTOR)
export class ConsultationRecordsController {
  constructor(
    private readonly notes: NotesService,
    private readonly prescriptions: PrescriptionsService,
  ) {}

  @Get(':appointmentId/note')
  getNote(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ): Promise<ConsultationNoteResponseDto | null> {
    return this.notes.getForAppointment(user, appointmentId);
  }

  @Put(':appointmentId/note')
  upsertNote(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() dto: UpsertConsultationNoteDto,
  ): Promise<ConsultationNoteResponseDto> {
    return this.notes.upsert(user, appointmentId, dto);
  }

  @Post(':appointmentId/note/finalize')
  finalizeNote(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ): Promise<ConsultationNoteResponseDto> {
    return this.notes.finalize(user, appointmentId);
  }

  @Get(':appointmentId/prescriptions')
  listPrescriptions(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ): Promise<PrescriptionListDto> {
    return this.prescriptions.listForAppointment(user, appointmentId);
  }

  // Nest route decorators overwrite (not accumulate) a handler's metadata, so
  // POST and PUT need two thin methods — both simply delegate to the same
  // upsert, per the spec's "POST/PUT ... upsert as DRAFT" wording.
  @Post(':appointmentId/prescriptions')
  createOrUpdatePrescription(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() dto: UpsertPrescriptionDto,
  ): Promise<PrescriptionResponseDto> {
    return this.prescriptions.upsert(user, appointmentId, dto);
  }

  @Put(':appointmentId/prescriptions')
  upsertPrescription(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() dto: UpsertPrescriptionDto,
  ): Promise<PrescriptionResponseDto> {
    return this.prescriptions.upsert(user, appointmentId, dto);
  }
}
