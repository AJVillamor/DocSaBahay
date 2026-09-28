import { Module } from '@nestjs/common';

import { DoctorsModule } from '../doctors/doctors.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { ProfileCompletedGuard } from './guards/profile-completed.guard';

/**
 * Appointment booking, rescheduling and cancellation. Imports `DoctorsModule`
 * to reuse its `SlotService` for validating a requested `startAt` against the
 * doctor's currently free slots.
 */
@Module({
  imports: [DoctorsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, ProfileCompletedGuard],
})
export class AppointmentsModule {}
