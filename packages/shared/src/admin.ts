import { z } from 'zod';

import { appointmentDoctorSchema, appointmentPersonSchema } from './appointments';
import { consultationMinutesSchema, doctorProfileSpecializationSchema } from './doctors';
import { AccountStatus, AppointmentEventType, AppointmentStatus, Role, SessionState, VerificationStatus } from './enums';

/** Page size for `GET /admin/users`. */
export const ADMIN_USERS_PAGE_SIZE = 20;

/** Page size for `GET /admin/doctors`. */
export const ADMIN_DOCTORS_PAGE_SIZE = 20;

/** Page size for `GET /admin/audit-logs`. */
export const AUDIT_LOGS_PAGE_SIZE = 25;

/** Page size for `GET /admin/appointments`. */
export const ADMIN_APPOINTMENTS_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** One row of `GET /admin/users`. */
export const adminUserSummarySchema = z.object({
  id: z.uuid(),
  email: z.email(),
  role: z.enum(Role),
  status: z.enum(AccountStatus),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  createdAt: z.iso.datetime(),
  lastLoginAt: z.iso.datetime().nullable(),
});
export type AdminUserSummary = z.infer<typeof adminUserSummarySchema>;

/** Response body of `GET /admin/users`. */
export const paginatedAdminUsersSchema = z.object({
  items: z.array(adminUserSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
});
export type PaginatedAdminUsers = z.infer<typeof paginatedAdminUsersSchema>;

/** Response body of `GET /admin/users/:id` and `PATCH /admin/users/:id/status`. */
export const adminUserDetailSchema = adminUserSummarySchema.extend({
  statusReason: z.string().nullable(),
  /** SCHEDULED appointments starting in the future, as either participant. */
  upcomingAppointmentCount: z.number().int(),
});
export type AdminUserDetail = z.infer<typeof adminUserDetailSchema>;

/** Body of `PATCH /admin/users/:id/status`. `reason` is required unless reactivating (ACTIVE). */
export const updateUserStatusSchema = z
  .object({
    status: z.enum(AccountStatus),
    reason: z.string().trim().max(500, 'Use at most 500 characters.').optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status !== AccountStatus.ACTIVE && !value.reason) {
      ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Enter a reason.' });
    }
  });
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

// ---------------------------------------------------------------------------
// Doctors
// ---------------------------------------------------------------------------

/** One row of `GET /admin/doctors`. */
export const adminDoctorSummarySchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  title: z.string(),
  verificationStatus: z.enum(VerificationStatus),
  accountStatus: z.enum(AccountStatus),
  createdAt: z.iso.datetime(),
});
export type AdminDoctorSummary = z.infer<typeof adminDoctorSummarySchema>;

/** Response body of `GET /admin/doctors`. */
export const paginatedAdminDoctorsSchema = z.object({
  items: z.array(adminDoctorSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
});
export type PaginatedAdminDoctors = z.infer<typeof paginatedAdminDoctorsSchema>;

/**
 * Response body of `GET /admin/doctors/:id`, `POST /admin/doctors/:id/review`
 * and `PATCH /admin/doctors/:id`. Unlike the patient-facing doctor profile,
 * this includes `licenseNumber` and account/contact info — for admin eyes only.
 */
export const adminDoctorDetailSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  accountStatus: z.enum(AccountStatus),
  firstName: z.string(),
  lastName: z.string(),
  title: z.string(),
  bio: z.string(),
  yearsExperience: z.number().int(),
  licenseNumber: z.string(),
  languages: z.array(z.string()),
  consultationMinutes: consultationMinutesSchema,
  timezone: z.string(),
  verificationStatus: z.enum(VerificationStatus),
  reviewNote: z.string().nullable(),
  reviewedAt: z.iso.datetime().nullable(),
  specializations: z.array(doctorProfileSpecializationSchema),
});
export type AdminDoctorDetail = z.infer<typeof adminDoctorDetailSchema>;

/** Body of `POST /admin/doctors/:id/review`. `note` is required when rejecting. */
export const reviewDoctorSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    note: z.string().trim().max(1000, 'Use at most 1000 characters.').optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'REJECTED' && !value.note) {
      ctx.addIssue({ code: 'custom', path: ['note'], message: 'Enter a note explaining the rejection.' });
    }
  });
export type ReviewDoctorInput = z.infer<typeof reviewDoctorSchema>;

// ---------------------------------------------------------------------------
// Specializations (admin CRUD)
// ---------------------------------------------------------------------------

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Body of `POST /admin/specializations`. */
export const createSpecializationSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(100, 'Use at most 100 characters.'),
  slug: z
    .string()
    .trim()
    .min(1, 'Enter a slug.')
    .max(100, 'Use at most 100 characters.')
    .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and hyphens only.'),
  description: z
    .string()
    .trim()
    .min(1, 'Enter a description.')
    .max(500, 'Use at most 500 characters.'),
});
export type CreateSpecializationInput = z.infer<typeof createSpecializationSchema>;

/** Body of `PATCH /admin/specializations/:id`. */
export const updateSpecializationSchema = createSpecializationSchema.partial();
export type UpdateSpecializationInput = z.infer<typeof updateSpecializationSchema>;

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

