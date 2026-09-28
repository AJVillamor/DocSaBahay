import { Controller, Get } from '@nestjs/common';
import type { AdminDashboard } from '@doksabahay/shared';
import { Role } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminDashboardService } from './admin-dashboard.service';

@Roles(Role.ADMIN)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  @Get()
  getSummary(): Promise<AdminDashboard> {
    return this.dashboard.getSummary();
  }
}
