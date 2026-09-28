import { Injectable } from '@nestjs/common';
import { AppointmentStatus, type Prisma } from '@prisma/client';
import { DateTime } from 'luxon';

import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateAvailabilityExceptionDto,
  UpdateAvailabilityExceptionDto,
} from './dto/availability-exception.dto';
import type {
  CreateAvailabilityRuleDto,
  UpdateAvailabilityRuleDto,
} from './dto/availability-rule.dto';
import {
  AvailabilityExceptionNotFoundException,
  AvailabilityRuleNotFoundException,
  InvalidAvailabilityExceptionException,
  InvalidAvailabilityRuleException,
  RuleOverlapException,
  ScheduleConflictException,
  type AffectedAppointment,
} from './doctors.exceptions';

type Tx = Prisma.TransactionClient;

interface RuleWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/** `hh:mm` -> minutes since midnight. */
function minutesOf(hhmm: string): number {
  const parts = hhmm.split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

/**
 * CRUD for a doctor's weekly `AvailabilityRule`s and one-off
 * `AvailabilityException`s, with the invariants the slot engine relies on:
 * rules on the same day never overlap, and neither a rule nor an exception
 * change may silently orphan a SCHEDULED appointment.
 */
@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lists the signed-in doctor's weekly availability rules. */
  listRules(doctorId: string) {
    return this.prisma.availabilityRule.findMany({
      where: { doctorId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
    });
  }

  /**
   * @throws InvalidAvailabilityRuleException if `endTime` is not after
   *   `startTime`, or either time is not on a 15-minute increment.
   * @throws RuleOverlapException if the rule overlaps another rule on the same day.
   */
  async createRule(doctorId: string, dto: CreateAvailabilityRuleDto) {
    validateRuleWindow(dto);
    return this.prisma.$transaction(async (tx) => {
      await assertNoOverlap(tx, doctorId, dto);
      return tx.availabilityRule.create({
        data: {
          doctorId,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime,
          endTime: dto.endTime,
        },
        select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
      });
    });
  }

  /**
   * @throws AvailabilityRuleNotFoundException if `id` is not one of the doctor's rules.
   * @throws InvalidAvailabilityRuleException / RuleOverlapException, see `createRule`.
   * @throws ScheduleConflictException if narrowing the window would orphan a
   *   SCHEDULED appointment that only the old window covered.
   */
  async updateRule(doctorId: string, id: string, dto: UpdateAvailabilityRuleDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.availabilityRule.findFirst({ where: { id, doctorId } });
      if (!existing) {
        throw new AvailabilityRuleNotFoundException();
      }
      const candidate: RuleWindow = {
        dayOfWeek: dto.dayOfWeek ?? existing.dayOfWeek,
        startTime: dto.startTime ?? existing.startTime,
        endTime: dto.endTime ?? existing.endTime,
      };
      validateRuleWindow(candidate);
      await assertNoOverlap(tx, doctorId, candidate, id);

      const timezone = await doctorTimezone(tx, doctorId);
      const previouslyCovered = await appointmentsInWindow(tx, doctorId, timezone, existing);
      const stillCovered = new Set(
        (await appointmentsInWindow(tx, doctorId, timezone, candidate)).map((a) => a.id),
      );
      const orphaned = previouslyCovered.filter((a) => !stillCovered.has(a.id));
      if (orphaned.length > 0) {
        throw new ScheduleConflictException(orphaned.map(toAffectedAppointment));
      }

      return tx.availabilityRule.update({
        where: { id },
        data: candidate,
        select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
      });
    });
  }

  /**
   * @throws AvailabilityRuleNotFoundException if `id` is not one of the doctor's rules.
   * @throws ScheduleConflictException if the rule still covers a SCHEDULED appointment.
   */
  async deleteRule(doctorId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.availabilityRule.findFirst({ where: { id, doctorId } });
      if (!existing) {
        throw new AvailabilityRuleNotFoundException();
      }
      const timezone = await doctorTimezone(tx, doctorId);
      const covered = await appointmentsInWindow(tx, doctorId, timezone, existing);
      if (covered.length > 0) {
        throw new ScheduleConflictException(covered.map(toAffectedAppointment));
      }
      await tx.availabilityRule.delete({ where: { id } });
    });
  }

  /** Lists the signed-in doctor's availability exceptions (blocked time). */
  async listExceptions(doctorId: string) {
    const rows = await this.prisma.availabilityException.findMany({
      where: { doctorId },
      orderBy: { startAt: 'asc' },
      select: { id: true, startAt: true, endAt: true, reason: true },
    });
    return rows.map(toExceptionResponse);
  }

  /**
   * @throws InvalidAvailabilityExceptionException if `endAt` is not after `startAt`.
   * @throws ScheduleConflictException if the range covers a SCHEDULED appointment.
   */
  async createException(doctorId: string, dto: CreateAvailabilityExceptionDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (!(endAt > startAt)) {
      throw new InvalidAvailabilityExceptionException('endAt must be after startAt.');
    }

    return this.prisma.$transaction(async (tx) => {
      await assertNoBookingConflict(tx, doctorId, startAt, endAt);
      const created = await tx.availabilityException.create({
        data: { doctorId, startAt, endAt, reason: dto.reason },
        select: { id: true, startAt: true, endAt: true, reason: true },
      });
      return toExceptionResponse(created);
    });
  }

  /**
   * @throws AvailabilityExceptionNotFoundException if `id` is not one of the doctor's exceptions.
   * @throws InvalidAvailabilityExceptionException if `endAt` is not after `startAt`.
   * @throws ScheduleConflictException if the new range covers a SCHEDULED appointment.
   */
  async updateException(doctorId: string, id: string, dto: UpdateAvailabilityExceptionDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.availabilityException.findFirst({ where: { id, doctorId } });
      if (!existing) {
        throw new AvailabilityExceptionNotFoundException();
      }
      const startAt = dto.startAt ? new Date(dto.startAt) : existing.startAt;
      const endAt = dto.endAt ? new Date(dto.endAt) : existing.endAt;
      if (!(endAt > startAt)) {
        throw new InvalidAvailabilityExceptionException('endAt must be after startAt.');
      }
      await assertNoBookingConflict(tx, doctorId, startAt, endAt);

      const updated = await tx.availabilityException.update({
        where: { id },
        data: { startAt, endAt, reason: dto.reason ?? existing.reason },
        select: { id: true, startAt: true, endAt: true, reason: true },
      });
      return toExceptionResponse(updated);
    });
  }

  /**
   * Deleting an exception only restores availability, so it never orphans a
   * booked appointment — no conflict check is needed.
   *
   * @throws AvailabilityExceptionNotFoundException if `id` is not one of the doctor's exceptions.
   */
  async deleteException(doctorId: string, id: string): Promise<void> {
    const existing = await this.prisma.availabilityException.findFirst({
      where: { id, doctorId },
    });
    if (!existing) {
      throw new AvailabilityExceptionNotFoundException();
    }
    await this.prisma.availabilityException.delete({ where: { id } });
  }
}

