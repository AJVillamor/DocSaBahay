import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@doksabahay/shared';

import { DomainException } from '../common/errors/domain.exception';

/** One appointment listed in a `ScheduleConflictException`'s `details.appointments`. */
export interface AffectedAppointment {
  id: string;
  startAt: string;
  endAt: string;
}

/** The signed-in doctor has no `DoctorProfile` row (should not happen in practice). */
export class DoctorProfileNotFoundException extends DomainException {
  constructor() {
    super(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Doctor profile not found.');
  }
}

/** A specialization id in the request does not exist. */
export class UnknownSpecializationException extends DomainException {
  constructor() {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_FAILED,
      'One or more specializations do not exist.',
    );
  }
}

/** The specialization selection is not exactly 1 primary + up to 2 secondary. */
export class InvalidSpecializationSelectionException extends DomainException {
  constructor(message: string) {
    super(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, message);
  }
}

/** `endTime` is not after `startTime`, or a time is not on a 15-minute increment. */
export class InvalidAvailabilityRuleException extends DomainException {
  constructor(message: string) {
    super(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, message);
  }
}

/** `endAt` is not after `startAt`. */
export class InvalidAvailabilityExceptionException extends DomainException {
  constructor(message: string) {
    super(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, message);
  }
}

/** A new/updated rule overlaps another rule on the same `dayOfWeek` for this doctor. */
export class RuleOverlapException extends DomainException {
  constructor() {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.RULE_OVERLAP,
      'This time range overlaps an existing availability rule on the same day.',
    );
  }
}

/** The rule id does not belong to the signed-in doctor. */
export class AvailabilityRuleNotFoundException extends DomainException {
  constructor() {
    super(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Availability rule not found.');
  }
}

/** The exception id does not belong to the signed-in doctor. */
export class AvailabilityExceptionNotFoundException extends DomainException {
  constructor() {
    super(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Availability exception not found.');
  }
}

/**
 * The change would remove availability that a SCHEDULED appointment still
 * relies on. `details.appointments` lists what would be affected, so the
 * frontend can show them; the doctor must cancel them explicitly first.
 */
export class ScheduleConflictException extends DomainException {
  constructor(appointments: AffectedAppointment[]) {
    super(
      HttpStatus.CONFLICT,
      ErrorCode.SCHEDULE_CONFLICT,
      'This change would remove availability already booked by a patient.',
      { appointments },
    );
  }
}

/** `from`/`to` on `GET /doctors/:id/slots` span more than 31 days, or `to` is not after `from`. */
export class InvalidSlotRangeException extends DomainException {
  constructor(message: string) {
    super(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, message);
  }
}

/**
 * No such doctor, or the doctor is not bookable (not APPROVED / not ACTIVE).
 * Deliberately the same 404 either way so a caller cannot probe which doctor
 * ids exist or infer their verification status.
 */
export class DoctorNotBookableException extends DomainException {
  constructor() {
    super(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Doctor not found.');
  }
}
