import {
  MEDICATION_FIELD_MAX_LENGTH,
  PRESCRIPTION_INSTRUCTIONS_MAX_LENGTH,
  PRESCRIPTION_ITEMS_MAX,
  PRESCRIPTION_ITEMS_MIN,
} from '@doksabahay/shared';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimOrUndefined = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/** One medication row of `UpsertPrescriptionDto.items`. */
export class PrescriptionItemInputDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(MEDICATION_FIELD_MAX_LENGTH)
  medicationName: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(MEDICATION_FIELD_MAX_LENGTH)
  dosage: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(MEDICATION_FIELD_MAX_LENGTH)
  frequency: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(MEDICATION_FIELD_MAX_LENGTH)
  duration: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(PRESCRIPTION_INSTRUCTIONS_MAX_LENGTH)
  instructions?: string;
}

/** Body of `POST`/`PUT /consultations/:appointmentId/prescriptions`. Always upserts a `DRAFT`. */
export class UpsertPrescriptionDto {
  @IsArray()
  @ArrayMinSize(PRESCRIPTION_ITEMS_MIN)
  @ArrayMaxSize(PRESCRIPTION_ITEMS_MAX)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemInputDto)
  items: PrescriptionItemInputDto[];
}
