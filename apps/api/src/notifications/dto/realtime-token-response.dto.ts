import { ApiProperty } from '@nestjs/swagger';

/** Response body of `GET /realtime/token`. */
export class RealtimeTokenResponseDto {
  @ApiProperty({ description: 'Short-lived JWT proving identity to the notifications gateway.' })
  token: string;

  @ApiProperty({ example: 60 })
  expiresInSeconds: number;
}
