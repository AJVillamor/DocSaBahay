/**
 * Enums that mirror the Prisma schema (apps/api/prisma/schema.prisma) are kept in
 * sync by apps/api/src/prisma/enums.spec.ts.
 */

/** User roles. Admins are created only by the seed script. */
export enum Role {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  ADMIN = 'ADMIN',
}

/** Account lifecycle state. */
export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

/** Admin review state of a doctor profile. */
export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Appointment lifecycle. Only SCHEDULED appointments block time slots. */
export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  INVALIDATED = 'INVALIDATED',
}

/** Live state of a consultation session. */
export enum SessionState {
  SCHEDULED = 'SCHEDULED',
  JOINED = 'JOINED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

/** Entries in an appointment's history. */
export enum AppointmentEventType {
  CREATED = 'CREATED',
  RESCHEDULED = 'RESCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  INVALIDATED = 'INVALIDATED',
}

/** Consultation note lifecycle. */
export enum NoteStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
}

/** Prescription lifecycle. */
export enum PrescriptionStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
}

/** In-app notification kinds. */
export enum NotificationType {
  APPOINTMENT_BOOKED = 'APPOINTMENT_BOOKED',
  APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  SCHEDULE_CHANGED = 'SCHEDULE_CHANGED',
  SESSION_UPDATE = 'SESSION_UPDATE',
  RECORD_AVAILABLE = 'RECORD_AVAILABLE',
  DOCTOR_REVIEWED = 'DOCTOR_REVIEWED',
  ACCOUNT_STATUS = 'ACCOUNT_STATUS',
}

/** Database connectivity reported by `GET /health`. */
export enum DbStatus {
  UP = 'up',
  DOWN = 'down',
}

/** Machine-readable error codes returned in the `code` field of every API error. */
export enum ErrorCode {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EMAIL_TAKEN = 'EMAIL_TAKEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  PROFILE_INCOMPLETE = 'PROFILE_INCOMPLETE',
  /** A new/updated availability rule overlaps another rule on the same day. */
  RULE_OVERLAP = 'RULE_OVERLAP',
  /** The change would remove availability already covered by a SCHEDULED appointment. */
  SCHEDULE_CONFLICT = 'SCHEDULE_CONFLICT',
}
