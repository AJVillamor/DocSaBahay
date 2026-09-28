import { ApiProperty } from '@nestjs/swagger';
import { DbStatus, HealthResponse } from '@doksabahay/shared';

export class HealthResponseDto implements HealthResponse {
  @ApiProperty({ enum: ['ok'] })
  status: 'ok';

  @ApiProperty({ enum: DbStatus, enumName: 'DbStatus' })
  db: DbStatus;
}
