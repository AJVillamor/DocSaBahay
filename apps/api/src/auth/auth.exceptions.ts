import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@doksabahay/shared';
import { AccountStatus } from '@prisma/client';

import { DomainException } from '../common/errors/domain.exception';

/** Registration with an email that already has an account. */
export class EmailTakenException extends DomainException {
  constructor() {
    super(HttpStatus.CONFLICT, ErrorCode.EMAIL_TAKEN, 'An account with this email already exists.');
  }
}

/** Unknown email or wrong password. Deliberately does not say which. */
export class InvalidCredentialsException extends DomainException {
  constructor() {
    super(HttpStatus.UNAUTHORIZED, ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password.');
  }
}

/** The account is SUSPENDED or DEACTIVATED. The admin's reason is never exposed. */
export class AccountInactiveException extends DomainException {
  constructor(status: AccountStatus) {
    super(HttpStatus.FORBIDDEN, ErrorCode.ACCOUNT_INACTIVE, `Account is ${status.toLowerCase()}.`);
  }
}

/** Missing, unknown, expired, revoked or reused refresh token. */
export class InvalidRefreshTokenException extends DomainException {
  constructor() {
    super(
      HttpStatus.UNAUTHORIZED,
      ErrorCode.INVALID_REFRESH_TOKEN,
      'Session expired. Please sign in again.',
    );
  }
}

/** No valid access token on a private route. */
export class AuthenticationRequiredException extends DomainException {
  constructor() {
    super(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, 'Authentication required.');
  }
}

/** Authenticated, but the role is not allowed by `@Roles(...)`. */
export class InsufficientRoleException extends DomainException {
  constructor() {
    super(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, 'You do not have access to this resource.');
  }
}

/** Doctor registration referenced a specialization that does not exist. */
export class UnknownSpecializationException extends DomainException {
  constructor() {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_FAILED,
      'primarySpecializationId does not match a specialization.',
    );
  }
}
