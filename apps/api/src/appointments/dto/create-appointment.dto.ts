import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsUUID, Length } from 'class-validator';

/** Body of `POST /appointments`. */
export class CreateAppointmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all')
  doctorId: string;

  @ApiProperty({ example: '2026-10-01T02:00:00.000Z' })
  @IsISO8601()
  startAt: string;

  @ApiProperty({ minLength: 5, maxLength: 500, example: 'Persistent cough for the past week.' })
  @Length(5, 500)
  reasonForVisit: string;
}
