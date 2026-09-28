import { Module } from '@nestjs/common';

import { AdminAppointmentsModule } from '../appointments/admin-appointments.module';
import { AuditModule } from '../audit/audit.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

/**
 * Admin operational dashboard: one read-only `GET /admin/dashboard` endpoint
 * aggregating counts across users, doctors, appointments and sessions, plus
 * the open-issues count (via `AdminAppointmentsModule`'s exported
 * `AdminAppointmentIssuesService`, not a second detection) and the latest
 * audit entries (via `AuditService`).
 */
@Module({
  imports: [AuditModule, AdminAppointmentsModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminDashboardModule {}