/** One row of `GET /admin/audit-logs`. Append-only. */
export const auditLogSchema = z.object({
  id: z.uuid(),
  actorId: z.uuid(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  reason: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type AuditLogEntry = z.infer<typeof auditLogSchema>;

/** Response body of `GET /admin/audit-logs`. */
export const paginatedAuditLogsSchema = z.object({
  items: z.array(auditLogSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
});
export type PaginatedAuditLogs = z.infer<typeof paginatedAuditLogsSchema>;

// ---------------------------------------------------------------------------
// Appointment oversight
// ---------------------------------------------------------------------------

/** One row of `GET /admin/appointments`. Never carries clinical note/prescription content. */
export const adminAppointmentSummarySchema = z.object({
  id: z.uuid(),
  doctorId: z.uuid(),
  patientId: z.uuid(),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  status: z.enum(AppointmentStatus),
  reasonForVisit: z.string(),
  cancelledById: z.uuid().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  cancellationReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  patient: appointmentPersonSchema,
  doctor: appointmentDoctorSchema,
  sessionState: z.enum(SessionState),
});
export type AdminAppointmentSummary = z.infer<typeof adminAppointmentSummarySchema>;

/** Response body of `GET /admin/appointments`. */
export const paginatedAdminAppointmentsSchema = z.object({
  items: z.array(adminAppointmentSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
});
export type PaginatedAdminAppointments = z.infer<typeof paginatedAdminAppointmentsSchema>;

/** One entry of an appointment's `AppointmentEvent` timeline. */
export const adminAppointmentEventSchema = z.object({
  id: z.uuid(),
  type: z.enum(AppointmentEventType),
  actorId: z.uuid(),
  fromStartAt: z.iso.datetime().nullable(),
  toStartAt: z.iso.datetime().nullable(),
  reason: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type AdminAppointmentEvent = z.infer<typeof adminAppointmentEventSchema>;

/** Response body of `GET /admin/appointments/:id`. Metadata and logistics only — no clinical content. */
export const adminAppointmentDetailSchema = adminAppointmentSummarySchema.extend({
  session: z.object({
    state: z.enum(SessionState),
    patientJoinedAt: z.iso.datetime().nullable(),
    doctorJoinedAt: z.iso.datetime().nullable(),
    startedAt: z.iso.datetime().nullable(),
    endedAt: z.iso.datetime().nullable(),
  }),
  events: z.array(adminAppointmentEventSchema),
});
export type AdminAppointmentDetail = z.infer<typeof adminAppointmentDetailSchema>;

/** Body of `POST /admin/appointments/:id/cancel` and `.../invalidate`. Always required, unlike a participant's own cancel. */
export const adminAppointmentActionSchema = z.object({
  reason: z.string().trim().min(1, 'Enter a reason.').max(500, 'Use at most 500 characters.'),
});
export type AdminAppointmentActionInput = z.infer<typeof adminAppointmentActionSchema>;

/** Reasons a SCHEDULED appointment is flagged by `GET /admin/appointments/issues`. */
export const adminAppointmentIssueTypeSchema = z.enum([
  /** Doctor is no longer APPROVED/ACTIVE (was, at booking time). */
  'DOCTOR_NOT_BOOKABLE',
  /** Patient's account is no longer ACTIVE. */
  'PATIENT_INACTIVE',
  /** `startAt`/`endAt` no longer falls inside the doctor's current availability rules. */
  'OUTSIDE_AVAILABILITY',
  /** More than `STALE_SESSION_GRACE_MINUTES` past `endAt` with the session never started. */
  'STALE_UNSTARTED',
]);
export type AdminAppointmentIssueType = z.infer<typeof adminAppointmentIssueTypeSchema>;

/** One issue found by `GET /admin/appointments/issues`. An appointment may appear more than once, once per issue type. */
export const adminAppointmentIssueSchema = z.object({
  issueType: adminAppointmentIssueTypeSchema,
  appointment: adminAppointmentSummarySchema,
});
export type AdminAppointmentIssue = z.infer<typeof adminAppointmentIssueSchema>;

/** Response body of `GET /admin/appointments/issues`. */
export const adminAppointmentIssuesResponseSchema = z.object({
  items: z.array(adminAppointmentIssueSchema),
});
export type AdminAppointmentIssuesResponse = z.infer<typeof adminAppointmentIssuesResponseSchema>;

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/** One group-by-count bucket, generic across whichever field the dashboard groups by. */
const countBucketSchema = z.object({ key: z.string(), count: z.number().int() });
export type CountBucket = z.infer<typeof countBucketSchema>;

/** One day's appointment count, for the dashboard's 14-day bar chart. UTC calendar day. */
export const dailyAppointmentCountSchema = z.object({
  date: z.string(),
  count: z.number().int(),
});
export type DailyAppointmentCount = z.infer<typeof dailyAppointmentCountSchema>;

/** Response body of `GET /admin/dashboard`. Every count is a live DB aggregate, not cached. */
export const adminDashboardSchema = z.object({
  /** `key` is `"<role>:<status>"`. */
  usersByRoleStatus: z.array(countBucketSchema),
  /** `key` is a `VerificationStatus`. */
  doctorsByVerificationStatus: z.array(countBucketSchema),
  appointments: z.object({
    /** `key` is an `AppointmentStatus`. */
    today: z.array(countBucketSchema),
    next7Days: z.array(countBucketSchema),
    last30Days: z.array(countBucketSchema),
  }),
  /** `key` is a `SessionState`. Sessions whose appointment starts today. */
  sessionsTodayByState: z.array(countBucketSchema),
  /** Appointments per UTC calendar day, last 14 days (oldest first), for the bar chart. */
  appointmentsPerDay: z.array(dailyAppointmentCountSchema),
  /** Live count of `GET /admin/appointments/issues`' result — same detection, not cached. */
  openIssuesCount: z.number().int(),
  /** Newest 10 `AuditLog` entries. */
  recentAuditEntries: z.array(auditLogSchema),
});
export type AdminDashboard = z.infer<typeof adminDashboardSchema>;
