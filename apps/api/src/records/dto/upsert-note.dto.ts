import { NOTE_FIELD_MAX_LENGTH } from '@doksabahay/shared';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const trimOrUndefined = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Body of `PUT /consultations/:appointmentId/note`. Every field may be blank
 * — this always upserts a `DRAFT` — only `finalize` requires them non-empty.
 */
export class UpsertConsultationNoteDto {
  @IsString()
  @MaxLength(NOTE_FIELD_MAX_LENGTH)
  chiefComplaint: string;

  @IsString()
  @MaxLength(NOTE_FIELD_MAX_LENGTH)
  findings: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(NOTE_FIELD_MAX_LENGTH)
  diagnosis?: string;

  @IsString()
  @MaxLength(NOTE_FIELD_MAX_LENGTH)
  recommendations: string;

  @IsString()
  @MaxLength(NOTE_FIELD_MAX_LENGTH)
  summary: string;
}
