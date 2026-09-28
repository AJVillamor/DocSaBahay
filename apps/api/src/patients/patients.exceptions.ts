import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@doksabahay/shared';

import { DomainException } from '../common/errors/domain.exception';

/** The caller has not created a patient profile yet (`GET /patients/me/profile`). */
export class PatientProfileNotFoundException extends DomainException {
  constructor() {
    super(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Patient profile not found.');
  }
}

/** A route requires a completed patient profile. See `ProfileCompletedGuard`. */
export class ProfileIncompleteException extends DomainException {
  constructor() {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.PROFILE_INCOMPLETE,
      'Complete your patient profile before continuing.',
    );
  }
}
