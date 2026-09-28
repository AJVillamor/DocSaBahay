import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CITY_COUNTRY_MAX_LENGTH,
  EMERGENCY_CONTACT_NAME_MAX_LENGTH,
  EMERGENCY_CONTACT_PHONE_MAX_LENGTH,
  MAX_HEIGHT_CM,
  MAX_WEIGHT_KG,
  MEDICAL_NOTES_MAX_LENGTH,
  MIN_HEIGHT_CM,
  MIN_WEIGHT_KG,
  NAME_MAX_LENGTH,
  PHONE_PATTERN,
  type PatientProfile,
} from '@doksabahay/shared';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { IsPastBirthDate } from '../validators/is-past-birth-date.validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Trims and converts a blank string to `undefined`, so `@IsOptional()` skips the rest. */
const trimOrUndefined = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Body of `PUT /patients/me/profile`. `profileCompleted` is never accepted
 * here: the service always recomputes it from these fields.
 */
export class UpsertPatientProfileDto {
  @ApiProperty({ example: 'Maria', minLength: 1, maxLength: NAME_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  firstName: string;

  @ApiProperty({ example: 'Santos', minLength: 1, maxLength: NAME_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  lastName: string;

  @ApiProperty({
    example: '1990-05-14',
    description: 'ISO date (YYYY-MM-DD). Must be in the past and imply an age under 120 years.',
  })
  @IsDateString()
  @IsPastBirthDate()
  birthDate: string;

  @ApiProperty({ example: 65.5, minimum: MIN_WEIGHT_KG, maximum: MAX_WEIGHT_KG })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(MIN_WEIGHT_KG)
  @Max(MAX_WEIGHT_KG)
  weightKg: number;

  @ApiProperty({ example: 170, minimum: MIN_HEIGHT_CM, maximum: MAX_HEIGHT_CM })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(MIN_HEIGHT_CM)
  @Max(MAX_HEIGHT_CM)
  heightCm: number;

  @ApiProperty({ example: '+63 917 123 4567' })
  @Transform(trim)
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number.' })
  phone: string;

  @ApiProperty({ example: 'Quezon City', minLength: 1, maxLength: CITY_COUNTRY_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CITY_COUNTRY_MAX_LENGTH)
  city: string;

  @ApiProperty({ example: 'Philippines', minLength: 1, maxLength: CITY_COUNTRY_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CITY_COUNTRY_MAX_LENGTH)
  country: string;

  @ApiPropertyOptional({ example: 'Juan Santos', maxLength: EMERGENCY_CONTACT_NAME_MAX_LENGTH })
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(EMERGENCY_CONTACT_NAME_MAX_LENGTH)
  emergencyContactName?: string;

  @ApiPropertyOptional({
    example: '+63 917 987 6543',
    maxLength: EMERGENCY_CONTACT_PHONE_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(EMERGENCY_CONTACT_PHONE_MAX_LENGTH)
  @Matches(PHONE_PATTERN, { message: 'emergencyContactPhone must be a valid phone number.' })
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ example: 'Penicillin', maxLength: MEDICAL_NOTES_MAX_LENGTH })
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(MEDICAL_NOTES_MAX_LENGTH)
  allergies?: string;

  @ApiPropertyOptional({ example: 'Type 2 diabetes', maxLength: MEDICAL_NOTES_MAX_LENGTH })
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(MEDICAL_NOTES_MAX_LENGTH)
  chronicConditions?: string;

  @ApiPropertyOptional({
    example: 'Metformin 500mg twice daily',
    maxLength: MEDICAL_NOTES_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(MEDICAL_NOTES_MAX_LENGTH)
  currentMedications?: string;

  @ApiPropertyOptional({ example: 'Appendectomy (2015)', maxLength: MEDICAL_NOTES_MAX_LENGTH })
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(MEDICAL_NOTES_MAX_LENGTH)
  pastSurgeries?: string;
}

/** Mirrors `PatientProfile` in @doksabahay/shared. */
export class PatientProfileDto implements PatientProfile {
  @ApiProperty({ example: 'Maria' })
  firstName: string;

  @ApiProperty({ example: 'Santos' })
  lastName: string;

  @ApiProperty({ example: '1990-05-14' })
  birthDate: string;

  @ApiProperty({ example: 65.5 })
  weightKg: number;

  @ApiProperty({ example: 170 })
  heightCm: number;

  @ApiProperty({ example: '+63 917 123 4567' })
  phone: string;

  @ApiProperty({ example: 'Quezon City' })
  city: string;

  @ApiProperty({ example: 'Philippines' })
  country: string;

  @ApiProperty({ type: String, nullable: true, example: 'Juan Santos' })
  emergencyContactName: string | null;

  @ApiProperty({ type: String, nullable: true, example: '+63 917 987 6543' })
  emergencyContactPhone: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Penicillin' })
  allergies: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Type 2 diabetes' })
  chronicConditions: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Metformin 500mg twice daily' })
  currentMedications: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Appendectomy (2015)' })
  pastSurgeries: string | null;

  @ApiProperty({ example: true })
  profileCompleted: boolean;
}
