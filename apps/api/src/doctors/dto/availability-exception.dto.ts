import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Body of `POST /doctors/me/availability/exceptions`. */
export class CreateAvailabilityExceptionDto {
  @ApiProperty({ example: '2026-10-01T02:00:00.000Z' })
  @IsISO8601()
  startAt: string;

  @ApiProperty({ example: '2026-10-01T10:00:00.000Z' })
  @IsISO8601()
  endAt: string;

  @ApiPropertyOptional({ example: 'Medical conference' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** Body of `PATCH /doctors/me/availability/exceptions/:id`. Every field is optional. */
export class UpdateAvailabilityExceptionDto {
  @ApiPropertyOptional({ example: '2026-10-01T02:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @ApiPropertyOptional({ example: '2026-10-01T10:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  endAt?: string;

  @ApiPropertyOptional({ example: 'Medical conference' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** One availability exception (blocked time). */
export class AvailabilityExceptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  startAt: string;

  @ApiProperty()
  endAt: string;

  @ApiProperty({ nullable: true, type: String })
  reason: string | null;
}
