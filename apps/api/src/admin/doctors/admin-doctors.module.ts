import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AdminDoctorsController } from './admin-doctors.controller';
import { AdminDoctorsService } from './admin-doctors.service';

/** Admin doctor-profile review and direct editing. */
@Module({
  imports: [AuditModule],
  controllers: [AdminDoctorsController],
  providers: [AdminDoctorsService],
})
export class AdminDoctorsModule {}
