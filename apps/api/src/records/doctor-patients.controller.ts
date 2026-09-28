import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DoctorPatientsService } from './doctor-patients.service';
import { DoctorPatientListDto, DoctorPatientsQueryDto } from './dto/doctor-patients.dto';

/** `GET /doctors/me/patients` — 3 segments, so it cannot collide with `DoctorDiscoveryController`'s `doctors`/`doctors/:id`. */
@Controller('doctors/me/patients')
@Roles(Role.DOCTOR)
export class DoctorPatientsController {
  constructor(private readonly doctorPatients: DoctorPatientsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: DoctorPatientsQueryDto,
  ): Promise<DoctorPatientListDto> {
    return this.doctorPatients.list(user.id, query.search);
  }
}
