import { Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ACCESS_COOKIE, type AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiErrorDto } from '../common/errors/api-error.dto';
import { NotificationListQueryDto } from './dto/notification-query.dto';
import {
  NotificationResponseDto,
  PaginatedNotificationsDto,
  UnreadCountResponseDto,
} from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

/** Every endpoint here only ever reads or writes the signed-in caller's own notifications. */
@ApiTags('notifications')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List the caller's own notifications, newest first" })
  @ApiOkResponse({ type: PaginatedNotificationsDto })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: NotificationListQueryDto,
  ): Promise<PaginatedNotificationsDto> {
    return this.notifications.list(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: "Count of the caller's unread notifications" })
  @ApiOkResponse({ type: UnreadCountResponseDto })
  async unreadCount(@CurrentUser() user: AuthUser): Promise<UnreadCountResponseDto> {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: "Mark one of the caller's own notifications read" })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'NOT_FOUND (also for a non-owner)' })
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationResponseDto> {
    return this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  @ApiOperation({ summary: "Mark all of the caller's unread notifications read" })
  @ApiOkResponse({ description: 'No content.' })
  async markAllRead(@CurrentUser() user: AuthUser): Promise<void> {
    await this.notifications.markAllRead(user.id);
  }
}
