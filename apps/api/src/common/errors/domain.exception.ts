import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@doksabahay/shared';

/**
 * Base class for typed domain errors. The global exception filter turns these
 * into `{ statusCode, message, code }` responses.
 */
export class DomainException extends Error {
  constructor(
    readonly statusCode: HttpStatus,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Request payload failed DTO validation. */
export class ValidationFailedException extends DomainException {
  constructor(message: string) {
    super(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, message);
  }
}
