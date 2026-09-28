import { Module } from '@nestjs/common';

import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { DoctorProfileController } from './doctor-profile.controller';
import { DoctorProfileService } from './doctor-profile.service';
import { SlotService } from './slot.service';
import { SlotsController } from './slots.controller';

/**
 * Doctor profile editing, weekly availability / exceptions management, and
 * the slot engine. `SlotService` is exported so a later booking module can
 * import `DoctorsModule` and inject it to validate a requested `startAt`
 * against the same free-slot computation.
 */
@Module({
  controllers: [DoctorProfileController, AvailabilityController, SlotsController],
  providers: [DoctorProfileService, AvailabilityService, SlotService],
  exports: [SlotService],
})
export class DoctorsModule {}
