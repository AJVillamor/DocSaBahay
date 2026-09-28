import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { ACCESS_COOKIE, type AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiErrorDto } from '../common/errors/api-error.dto';
import { AvailabilityService } from './availability.service';
import {
  AvailabilityExceptionResponseDto,
  CreateAvailabilityExceptionDto,
  UpdateAvailabilityExceptionDto,
} from './dto/availability-exception.dto';
import {
  AvailabilityRuleResponseDto,
  CreateAvailabilityRuleDto,
  UpdateAvailabilityRuleDto,
} from './dto/availability-rule.dto';

@ApiTags('doctors')
@ApiCookieAuth(ACCESS_COOKIE)
@Roles(Role.DOCTOR)
@Controller('doctors/me/availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get('rules')
  @ApiOperation({ summary: "List the signed-in doctor's weekly availability rules" })
  @ApiOkResponse({ type: AvailabilityRuleResponseDto, isArray: true })
  listRules(@CurrentUser() user: AuthUser) {
    return this.availability.listRules(user.id);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create a weekly availability rule' })
  @ApiCreatedResponse({ type: AvailabilityRuleResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_FAILED | RULE_OVERLAP' })
  createRule(@CurrentUser() user: AuthUser, @Body() dto: CreateAvailabilityRuleDto) {
    return this.availability.createRule(user.id, dto);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update a weekly availability rule' })
  @ApiOkResponse({ type: AvailabilityRuleResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_FAILED | RULE_OVERLAP' })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'NOT_FOUND' })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'SCHEDULE_CONFLICT' })
  updateRule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityRuleDto,
  ) {
    return this.availability.updateRule(user.id, id, dto);
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a weekly availability rule' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'NOT_FOUND' })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'SCHEDULE_CONFLICT' })
  deleteRule(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.availability.deleteRule(user.id, id);
  }

  @Get('exceptions')
  @ApiOperation({ summary: "List the signed-in doctor's availability exceptions" })
  @ApiOkResponse({ type: AvailabilityExceptionResponseDto, isArray: true })
  listExceptions(@CurrentUser() user: AuthUser) {
    return this.availability.listExceptions(user.id);
  }

  @Post('exceptions')
  @ApiOperation({ summary: 'Create an availability exception (blocked time)' })
  @ApiCreatedResponse({ type: AvailabilityExceptionResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_FAILED' })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'SCHEDULE_CONFLICT' })
  createException(@CurrentUser() user: AuthUser, @Body() dto: CreateAvailabilityExceptionDto) {
    return this.availability.createException(user.id, dto);
  }

  @Patch('exceptions/:id')
  @ApiOperation({ summary: 'Update an availability exception' })
  @ApiOkResponse({ type: AvailabilityExceptionResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_FAILED' })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'NOT_FOUND' })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'SCHEDULE_CONFLICT' })
  updateException(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityExceptionDto,
  ) {
    return this.availability.updateException(user.id, id, dto);
  }

  @Delete('exceptions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an availability exception' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'NOT_FOUND' })
  deleteException(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.availability.deleteException(user.id, id);
  }
}
