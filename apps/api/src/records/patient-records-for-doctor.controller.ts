import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { PatientRecordsTimelineDto } from './dto/record-entry.dto';
import { RecordsService } from './records.service';

/**
 * `GET /patients/:id/records`, doctor-only. Registered separately from the
 * patient-facing `PatientsController` (`patients/me/profile`, also under
 * `/patients`) — routes don't collide since `me/profile` and `:id/records`
 * are different literal/segment shapes, the same reasoning `DoctorProfileController`
 * already documents for `doctors/me/profile` vs `doctors/:id`.
 */
@Controller('patients')
@Roles(Role.DOCTOR)
export class PatientRecordsForDoctorController {
  constructor(private readonly records: RecordsService) {}

  @Get(':id/records')
  getPatientTimeline(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PatientRecordsTimelineDto> {
    return this.records.getPatientTimelineForDoctor(user, id);
  }
}
