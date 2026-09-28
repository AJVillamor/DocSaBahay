import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@doksabahay/shared';

import { DomainException } from '../common/errors/domain.exception';

/** No such user. */
export class UserNotFoundException extends DomainException {
  constructor() {
    super(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'User not found.');
  }
}

/** An admin tried to change their own account status. */
export class SelfStatusChangeException extends DomainException {
  constructor() {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.FORBIDDEN,
      'You cannot change your own account status.',
    );
  }
}

/** An admin tried to change another admin's account status. */
export class AdminStatusChangeException extends DomainException {
  constructor() {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.FORBIDDEN,
      "You cannot change another admin's account status.",
    );
  }
}

/** No such doctor (i.e. no `DoctorProfile` for the given user id). */
export class AdminDoctorNotFoundException extends DomainException {
  constructor() {
    super(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Doctor not found.');
  }
}

/** No such appointment (admin oversight — always 404, admins are never "participants"). */
export class AdminAppointmentNotFoundException extends DomainException {
  constructor() {
    super(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Appointment not found.');
  }
}

/** No such specialization. */
export class SpecializationNotFoundException extends DomainException {
  constructor() {
    super(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Specialization not found.');
  }
}

/**
 * The specialization is still referenced by a doctor, a symptom-matching
 * rule or a matching keyword, so it cannot be deleted.
 */
export class SpecializationInUseException extends DomainException {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      ErrorCode.SPECIALIZATION_IN_USE,
      'This specialization is still in use and cannot be deleted.',
    );
  }
}

/** `name` or `slug` collides with an existing specialization. */
export class SpecializationConflictException extends DomainException {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      ErrorCode.CONFLICT,
      'A specialization with that name or slug already exists.',
    );
  }
}
