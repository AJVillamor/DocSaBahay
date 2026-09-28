import { Module } from '@nestjs/common';

import { AppointmentsModule } from '../../appointments/appointments.module';
import { AuthModule } from '../../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

/**
 * Admin user search/detail/status-management. Imports `AuthModule` for
 * `AuthStateService`/`TokenService` (to kill sessions on a status change) and
 * `AppointmentsModule` for `AppointmentsService` (to cascade-cancel a
 * suspended/deactivated user's future appointments via its existing `cancel`
 * path, rather than duplicating that logic here).
 */
@Module({
  imports: [AuthModule, AppointmentsModule, AuditModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminUsersModule {}
