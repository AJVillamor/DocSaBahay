import { ApiProperty } from '@nestjs/swagger';
import { CONSULTATION_MINUTES_OPTIONS, type ConsultationMinutes } from '@doksabahay/shared';
import { VerificationStatus } from '@prisma/client';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { IsIanaTimezone } from './is-iana-timezone.validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** One specialization selection: exactly 1 primary + up to 2 secondary across the whole array. */
export class SpecializationSelectionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all')
  specializationId: string;

  @ApiProperty()
  @IsBoolean()
  isPrimary: boolean;
}

/** Body of `PUT /doctors/me/profile`. */
export class UpdateDoctorProfileDto {
  @ApiProperty({ example: 'Dr.' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: 'Family physician focused on preventive care.' })
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  bio: string;

  @ApiProperty({ minimum: 0, maximum: 70, example: 10 })
  @IsInt()
  @Min(0)
  @Max(70)
  yearsExperience: number;

  @ApiProperty({ example: 'FAKE-PRC-0100231', description: 'Fictional license number.' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  licenseNumber: string;

  @ApiProperty({ type: [String], example: ['English', 'Filipino'] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  languages: string[];

  @ApiProperty({ enum: CONSULTATION_MINUTES_OPTIONS, example: 30 })
  @IsIn(CONSULTATION_MINUTES_OPTIONS)
  consultationMinutes: ConsultationMinutes;

  @ApiProperty({ example: 'Asia/Manila', description: 'A valid IANA time zone.' })
  @IsString()
  @IsIanaTimezone()
  timezone: string;

  @ApiProperty({
    type: [SpecializationSelectionDto],
    description: 'Exactly 1 primary, up to 2 secondary.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => SpecializationSelectionDto)
  specializations: SpecializationSelectionDto[];
}

/** One specialization on a doctor's profile response. */
export class DoctorProfileSpecializationDto {
  @ApiProperty({ format: 'uuid' })
  specializationId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  isPrimary: boolean;
}

/** Response body of `GET /doctors/me/profile` and `PUT /doctors/me/profile`. */
export class DoctorProfileResponseDto {
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

  @ApiProperty()
  licenseNumber: string;

  @ApiProperty({ type: [String] })
  languages: string[];

  @ApiProperty({ enum: CONSULTATION_MINUTES_OPTIONS })
  consultationMinutes: ConsultationMinutes;

  @ApiProperty()
  timezone: string;

  @ApiProperty({ enum: VerificationStatus, enumName: 'VerificationStatus' })
  verificationStatus: VerificationStatus;

  @ApiProperty({ nullable: true, type: String })
  reviewNote: string | null;

  @ApiProperty({ type: [DoctorProfileSpecializationDto] })
  specializations: DoctorProfileSpecializationDto[];
}
