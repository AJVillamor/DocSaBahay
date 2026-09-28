import { AppointmentStatus, Prisma, SessionState } from '@prisma/client';

/**
 * Shared `include` for every admin appointment read (list, detail, issue
 * detection): participants' display names plus each session's live `state`.
 * Deliberately never joins `note`/`prescription` — admin oversight of
 * logistics never carries clinical content, matching the (separately
 * enforced) `RecordsAccessPolicy` denial of clinical content to admins.
 */
export const ADMIN_APPOINTMENT_SUMMARY_INCLUDE = {
  patient: {
    select: {
      id: true,
      status: true,
      patientProfile: { select: { firstName: true, lastName: true } },
    },
  },
  doctor: {
    select: {
      id: true,
      status: true,
      doctorProfile: {
        select: { firstName: true, lastName: true, title: true, verificationStatus: true },
      },
    },
  },
  session: { select: { state: true } },
} satisfies Prisma.AppointmentInclude;

export type AdminAppointmentRow = Prisma.AppointmentGetPayload<{
  include: typeof ADMIN_APPOINTMENT_SUMMARY_INCLUDE;
}>;

/**
 * Response shape, typed with Prisma's enums (not `@doksabahay/shared`'s
 * zod-inferred ones — see the matching note in `admin-users.service.ts`).
 */
export interface AdminAppointmentSummaryDto {
  id: string;
  doctorId: string;
  patientId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  reasonForVisit: string;
  cancelledById: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  patient: { id: string; firstName: string; lastName: string };
  doctor: { id: string; firstName: string; lastName: string; title: string };
  sessionState: SessionState;
}

/** Maps one `Appointment` row (with {@link ADMIN_APPOINTMENT_SUMMARY_INCLUDE}) to the API shape. */
export function toAdminAppointmentSummary(row: AdminAppointmentRow): AdminAppointmentSummaryDto {
  return {
    id: row.id,
    doctorId: row.doctorId,
    patientId: row.patientId,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    status: row.status,
    reasonForVisit: row.reasonForVisit,
    cancelledById: row.cancelledById,
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
    cancellationReason: row.cancellationReason,
    createdAt: row.createdAt.toISOString(),
    patient: {
      id: row.patient.id,
      firstName: row.patient.patientProfile?.firstName ?? '',
      lastName: row.patient.patientProfile?.lastName ?? '',
    },
    doctor: {
      id: row.doctor.id,
      firstName: row.doctor.doctorProfile?.firstName ?? '',
      lastName: row.doctor.doctorProfile?.lastName ?? '',
      title: row.doctor.doctorProfile?.title ?? '',
    },
    sessionState: row.session?.state ?? SessionState.SCHEDULED,
  };
}
