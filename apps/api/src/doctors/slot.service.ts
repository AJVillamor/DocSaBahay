import { Injectable } from '@nestjs/common';
import { BOOKING_HORIZON_DAYS, LEAD_TIME_MINUTES } from '@doksabahay/shared';
import { AccountStatus, AppointmentStatus, VerificationStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { DoctorNotBookableException } from './doctors.exceptions';
import { computeFreeSlots, isInstantWithinAvailability, type Slot } from './slot-engine';

/**
 * Computes a doctor's free consultation slots. Reused as-is by the future
 * booking module to validate a requested `startAt`: fetch the same inputs
 * for the doctor and re-run `computeFreeSlots` (or call `getFreeSlots` with
 * a `[startAt, startAt + consultationMinutes)` window) to confirm the slot
 * is still free before creating the appointment.
 *
 * Import `SlotService` from `DoctorsModule`'s exports to reuse it elsewhere.
 */
@Injectable()
export class SlotService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists the doctor's free slots starting in `[from, to)`.
   *
   * @throws DoctorNotBookableException if the doctor does not exist, or is
   *   not `verificationStatus: APPROVED` and account `status: ACTIVE` — the
   *   same 404 either way so a caller cannot tell the two apart.
   */
  async getFreeSlots(doctorId: string, from: Date, to: Date): Promise<Slot[]> {
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      select: {
        status: true,
        doctorProfile: {
          select: { timezone: true, consultationMinutes: true, verificationStatus: true },
        },
      },
    });
    if (
      !doctor?.doctorProfile ||
      doctor.status !== AccountStatus.ACTIVE ||
      doctor.doctorProfile.verificationStatus !== VerificationStatus.APPROVED
    ) {
      throw new DoctorNotBookableException();
    }

    const [rules, exceptions, appointments] = await Promise.all([
      this.prisma.availabilityRule.findMany({
        where: { doctorId },
        select: { dayOfWeek: true, startTime: true, endTime: true },
      }),
      this.prisma.availabilityException.findMany({
        where: { doctorId, startAt: { lt: to }, endAt: { gt: from } },
        select: { startAt: true, endAt: true },
      }),
      this.prisma.appointment.findMany({
        where: {
          doctorId,
          status: AppointmentStatus.SCHEDULED,
          startAt: { lt: to },
          endAt: { gt: from },
        },
        select: { startAt: true, endAt: true },
      }),
    ]);

    return computeFreeSlots({
      timezone: doctor.doctorProfile.timezone,
      consultationMinutes: doctor.doctorProfile.consultationMinutes,
      rules,
      exceptions,
      bookedAppointments: appointments,
      from,
      to,
      now: new Date(),
      leadTimeMinutes: LEAD_TIME_MINUTES,
      horizonDays: BOOKING_HORIZON_DAYS,
    });
  }

  /**
   * Checks whether `[startAt, endAt)` falls inside the doctor's *current*
   * `AvailabilityRule`s (minus `AvailabilityException`s) — unlike
   * `getFreeSlots`, this does not require step-alignment to
   * `consultationMinutes`, does not check verification/account status, and
   * does not consider other booked appointments. Used by admin appointment
   * issue detection to catch a SCHEDULED appointment whose doctor changed
   * their schedule after it was booked; a doctor's own bookability is
   * checked separately there.
   *
   * @returns `false` (never throws) if the doctor has no `DoctorProfile`.
   */
  async isCurrentlyAvailable(doctorId: string, startAt: Date, endAt: Date): Promise<boolean> {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
      select: { timezone: true },
    });
    if (!profile) {
      return false;
    }

    const [rules, exceptions] = await Promise.all([
      this.prisma.availabilityRule.findMany({
        where: { doctorId },
        select: { dayOfWeek: true, startTime: true, endTime: true },
      }),
      this.prisma.availabilityException.findMany({
        where: { doctorId, startAt: { lt: endAt }, endAt: { gt: startAt } },
        select: { startAt: true, endAt: true },
      }),
    ]);

    return isInstantWithinAvailability({ timezone: profile.timezone, rules, exceptions, startAt, endAt });
  }
}
