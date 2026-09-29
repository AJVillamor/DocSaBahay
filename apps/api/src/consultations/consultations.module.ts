import { Module } from '@nestjs/common';

import { AppointmentsModule } from '../appointments/appointments.module';
import { ConsultationMessagesController } from './consultation-messages.controller';
import { ConsultationMessagesService } from './consultation-messages.service';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';

/**
 * The consultation session workspace: the `ConsultationSession` state
 * machine (`SCHEDULED → JOINED → IN_PROGRESS → COMPLETED`), its REST API, and
 * the patient-summary read model shown to the doctor. Imports
 * `AppointmentsModule` to reuse `AppointmentsService.cancelForNoShow` for the
 * no-show flow instead of duplicating cancellation logic. Real-time delivery
 * (`consultation:state` / `consultation:presence` broadcasts, and the
 * `SESSION_UPDATE` notification) lives in `NotificationsModule`, which
 * listens for `CONSULTATION_STATE_CHANGED_EVENT` via `EventEmitter2` — this
 * module has no direct dependency on it. Exports `ConsultationsService` so
 * the records module can reuse `assertRecordWritable` instead of duplicating
 * the session-state gate for notes/prescriptions. Also hosts the consultation
 * chat (`ConsultationMessagesController`/`Service`), gated through
 * `ConsultationsService.assertMessagingReadable`/`assertMessagingWritable`.
 */
@Module({
  imports: [AppointmentsModule],
  controllers: [ConsultationsController, ConsultationMessagesController],
  providers: [ConsultationsService, ConsultationMessagesService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
