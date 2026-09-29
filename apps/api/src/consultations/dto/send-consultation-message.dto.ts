import { MESSAGE_BODY_MAX_LENGTH } from '@doksabahay/shared';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown => (typeof value === 'string' ? value.trim() : value);

/** Body of `POST /consultations/:appointmentId/messages`. */
export class SendConsultationMessageDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(MESSAGE_BODY_MAX_LENGTH)
  body: string;
}
