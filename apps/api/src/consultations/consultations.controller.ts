import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ConsultationsService } from './consultations.service';
import type { ConsultationResponseDto } from './dto/consultation-response.dto';

/** Text/data-only consultation workspace: state machine + patient summary, no audio/video. */
@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultations: ConsultationsService) {}

  @Get(':appointmentId')
  @Roles(Role.PATIENT, Role.DOCTOR)
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ): Promise<ConsultationResponseDto> {
    return this.consultations.getOne(user, appointmentId);
  }

  @Post(':appointmentId/join')
  @Roles(Role.PATIENT, Role.DOCTOR)
  join(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ): Promise<ConsultationResponseDto> {
    return this.consultations.join(user, appointmentId);
  }

  @Post(':appointmentId/start')
  @Roles(Role.DOCTOR)
  start(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ): Promise<ConsultationResponseDto> {
    return this.consultations.start(user, appointmentId);
  }

  @Post(':appointmentId/complete')
  @Roles(Role.DOCTOR)
  complete(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ): Promise<ConsultationResponseDto> {
    return this.consultations.complete(user, appointmentId);
  }

  /**
   * Not in the original four-endpoint list — added because the no-show rule
   * (see `ConsultationsService.reportNoShow`) needs some doctor-triggered
   * entry point, and reusing `POST /appointments/:id/cancel` isn't possible:
   * that route rejects any cancellation once `startAt` has passed.
   */
  @Post(':appointmentId/no-show')
  @Roles(Role.DOCTOR)
  reportNoShow(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ): Promise<ConsultationResponseDto> {
    return this.consultations.reportNoShow(user, appointmentId);
  }
}
