import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AdminSpecializationsController } from './admin-specializations.controller';
import { AdminSpecializationsService } from './admin-specializations.service';

/** Full CRUD over the `Specialization` catalog, for admins. */
@Module({
  imports: [AuditModule],
  controllers: [AdminSpecializationsController],
  providers: [AdminSpecializationsService],
})
export class AdminSpecializationsModule {}
