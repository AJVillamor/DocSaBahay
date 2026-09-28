import { Module } from '@nestjs/common';

import { DoctorsModule } from '../doctors/doctors.module';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';

/**
 * Symptom listing and deterministic specialization/doctor matching.
 * Imports `DoctorsModule` to reuse its exported `NextAvailableSlotService`
 * for the per-specialization doctor lists, rather than a second cache.
 */
@Module({
  imports: [DoctorsModule],
  controllers: [MatchingController],
  providers: [MatchingService],
})
export class MatchingModule {}
