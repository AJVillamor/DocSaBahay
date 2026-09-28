import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppointmentStatus, NotificationType } from '@prisma/client';
import { DateTime } from 'luxon';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

const APPOINTMENTS_LINK = {
  PATIENT: '/patient/appointments',
  DOCTOR: '/doctor/appointments',
} as const;

/**
 * One reminder lead time to fire at, paired with the literal string used in
 * `Notification.dedupeKey` (see the class doc comment for why it's literal).
 */
interface ReminderOffset {
  /** Literal tag baked into the dedupe key — intentionally not the numeric ms value. */
  tag: '24h' | '15m';
  /** How long before `startAt` this reminder should fire. */
  leadTimeMs: number;
}

const REMINDER_OFFSETS: readonly ReminderOffset[] = [
  { tag: '24h', leadTimeMs: 24 * 60 * 60_000 },
  { tag: '15m', leadTimeMs: 15 * 60_000 },
];

/**
 * Half-width of the query window around each target lead time, in
 * milliseconds. The cron ticks every 5 minutes
 * (`CronExpression.EVERY_5_MINUTES`, aligned to :00/:05/:10/…), so a
 * half-width of 2.5 minutes makes each tick's window exactly abut its
 * neighbours: appointment start times are covered by exactly one tick's
 * window each, with no gap where a reminder could be missed and no overlap
 * where the same appointment could fall inside two different ticks' windows
 * (the `dedupeKey` on `Notification.create` makes a double-send harmless
 * even so, but a tight window keeps this job from doing needless duplicate
 * work on every run).
 */
const WINDOW_HALF_WIDTH_MS = 2.5 * 60_000;

/**
 * Every 5 minutes, sends an `APPOINTMENT_REMINDER` notification to both
 * participants of every `SCHEDULED` appointment starting in ~24 hours or
 * ~15 minutes. Reruns and slightly-overlapping windows are safe because
 * `NotificationsService.create`'s `dedupeKey` handling silently no-ops a
 * duplicate: this job relies on that rather than trying to track "already
 * reminded" state itself.
 */
@Injectable()
export class ReminderJob {
  private readonly logger = new Logger(ReminderJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendDueReminders(): Promise<void> {
    const now = Date.now();
    for (const offset of REMINDER_OFFSETS) {
      await this.sendForOffset(now, offset);
    }
  }

  private async sendForOffset(now: number, offset: ReminderOffset): Promise<void> {
    const target = now + offset.leadTimeMs;
    const windowStart = new Date(target - WINDOW_HALF_WIDTH_MS);
    const windowEnd = new Date(target + WINDOW_HALF_WIDTH_MS);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.SCHEDULED,
        startAt: { gte: windowStart, lt: windowEnd },
      },
      select: { id: true, patientId: true, doctorId: true, startAt: true },
    });

    for (const appointment of appointments) {
      const when = DateTime.fromJSDate(appointment.startAt, { zone: 'utc' }).toFormat(
        "LLL d, yyyy 'at' h:mm a 'UTC'",
      );
      const participants: { userId: string; role: 'PATIENT' | 'DOCTOR' }[] = [
        { userId: appointment.patientId, role: 'PATIENT' },
        { userId: appointment.doctorId, role: 'DOCTOR' },
      ];
      for (const participant of participants) {
        await this.notifications.create(
          participant.userId,
          NotificationType.APPOINTMENT_REMINDER,
          offset.tag === '24h' ? 'Appointment tomorrow' : 'Appointment starting soon',
          `Reminder: your appointment is on ${when}.`,
          APPOINTMENTS_LINK[participant.role],
          `reminder:${appointment.id}:${offset.tag}:${participant.userId}`,
        );
      }
    }

    if (appointments.length > 0) {
      this.logger.debug(`Sent ${offset.tag} reminders for ${appointments.length} appointment(s).`);
    }
  }
}
