import { Module } from '@nestjs/common';

import { DoctorsModule } from '../doctors/doctors.module';
import { PatientsModule } from '../patients/patients.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

/**
 * Appointment booking, rescheduling and cancellation. Imports `DoctorsModule`
 * to reuse its `SlotService` for validating a requested `startAt` against the
 * doctor's currently free slots, and `PatientsModule` to reuse its
 * `ProfileCompletedGuard`.
 */
@Module({
  imports: [DoctorsModule, PatientsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
