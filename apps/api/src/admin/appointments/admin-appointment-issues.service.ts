import { Injectable } from '@nestjs/common';
import { STALE_SESSION_GRACE_MINUTES, type AdminAppointmentIssueType } from '@doksabahay/shared';
import { AccountStatus, AppointmentStatus, SessionState, VerificationStatus } from '@prisma/client';

import { SlotService } from '../../doctors/slot.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ADMIN_APPOINTMENT_SUMMARY_INCLUDE,
  toAdminAppointmentSummary,
  type AdminAppointmentRow,
  type AdminAppointmentSummaryDto,
} from './admin-appointments.mapper';

/** One issue found by `AdminAppointmentIssuesService.detect`. */
export interface AdminAppointmentIssueDto {
  issueType: AdminAppointmentIssueType;
  appointment: AdminAppointmentSummaryDto;
}

/**
 * Detects SCHEDULED appointments that have become invalid since they were
 * booked. Shared by `GET /admin/appointments/issues` (full list) and
 * `GET /admin/dashboard` (just the count) so the two never disagree —
 * neither recomputes this with a second implementation.
 */
@Injectable()
export class AdminAppointmentIssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slots: SlotService,
  ) {}

  /**
   * Re-validates every SCHEDULED appointment against four conditions (see
   * `AdminAppointmentIssueType`). An appointment can appear once per issue
   * type it currently matches (never deduplicated to one row), so an admin
   * sees every reason, not just the first one found.
   */
  async detect(): Promise<AdminAppointmentIssueDto[]> {
    const staleCutoff = new Date(Date.now() - STALE_SESSION_GRACE_MINUTES * 60_000);

    const appointments = await this.prisma.appointment.findMany({
      where: { status: AppointmentStatus.SCHEDULED },
      include: ADMIN_APPOINTMENT_SUMMARY_INCLUDE,
      orderBy: { startAt: 'asc' },
    });

    // One availability check per appointment (SlotService.isCurrentlyAvailable does its own
    // doctor lookup), run in parallel — fine at prototype scale; see the doc comment on that
    // method for why it is not batched further.
    const availabilityChecks = await Promise.all(
      appointments.map((appointment) =>
        this.slots.isCurrentlyAvailable(appointment.doctorId, appointment.startAt, appointment.endAt),
      ),
    );

    const issues: AdminAppointmentIssueDto[] = [];
    appointments.forEach((appointment, index) => {
      const isWithinAvailability = availabilityChecks[index] ?? false;
      for (const issueType of this.issuesFor(appointment, isWithinAvailability, staleCutoff)) {
        issues.push({ issueType, appointment: toAdminAppointmentSummary(appointment) });
      }
    });

    return issues;
  }

  private *issuesFor(
    appointment: AdminAppointmentRow,
    isWithinAvailability: boolean,
    staleCutoff: Date,
  ): Generator<AdminAppointmentIssueType> {
    const doctorProfile = appointment.doctor.doctorProfile;
    const doctorNotBookable =
      !doctorProfile ||
      doctorProfile.verificationStatus !== VerificationStatus.APPROVED ||
      appointment.doctor.status !== AccountStatus.ACTIVE;
    if (doctorNotBookable) {
      yield 'DOCTOR_NOT_BOOKABLE';
    }

    if (appointment.patient.status !== AccountStatus.ACTIVE) {
      yield 'PATIENT_INACTIVE';
    }

    // Only meaningful when the doctor has a profile at all — otherwise DOCTOR_NOT_BOOKABLE already covers it.
    if (doctorProfile && !isWithinAvailability) {
      yield 'OUTSIDE_AVAILABILITY';
    }

    const staleUnstarted = appointment.endAt < staleCutoff && appointment.session?.state === SessionState.SCHEDULED;
    if (staleUnstarted) {
      yield 'STALE_UNSTARTED';
    }
  }
}
