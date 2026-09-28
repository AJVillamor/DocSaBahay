import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@doksabahay/shared';

import { DomainException } from '../common/errors/domain.exception';

/**
 * No such note, or the caller is not authorized to view/edit it (per
 * `RecordsAccessPolicy`). Deliberately the same 404 either way — mirrors
 * `AppointmentNotFoundException`'s privacy rationale: a non-participant (or a
 * patient probing for a draft) cannot tell a note exists from the response.
 */
export class NoteNotFoundException extends DomainException {
  constructor() {
    super(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Consultation note not found.');
  }
}

/** A `PUT .../note` was attempted on a note already `FINALIZED`. It is read-only afterward. */
export class NoteFinalizedException extends DomainException {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      ErrorCode.NOTE_FINALIZED,
      'This note has already been finalized and can no longer be edited.',
    );
  }
}

/** Finalize was attempted while a required field (chief complaint, findings, recommendations, summary) is blank. */
export class NoteIncompleteException extends DomainException {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      ErrorCode.CONFLICT,
      'Chief complaint, findings, recommendations and summary are all required before finalizing.',
    );
  }
}

/** Same 404-hides-existence rationale as {@link NoteNotFoundException}, for prescriptions. */
export class PrescriptionNotFoundException extends DomainException {
  constructor() {
    super(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Prescription not found.');
  }
}

/** A write was attempted on a prescription already `ISSUED`. It is read-only afterward. */
export class PrescriptionIssuedException extends DomainException {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      ErrorCode.PRESCRIPTION_ISSUED,
      'This prescription has already been issued and can no longer be edited.',
    );
  }
}

/**
 * No such patient, or the caller (a doctor) has no `SCHEDULED`/`COMPLETED`
 * appointment with them — same 404-hides-existence rationale as
 * {@link NoteNotFoundException}.
 */
export class PatientRecordsNotFoundException extends DomainException {
  constructor() {
    super(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Patient records not found.');
  }
}
