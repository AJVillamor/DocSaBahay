import { Injectable } from '@nestjs/common';
import { BOOKING_HORIZON_DAYS, LEAD_TIME_MINUTES } from '@doksabahay/shared';
import { AccountStatus, AppointmentStatus, VerificationStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { DoctorNotBookableException } from './doctors.exceptions';
import { computeFreeSlots, type Slot } from './slot-engine';

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
}
