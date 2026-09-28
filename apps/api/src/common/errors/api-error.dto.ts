import { ApiProperty } from '@nestjs/swagger';
import { ApiError, ErrorCode } from '@doksabahay/shared';

/** Swagger model of the error contract `{ statusCode, message, code }`. */
export class ApiErrorDto implements ApiError {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'email must be an email' })
  message: string;

  @ApiProperty({ enum: ErrorCode, enumName: 'ErrorCode' })
  code: ErrorCode;
}
