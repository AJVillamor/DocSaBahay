import { Controller, Get, Query } from '@nestjs/common';
import type { PaginatedAuditLogs } from '@doksabahay/shared';
import { Role } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

/** Read-only, append-only audit trail of every administrative change. */
@Roles(Role.ADMIN)
@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: AuditLogQueryDto): Promise<PaginatedAuditLogs> {
    return this.audit.query(query);
  }
}
