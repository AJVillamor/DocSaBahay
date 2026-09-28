import { Module } from '@nestjs/common';

import { DoctorsModule } from '../../doctors/doctors.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { AdminAppointmentIssuesService } from './admin-appointment-issues.service';
import { AdminAppointmentsController } from './admin-appointments.controller';
import { AdminAppointmentsService } from './admin-appointments.service';

/**
 * Admin appointment oversight: listing, one appointment's detail/timeline,
 * forced cancel/invalidate, and the shared issue-detection service also
 * reused by `AdminDashboardModule`. Imports `DoctorsModule` to reuse
 * `SlotService` (availability re-check) and `NotificationsModule` to notify
 * both participants directly on a forced cancel/invalidate. Exports
 * `AdminAppointmentIssuesService` so the dashboard's open-issues count calls
 * the same detection instead of a second implementation.
 */
@Module({
  imports: [AuditModule, DoctorsModule, NotificationsModule],
  controllers: [AdminAppointmentsController],
  providers: [AdminAppointmentsService, AdminAppointmentIssuesService],
  exports: [AdminAppointmentIssuesService],
})
export class AdminAppointmentsModule {}
