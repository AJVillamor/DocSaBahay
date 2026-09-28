import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { ACCESS_COOKIE, type AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiErrorDto } from '../common/errors/api-error.dto';
import { ProfileCompletedGuard } from '../patients/guards/profile-completed.guard';
import { AppointmentsService } from './appointments.service';
import { AppointmentListQueryDto } from './dto/appointment-query.dto';
import { AppointmentResponseDto, PaginatedAppointmentsDto } from './dto/appointment-response.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@ApiTags('appointments')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @Roles(Role.PATIENT)
  @UseGuards(ProfileCompletedGuard)
  @ApiOperation({ summary: 'Book an appointment with a doctor' })
  @ApiCreatedResponse({ type: AppointmentResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_FAILED' })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'PROFILE_INCOMPLETE' })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'NOT_FOUND (doctor not bookable)' })
  @ApiConflictResponse({
    type: ApiErrorDto,
    description: 'SLOT_TAKEN | PATIENT_OVERLAP | TOO_MANY_UPCOMING_APPOINTMENTS',
  })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointments.create(user.id, dto);
  }

  @Patch(':id/reschedule')
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: 'Reschedule an appointment the signed-in patient owns' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_FAILED' })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'NOT_FOUND' })
  @ApiConflictResponse({
    type: ApiErrorDto,
    description: 'SLOT_TAKEN | PATIENT_OVERLAP | RESCHEDULE_WINDOW_CLOSED | STALE_VERSION | CONFLICT',
  })
  reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointments.reschedule(user.id, id, dto);
  }

  @Post(':id/cancel')
  @Roles(Role.PATIENT, Role.DOCTOR)
  @ApiOperation({ summary: 'Cancel an appointment (patient owner or doctor owner)' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_FAILED (missing doctor reason)' })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'NOT_FOUND' })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'CONFLICT' })
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointments.cancel(user, id, dto);
  }

  @Get()
  @Roles(Role.PATIENT, Role.DOCTOR)
  @ApiOperation({ summary: "List the caller's own appointments" })
  @ApiOkResponse({ type: PaginatedAppointmentsDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_FAILED' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: AppointmentListQueryDto,
  ): Promise<PaginatedAppointmentsDto> {
    return this.appointments.list(user, query);
  }

  @Get(':id')
  @Roles(Role.PATIENT, Role.DOCTOR)
  @ApiOperation({ summary: 'Get one appointment (participants only)' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'NOT_FOUND (also for a non-participant)' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppointmentResponseDto> {
    return this.appointments.getOne(user, id);
  }
}
