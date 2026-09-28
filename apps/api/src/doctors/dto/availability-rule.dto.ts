import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

/** "HH:mm", 24-hour. The DB's `CHECK` constraint enforces the same format. */
const HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const HHMM_MESSAGE = 'must be 24-hour HH:mm, e.g. 09:00';

/** Body of `POST /doctors/me/availability/rules`. */
export class CreateAvailabilityRuleDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: '0 = Sunday … 6 = Saturday.', example: 1 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(HHMM_PATTERN, { message: `startTime ${HHMM_MESSAGE}` })
  startTime: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  @Matches(HHMM_PATTERN, { message: `endTime ${HHMM_MESSAGE}` })
  endTime: string;
}

/** Body of `PATCH /doctors/me/availability/rules/:id`. Every field is optional. */
export class UpdateAvailabilityRuleDto {
  @ApiPropertyOptional({ minimum: 0, maximum: 6, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(HHMM_PATTERN, { message: `startTime ${HHMM_MESSAGE}` })
  startTime?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @IsString()
  @Matches(HHMM_PATTERN, { message: `endTime ${HHMM_MESSAGE}` })
  endTime?: string;
}

/** One weekly recurring availability rule. */
export class AvailabilityRuleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ minimum: 0, maximum: 6 })
  dayOfWeek: number;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;
}
