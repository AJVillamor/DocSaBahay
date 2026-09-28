import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

/** Body of `PATCH /appointments/:id/reschedule`. */
export class RescheduleAppointmentDto {
  @ApiProperty({ example: '2026-10-02T02:00:00.000Z' })
  @IsISO8601()
  startAt: string;
}
