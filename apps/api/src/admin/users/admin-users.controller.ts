import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';

import type { AuthUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminUsersService, type AdminUserDetailDto, type PaginatedAdminUsersDto } from './admin-users.service';
import { ListUsersQueryDto, UpdateUserStatusDto } from './dto/admin-users.dto';

@Roles(Role.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list(@Query() query: ListUsersQueryDto): Promise<PaginatedAdminUsersDto> {
    return this.users.list(query);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<AdminUserDetailDto> {
    return this.users.getById(id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() request: Request,
  ): Promise<AdminUserDetailDto> {
    return this.users.updateStatus(actor, id, dto, request.ip);
  }
}
