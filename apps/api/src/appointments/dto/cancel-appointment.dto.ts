import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

/**
 * Body of `POST /appointments/:id/cancel`. `reason` is required when the
 * caller is the doctor and optional when the caller is the patient — the DTO
 * cannot see who the caller is, so that is enforced in
 * `AppointmentsService.cancel`.
 */
export class CancelAppointmentDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 500, example: 'Doctor is unavailable.' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;
}
