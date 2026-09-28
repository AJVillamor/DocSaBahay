import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';

import type { AuthUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminAppointmentIssuesService, type AdminAppointmentIssueDto } from './admin-appointment-issues.service';
import {
  AdminAppointmentsService,
  type AdminAppointmentDetailDto,
  type PaginatedAdminAppointmentsDto,
} from './admin-appointments.service';
import type { AdminAppointmentSummaryDto } from './admin-appointments.mapper';
import { AdminAppointmentActionDto, ListAdminAppointmentsQueryDto } from './dto/admin-appointments.dto';

@Roles(Role.ADMIN)
@Controller('admin/appointments')
export class AdminAppointmentsController {
  constructor(
    private readonly appointments: AdminAppointmentsService,
    private readonly issues: AdminAppointmentIssuesService,
  ) {}

  // Declared before ':id' so "issues" is never captured by the :id param.
  @Get('issues')
  async listIssues(): Promise<{ items: AdminAppointmentIssueDto[] }> {
    return { items: await this.issues.detect() };
  }

  @Get()
  list(@Query() query: ListAdminAppointmentsQueryDto): Promise<PaginatedAdminAppointmentsDto> {
    return this.appointments.list(query);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<AdminAppointmentDetailDto> {
    return this.appointments.getById(id);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminAppointmentActionDto,
    @Req() request: Request,
  ): Promise<AdminAppointmentSummaryDto> {
    return this.appointments.cancel(actor, id, dto, request.ip);
  }

  @Post(':id/invalidate')
  invalidate(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminAppointmentActionDto,
    @Req() request: Request,
  ): Promise<AdminAppointmentSummaryDto> {
    return this.appointments.invalidate(actor, id, dto, request.ip);
  }
}
