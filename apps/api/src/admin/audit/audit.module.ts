import { Module } from '@nestjs/common';

import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

/**
 * Append-only audit log: `AuditService.record` (called inside another
 * module's transaction) and the read-only `GET /admin/audit-logs` endpoint.
 * Exported so every other admin module can write entries without each
 * standing up its own copy.
 */
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
