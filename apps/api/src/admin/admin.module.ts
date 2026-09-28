import { Module } from '@nestjs/common';

import { AdminAppointmentsModule } from './appointments/admin-appointments.module';
import { AdminDoctorsModule } from './doctors/admin-doctors.module';
import { AdminDashboardModule } from './dashboard/admin-dashboard.module';
import { AuditModule } from './audit/audit.module';
import { AdminSpecializationsModule } from './specializations/admin-specializations.module';
import { AdminUsersModule } from './users/admin-users.module';

/**
 * Admin-only tools: user management, doctor-profile review, specialization
 * catalog CRUD, appointment oversight (listing, detail, forced cancel/
 * invalidate, issue detection), the operational dashboard, and the
 * append-only audit log every mutation writes to.
 */
@Module({
  imports: [
    AuditModule,
    AdminUsersModule,
    AdminDoctorsModule,
    AdminSpecializationsModule,
    AdminAppointmentsModule,
    AdminDashboardModule,
  ],
})
export class AdminModule {}
