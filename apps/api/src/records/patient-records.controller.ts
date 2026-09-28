import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { PatientRecordsTimelineDto } from './dto/record-entry.dto';
import { RecordsService } from './records.service';

/** `GET /records/me`. `patients/:id/records` (the doctor-facing equivalent) lives in `PatientRecordsForDoctorController`. */
@Controller('records')
@Roles(Role.PATIENT)
export class PatientRecordsController {
  constructor(private readonly records: RecordsService) {}

  @Get('me')
  getMyTimeline(@CurrentUser() user: AuthUser): Promise<PatientRecordsTimelineDto> {
    return this.records.getMyTimeline(user.id);
  }
}
