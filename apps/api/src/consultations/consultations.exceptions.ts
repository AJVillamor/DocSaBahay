import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@doksabahay/shared';

import { DomainException } from '../common/errors/domain.exception';

/**
 * The appointment is not `SCHEDULED` (already `CANCELLED`, `COMPLETED` or
 * `INVALIDATED`), so its consultation session cannot be joined or advanced.
 * A cancelled appointment isn't a privacy leak the way a non-participant is
 * (see `AppointmentNotFoundException`, thrown instead for that case), so this
 * is a plain 409 with a clear reason rather than a 404.
 */
export class ConsultationUnavailableException extends DomainException {
  constructor(message = 'This appointment is not available for a consultation session.') {
    super(HttpStatus.CONFLICT, ErrorCode.CONFLICT, message);
  }
}

/** A join attempt fell outside `startAt - 10min` to `endAt + 30min`. */
export class OutsideJoinWindowException extends DomainException {
  constructor() {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.OUTSIDE_JOIN_WINDOW,
      'This consultation can only be joined shortly before its scheduled time.',
    );
  }
}

/**
 * A `start`/`complete`/`join` call attempted a transition `ConsultationsService`'s
 * state machine does not allow from the session's current state (calling
 * `join`/`start`/`complete` again in the *same* state is a no-op success
 * instead, not this).
 */
export class InvalidTransitionException extends DomainException {
  constructor(message: string) {
    super(HttpStatus.CONFLICT, ErrorCode.INVALID_TRANSITION, message);
  }
}
