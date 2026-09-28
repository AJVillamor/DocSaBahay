import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { ApiErrorDto } from '../common/errors/api-error.dto';
import { ACCESS_COOKIE, type AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PatientProfileDto, UpsertPatientProfileDto } from './dto/patient-profile.dto';
import { PatientsService } from './patients.service';

@ApiTags('patients')
@ApiCookieAuth(ACCESS_COOKIE)
@Roles(Role.PATIENT)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get('me/profile')
  @ApiOperation({ summary: "Get the caller's patient profile" })
  @ApiOkResponse({ type: PatientProfileDto })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'FORBIDDEN (not a patient)' })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'NOT_FOUND (no profile saved yet)' })
  getMyProfile(@CurrentUser() user: AuthUser): Promise<PatientProfileDto> {
    return this.patients.getMyProfile(user.id);
  }

  @Put('me/profile')
  @ApiOperation({
    summary: "Create or update the caller's patient profile",
    description: 'Creates the profile on the first call, updates it on every later call.',
  })
  @ApiOkResponse({ type: PatientProfileDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_FAILED' })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'FORBIDDEN (not a patient)' })
  upsertMyProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertPatientProfileDto,
  ): Promise<PatientProfileDto> {
    return this.patients.upsertMyProfile(user.id, dto);
  }
}
