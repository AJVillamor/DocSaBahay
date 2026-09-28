import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsListener } from './notifications.listener';
import { NotificationsService } from './notifications.service';
import { RealtimeTokenController } from './realtime-token.controller';
import { RealtimeTokenService } from './realtime-token.service';
import { ReminderJob } from './reminder.job';

/**
 * Database-backed in-app notifications: `NotificationsService` (the only
 * writer of the `Notification` table), the `@OnEvent` listener that turns
 * appointment domain events into notifications, the `@Cron` reminder job,
 * the REST endpoints, and the change-hint-only WebSocket gateway plus its
 * short-lived-token issuing endpoint.
 *
 * Imports `AuthModule` to reuse its exported `JwtService`/secret for signing
 * and verifying realtime-gateway tokens (see `RealtimeTokenService` and
 * `NotificationsGateway`) instead of configuring a second `JwtModule`.
 * `ScheduleModule.forRoot()` is registered here (not in `AppModule`) since
 * `ReminderJob` is this module's only consumer of `@nestjs/schedule`.
 */
@Module({
  imports: [ScheduleModule.forRoot(), AuthModule],
  controllers: [NotificationsController, RealtimeTokenController],
  providers: [
    NotificationsService,
    NotificationsListener,
    NotificationsGateway,
    RealtimeTokenService,
    ReminderJob,
  ],
})
export class NotificationsModule {}
