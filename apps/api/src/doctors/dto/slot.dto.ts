import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

/** Query of `GET /doctors/:id/slots`. */
export class SlotQueryDto {
  @ApiProperty({ example: '2026-10-01T00:00:00.000Z' })
  @IsISO8601()
  from: string;

  @ApiProperty({ example: '2026-10-08T00:00:00.000Z' })
  @IsISO8601()
  to: string;
}

/** One free consultation slot. */
export class SlotResponseDto {
  @ApiProperty()
  startAt: string;

  @ApiProperty()
  endAt: string;
}
