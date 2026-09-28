import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';

import type { AuthUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UpdateDoctorProfileDto } from '../../doctors/dto/doctor-profile.dto';
import {
  AdminDoctorsService,
  type AdminDoctorDetailDto,
  type PaginatedAdminDoctorsDto,
} from './admin-doctors.service';
import { DoctorReviewDto, ListDoctorsQueryDto } from './dto/admin-doctors.dto';

@Roles(Role.ADMIN)
@Controller('admin/doctors')
export class AdminDoctorsController {
  constructor(private readonly doctors: AdminDoctorsService) {}

  @Get()
  list(@Query() query: ListDoctorsQueryDto): Promise<PaginatedAdminDoctorsDto> {
    return this.doctors.list(query);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<AdminDoctorDetailDto> {
    return this.doctors.getById(id);
  }

  @Post(':id/review')
  review(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DoctorReviewDto,
    @Req() request: Request,
  ): Promise<AdminDoctorDetailDto> {
    return this.doctors.review(actor, id, dto, request.ip);
  }

  @Patch(':id')
  updateProfile(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDoctorProfileDto,
    @Req() request: Request,
  ): Promise<AdminDoctorDetailDto> {
    return this.doctors.updateProfile(actor, id, dto, request.ip);
  }
}