/**
 * @throws InvalidAvailabilityRuleException if `endTime` is not after
 *   `startTime`, or either is not on a 15-minute increment. The DB `CHECK`
 *   only enforces the `HH:mm` format, not this.
 */
function validateRuleWindow(window: RuleWindow): void {
  const start = minutesOf(window.startTime);
  const end = minutesOf(window.endTime);
  if (end <= start) {
    throw new InvalidAvailabilityRuleException('endTime must be after startTime.');
  }
  if (start % 15 !== 0 || end % 15 !== 0) {
    throw new InvalidAvailabilityRuleException(
      'startTime and endTime must be on a 15-minute increment.',
    );
  }
}

/** @throws RuleOverlapException if `window` overlaps another rule on the same day. */
async function assertNoOverlap(
  tx: Tx,
  doctorId: string,
  window: RuleWindow,
  excludeId?: string,
): Promise<void> {
  const rules = await tx.availabilityRule.findMany({
    where: { doctorId, dayOfWeek: window.dayOfWeek, ...(excludeId && { id: { not: excludeId } }) },
    select: { startTime: true, endTime: true },
  });
  const start = minutesOf(window.startTime);
  const end = minutesOf(window.endTime);
  const overlaps = rules.some((rule) => {
    const ruleStart = minutesOf(rule.startTime);
    const ruleEnd = minutesOf(rule.endTime);
    return start < ruleEnd && ruleStart < end;
  });
  if (overlaps) {
    throw new RuleOverlapException();
  }
}

async function doctorTimezone(tx: Tx, doctorId: string): Promise<string> {
  const profile = await tx.doctorProfile.findUnique({
    where: { userId: doctorId },
    select: { timezone: true },
  });
  return profile?.timezone ?? 'UTC';
}

/**
 * Upcoming SCHEDULED appointments whose local start falls on `window.dayOfWeek`
 * and within `[window.startTime, window.endTime)`. Because same-day rules
 * never overlap (enforced by `assertNoOverlap`), any appointment in this
 * window is uniquely covered by this one rule.
 */
async function appointmentsInWindow(
  tx: Tx,
  doctorId: string,
  timezone: string,
  window: RuleWindow,
): Promise<{ id: string; startAt: Date; endAt: Date }[]> {
  const appointments = await tx.appointment.findMany({
    where: { doctorId, status: AppointmentStatus.SCHEDULED, startAt: { gte: new Date() } },
    select: { id: true, startAt: true, endAt: true },
  });
  const start = minutesOf(window.startTime);
  const end = minutesOf(window.endTime);
  return appointments.filter((appointment) => {
    const local = DateTime.fromJSDate(appointment.startAt, { zone: timezone });
    if (local.weekday % 7 !== window.dayOfWeek) {
      return false;
    }
    const minutes = local.hour * 60 + local.minute;
    return minutes >= start && minutes < end;
  });
}

/** @throws ScheduleConflictException if any SCHEDULED appointment overlaps `[startAt, endAt)`. */
async function assertNoBookingConflict(
  tx: Tx,
  doctorId: string,
  startAt: Date,
  endAt: Date,
): Promise<void> {
  const conflicts = await tx.appointment.findMany({
    where: {
      doctorId,
      status: AppointmentStatus.SCHEDULED,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true, startAt: true, endAt: true },
  });
  if (conflicts.length > 0) {
    throw new ScheduleConflictException(conflicts.map(toAffectedAppointment));
  }
}

function toAffectedAppointment(appointment: {
  id: string;
  startAt: Date;
  endAt: Date;
}): AffectedAppointment {
  return {
    id: appointment.id,
    startAt: appointment.startAt.toISOString(),
    endAt: appointment.endAt.toISOString(),
  };
}

function toExceptionResponse(exception: {
  id: string;
  startAt: Date;
  endAt: Date;
  reason: string | null;
}) {
  return {
    id: exception.id,
    startAt: exception.startAt.toISOString(),
    endAt: exception.endAt.toISOString(),
    reason: exception.reason,
  };
}
