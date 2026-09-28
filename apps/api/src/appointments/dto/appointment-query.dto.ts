import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

/** Query of `GET /appointments`. */
export class AppointmentListQueryDto {
  @ApiProperty({ enum: ['upcoming', 'past'] })
  @IsIn(['upcoming', 'past'])
  scope: 'upcoming' | 'past';

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
