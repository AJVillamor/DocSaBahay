import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { ACCESS_COOKIE } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiErrorDto } from '../common/errors/api-error.dto';
import { DoctorDiscoveryService } from './doctor-discovery.service';
import {
  DoctorListQueryDto,
  DoctorListResponseDto,
  DoctorPublicProfileDto,
} from './dto/doctor-discovery.dto';

/**
 * Doctor discovery for patients (and admins): search/filter the list of
 * bookable doctors and view one doctor's public profile.
 *
 * Registered in `DoctorsModule` alongside `DoctorProfileController`
 * (`doctors/me/profile`, 3 segments) and `SlotsController`
 * (`doctors/:id/slots`, 3 segments) — this controller's routes are `doctors`
 * (list) and `doctors/:id` (1 and 2 segments), so they cannot collide with
 * either: Nest/Express match routes by segment shape, not registration
 * order, when the segment counts differ.
 */
@ApiTags('doctors')
@ApiCookieAuth(ACCESS_COOKIE)
@Roles(Role.PATIENT, Role.ADMIN)
@Controller('doctors')
export class DoctorDiscoveryController {
  constructor(private readonly discovery: DoctorDiscoveryService) {}

  @Get()
  @ApiOperation({ summary: 'Search bookable doctors (APPROVED + ACTIVE only)' })
  @ApiOkResponse({ type: DoctorListResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'FORBIDDEN' })
  list(@Query() query: DoctorListQueryDto): Promise<DoctorListResponseDto> {
    return this.discovery.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: "A doctor's public profile" })
  @ApiOkResponse({ type: DoctorPublicProfileDto })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'FORBIDDEN' })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'NOT_FOUND' })
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<DoctorPublicProfileDto> {
    return this.discovery.getById(id);
  }
}
