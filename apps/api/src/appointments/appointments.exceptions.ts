import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@doksabahay/shared';
import { Prisma } from '@prisma/client';

import { DomainException } from '../common/errors/domain.exception';

/**
 * No such appointment, or the caller is not one of its two participants.
 * Deliberately the same 404 either way (never 403) so a non-participant
 * cannot probe which appointment ids exist — matching the philosophy
 * `GET /doctors/:id/slots` already uses for a non-bookable doctor.
 */
export class AppointmentNotFoundException extends DomainException {
  constructor() {
    super(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Appointment not found.');
  }
}

/** The signed-in patient's `PatientProfile.profileCompleted` is not `true`. */
export class ProfileIncompleteException extends DomainException {
  constructor() {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.PROFILE_INCOMPLETE,
      'Complete your patient profile before booking an appointment.',
    );
  }
}

/** `startAt` violates `LEAD_TIME_MINUTES` or `BOOKING_HORIZON_DAYS`. */
export class InvalidBookingWindowException extends DomainException {
  constructor(message: string) {
    super(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, message);
  }
}

/**
 * The requested `startAt` does not exactly match a currently free slot for
 * this doctor — either the client's pre-check was stale (someone else took
 * it first) or the DB's `appointments_doctor_no_overlap` EXCLUDE constraint
 * fired at commit time. Same code/message either way so the frontend can
 * react uniformly: refetch the slot grid and ask the patient to pick again.
 */
export class SlotTakenException extends DomainException {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      ErrorCode.SLOT_TAKEN,
      'That time was just taken. Please pick another slot.',
    );
  }
}

/**
 * The DB's `appointments_patient_no_overlap` EXCLUDE constraint fired: the
 * patient already has another SCHEDULED appointment overlapping this time
 * (raced in by another request/tab between the pre-check and the insert).
 */
export class PatientOverlapException extends DomainException {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      ErrorCode.PATIENT_OVERLAP,
      'You already have another appointment scheduled at that time.',
    );
  }
}

/** The patient already has `MAX_UPCOMING_PER_PATIENT` SCHEDULED upcoming appointments. */
export class TooManyUpcomingAppointmentsException extends DomainException {
  constructor(limit: number) {
    super(
      HttpStatus.CONFLICT,
      ErrorCode.TOO_MANY_UPCOMING_APPOINTMENTS,
      `You can have at most ${limit} upcoming appointments at a time. Cancel one first.`,
    );
  }
}

/** Reschedule attempted less than `RESCHEDULE_CUTOFF_MINUTES` before the current `startAt`. */
export class RescheduleWindowClosedException extends DomainException {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      ErrorCode.RESCHEDULE_WINDOW_CLOSED,
      'This appointment can no longer be rescheduled — it starts too soon. Cancel it instead.',
    );
  }
}

/**
 * The appointment's `version` at commit time no longer matched the version
 * read before the update — someone else (the other participant, or a second
 * tab) changed it first. The caller should refetch and retry.
 */
export class StaleAppointmentVersionException extends DomainException {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      ErrorCode.STALE_VERSION,
      'This appointment changed since you loaded it. Refresh and try again.',
    );
  }
}

/** The appointment is not `SCHEDULED` (already cancelled/completed/invalidated), or already started. */
export class AppointmentNotModifiableException extends DomainException {
  constructor(message: string) {
    super(HttpStatus.CONFLICT, ErrorCode.CONFLICT, message);
  }
}

/** A doctor cancelling an appointment must give a reason; a patient's is optional. */
export class CancellationReasonRequiredException extends DomainException {
  constructor() {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_FAILED,
      'reason is required when the doctor cancels an appointment.',
    );
  }
}

/**
 * Maps a Postgres `23P01` exclusion-constraint violation (raised by either
 * `appointments_doctor_no_overlap` or `appointments_patient_no_overlap`, see
 * the hand-written `*_db_constraints` migration) to the matching typed domain
 * exception, mirroring how `AuthService` maps Prisma's `P2002` to
 * `EmailTakenException`.
 *
 * Postgres exclusion violations don't get one of Prisma's more specific known
 * codes (unlike `P2002` for a unique index), so this checks both
 * `PrismaClientKnownRequestError` and `PrismaClientUnknownRequestError` and
 * matches on the constraint name Postgres includes in the error message —
 * the same signal `appointments-overlap.int-spec.ts` asserts on directly.
 *
 * @throws SlotTakenException | PatientOverlapException for a recognized
 *   constraint violation; otherwise rethrows `error` unchanged.
 */
export function mapAppointmentConstraintError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    const message = error.message;
    if (message.includes('appointments_doctor_no_overlap')) {
      throw new SlotTakenException();
    }
    if (message.includes('appointments_patient_no_overlap')) {
      throw new PatientOverlapException();
    }
  }
  throw error;
}
