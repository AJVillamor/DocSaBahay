import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CONSULTATION_MINUTES_OPTIONS, type ConsultationMinutes } from '@doksabahay/shared';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** `nextAvailableSlot` is only computed within this many days ahead (see `NextAvailableSlotService`). */
const MAX_AVAILABLE_WITHIN_DAYS = 14;

/** Query of `GET /doctors`. */
export class DoctorListQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive match on first or last name.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  q?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all')
  specializationId?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive exact match on one of the languages.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_AVAILABLE_WITHIN_DAYS,
    description: 'Only doctors whose next available slot falls within this many days.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_AVAILABLE_WITHIN_DAYS)
  availableWithinDays?: number;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

/** One specialization on a doctor summary. */
export class DoctorSpecializationSummaryDto {
  @ApiProperty({ format: 'uuid' })
  specializationId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  isPrimary: boolean;
}

/** One doctor as returned by `GET /doctors` and nested in matching results. */
export class DoctorListItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  yearsExperience: number;

  @ApiProperty({ type: [String] })
  languages: string[];

  @ApiProperty({ type: [DoctorSpecializationSummaryDto] })
  specializations: DoctorSpecializationSummaryDto[];

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'ISO instant of the earliest free slot in the next 14 days, or null if none.',
  })
  nextAvailableSlot: string | null;
}

/** Response body of `GET /doctors`. */
export class DoctorListResponseDto {
  @ApiProperty({ type: [DoctorListItemDto] })
  items: DoctorListItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  hasMore: boolean;
}

/**
 * Response body of `GET /doctors/:id`: a public-ish doctor profile.
 * Deliberately omits `licenseNumber` — not for patient eyes.
 */
export class DoctorPublicProfileDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  bio: string;

  @ApiProperty()
  yearsExperience: number;

  @ApiProperty({ type: [String] })
  languages: string[];

  @ApiProperty({ enum: CONSULTATION_MINUTES_OPTIONS })
  consultationMinutes: ConsultationMinutes;

  @ApiProperty({ type: [DoctorSpecializationSummaryDto] })
  specializations: DoctorSpecializationSummaryDto[];
}
