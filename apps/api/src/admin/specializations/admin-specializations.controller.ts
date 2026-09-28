import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import type { Specialization } from '@doksabahay/shared';
import { Role } from '@prisma/client';
import type { Request } from 'express';

import type { AuthUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminSpecializationsService } from './admin-specializations.service';
import { CreateSpecializationDto, UpdateSpecializationDto } from './dto/admin-specializations.dto';

@Roles(Role.ADMIN)
@Controller('admin/specializations')
export class AdminSpecializationsController {
  constructor(private readonly specializations: AdminSpecializationsService) {}

  @Get()
  list(): Promise<Specialization[]> {
    return this.specializations.list();
  }

  @Post()
  create(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateSpecializationDto,
    @Req() request: Request,
  ): Promise<Specialization> {
    return this.specializations.create(actor, dto, request.ip);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSpecializationDto,
    @Req() request: Request,
  ): Promise<Specialization> {
    return this.specializations.update(actor, id, dto, request.ip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ): Promise<void> {
    return this.specializations.remove(actor, id, request.ip);
  }
}
