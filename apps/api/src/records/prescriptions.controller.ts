import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { PrescriptionResponseDto } from './dto/prescription-response.dto';
import { PrescriptionsService } from './prescriptions.service';

@Controller('prescriptions')
@Roles(Role.PATIENT, Role.DOCTOR)
export class PrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionsService) {}

  @Get(':id')
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PrescriptionResponseDto> {
    return this.prescriptions.getOne(user, id);
  }

  @Post(':id/issue')
  @Roles(Role.DOCTOR)
  issue(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PrescriptionResponseDto> {
    return this.prescriptions.issue(user, id);
  }
}
