/**
 * The `entityType`/`action` strings this codebase writes to `AuditLog`.
 * Centralized so every writer agrees on the same vocabulary, and so a later
 * reader (e.g. the admin dashboard) has one place to look them up.
 */
export const AUDIT_ENTITY_TYPES = {
  USER: 'USER',
  DOCTOR_PROFILE: 'DOCTOR_PROFILE',
  SPECIALIZATION: 'SPECIALIZATION',
  APPOINTMENT: 'APPOINTMENT',
} as const;

export const AUDIT_ACTIONS = {
  USER_STATUS_CHANGED: 'user.status_changed',
  DOCTOR_REVIEWED: 'doctor.reviewed',
  DOCTOR_PROFILE_UPDATED: 'doctor.profile_updated',
  SPECIALIZATION_CREATED: 'specialization.created',
  SPECIALIZATION_UPDATED: 'specialization.updated',
  SPECIALIZATION_DELETED: 'specialization.deleted',
  APPOINTMENT_CANCELLED_BY_ADMIN: 'appointment.cancelled_by_admin',
  APPOINTMENT_INVALIDATED: 'appointment.invalidated',
} as const;
