import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

/** One notification, as returned by every `/notifications*` endpoint. */
export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: NotificationType, enumName: 'NotificationType' })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ nullable: true, type: String })
  link: string | null;

  @ApiProperty({ nullable: true, type: String })
  readAt: string | null;

  @ApiProperty()
  createdAt: string;
}

/** Response body of `GET /notifications`. */
export class PaginatedNotificationsDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  items: NotificationResponseDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalCount: number;
}

/** Response body of `GET /notifications/unread-count`. */
export class UnreadCountResponseDto {
  @ApiProperty()
  count: number;
}
