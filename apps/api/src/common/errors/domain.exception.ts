import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@doksabahay/shared';

/**
 * Base class for typed domain errors. The global exception filter turns these
 * into `{ statusCode, message, code, details? }` responses. `details` is an
 * optional, error-specific structured payload (e.g. the appointments
 * affected by a SCHEDULE_CONFLICT) — most exceptions omit it.
 */
export class DomainException extends Error {
  constructor(
    readonly statusCode: HttpStatus,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
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
