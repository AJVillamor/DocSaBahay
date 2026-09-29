import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ConsultationMessagesService } from './consultation-messages.service';
import type { ConsultationMessageResponseDto } from './dto/consultation-message-response.dto';
import { SendConsultationMessageDto } from './dto/send-consultation-message.dto';

/** Chat scoped to one consultation. See `ConsultationMessagesService` for the state gating. */
@Controller('consultations')
@Roles(Role.PATIENT, Role.DOCTOR)
export class ConsultationMessagesController {
  constructor(private readonly messages: ConsultationMessagesService) {}

  @Get(':appointmentId/messages')
  list(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ): Promise<ConsultationMessageResponseDto[]> {
    return this.messages.list(user, appointmentId);
  }

  @Post(':appointmentId/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() dto: SendConsultationMessageDto,
  ): Promise<ConsultationMessageResponseDto> {
    return this.messages.send(user, appointmentId, dto);
  }
}
