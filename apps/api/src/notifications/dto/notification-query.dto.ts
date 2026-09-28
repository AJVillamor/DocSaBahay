import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

/** Query string values arrive as strings; only the literal `"true"` means true. */
const toBoolean = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value === 'true' : value;

/** Query of `GET /notifications`. */
export class NotificationListQueryDto {
  @ApiPropertyOptional({ default: false, description: 'Only unread notifications.' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
