import { Module } from '@nestjs/common';

import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { DoctorDiscoveryController } from './doctor-discovery.controller';
import { DoctorDiscoveryService } from './doctor-discovery.service';
import { DoctorProfileController } from './doctor-profile.controller';
import { DoctorProfileService } from './doctor-profile.service';
import { NextAvailableSlotService } from './next-available-slot.service';
import { SlotService } from './slot.service';
import { SlotsController } from './slots.controller';

/**
 * Doctor profile editing, weekly availability / exceptions management,
 * doctor discovery, and the slot engine. `SlotService` and
 * `NextAvailableSlotService` are exported: a later booking module can inject
 * `SlotService` to validate a requested `startAt`, and `MatchingModule`
 * reuses `NextAvailableSlotService` for its per-specialization doctor lists
 * so the 60s cache is shared rather than duplicated.
 */
@Module({
  controllers: [
    DoctorProfileController,
    AvailabilityController,
    SlotsController,
    DoctorDiscoveryController,
  ],
  providers: [
    DoctorProfileService,
    AvailabilityService,
    SlotService,
    NextAvailableSlotService,
    DoctorDiscoveryService,
  ],
  exports: [SlotService, NextAvailableSlotService],
})
export class DoctorsModule {}
