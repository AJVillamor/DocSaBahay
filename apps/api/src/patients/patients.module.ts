import { Module } from '@nestjs/common';

import { ProfileCompletedGuard } from './guards/profile-completed.guard';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

/**
 * The patient-facing profile (onboarding + view/edit). Also provides
 * `ProfileCompletedGuard`, exported for other modules (e.g. a future
 * booking module) that need to require a completed profile.
 */
@Module({
  controllers: [PatientsController],
  providers: [PatientsService, ProfileCompletedGuard],
  exports: [PatientsService, ProfileCompletedGuard],
})
export class PatientsModule {}
