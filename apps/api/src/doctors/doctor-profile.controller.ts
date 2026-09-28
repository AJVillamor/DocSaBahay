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

import { ACCESS_COOKIE, type AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiErrorDto } from '../common/errors/api-error.dto';
import { DoctorProfileService } from './doctor-profile.service';
import { DoctorProfileResponseDto, UpdateDoctorProfileDto } from './dto/doctor-profile.dto';

@ApiTags('doctors')
@ApiCookieAuth(ACCESS_COOKIE)
@Roles(Role.DOCTOR)
@Controller('doctors/me/profile')
export class DoctorProfileController {
  constructor(private readonly profile: DoctorProfileService) {}

  @Get()
  @ApiOperation({ summary: "Get the signed-in doctor's profile" })
  @ApiOkResponse({ type: DoctorProfileResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'FORBIDDEN (not a doctor)' })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'NOT_FOUND' })
  getMyProfile(@CurrentUser() user: AuthUser): Promise<DoctorProfileResponseDto> {
    return this.profile.getMyProfile(user.id);
  }

  @Put()
  @ApiOperation({ summary: "Update the signed-in doctor's profile" })
  @ApiOkResponse({ type: DoctorProfileResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_FAILED' })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'FORBIDDEN (not a doctor)' })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'NOT_FOUND' })
  updateMyProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateDoctorProfileDto,
  ): Promise<DoctorProfileResponseDto> {
    return this.profile.updateMyProfile(user.id, dto);
  }
}
