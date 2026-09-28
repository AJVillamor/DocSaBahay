import { Module } from '@nestjs/common';

import { DoctorsModule } from '../doctors/doctors.module';
import { PatientsModule } from '../patients/patients.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

/**
 * Appointment booking, rescheduling and cancellation. Imports `DoctorsModule`
 * to reuse its `SlotService` for validating a requested `startAt` against the
 * doctor's currently free slots, and `PatientsModule` to reuse its
 * `ProfileCompletedGuard`. Exports `AppointmentsService` so
 * `ConsultationsModule` can reuse `cancelForNoShow`, and so the admin users
 * module can reuse its `cancel` path when a suspended/deactivated user's
 * future appointments must be cancelled, instead of duplicating that logic.
 */
@Module({
  imports: [DoctorsModule, PatientsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
