import { DateTime } from 'luxon';

export interface TimeRange {
  startAt: Date;
  endAt: Date;
}

export interface WeeklyRule {
  /** 0 = Sunday … 6 = Saturday. */
  dayOfWeek: number;
  /** "HH:mm" in the doctor's timezone. */
  startTime: string;
  endTime: string;
}

export interface DoctorCalendar {
  id: string;
  timezone: string;
  consultationMinutes: number;
  rules: WeeklyRule[];
  exceptions: TimeRange[];
}

const overlaps = (a: TimeRange, b: TimeRange): boolean =>
  a.startAt < b.endAt && b.startAt < a.endAt;

function atLocalTime(day: DateTime, hhmm: string): DateTime {
  const [hour, minute] = hhmm.split(':').map(Number);
  return day.set({ hour, minute, second: 0, millisecond: 0 });
}

/**
 * Lists the consultation slots a doctor offers on one local calendar day,
 * derived from the weekly rules and excluding availability exceptions.
 *
 * @param day Any instant on the day, in the doctor's timezone.
 */
export function slotsOnDay(calendar: DoctorCalendar, day: DateTime): TimeRange[] {
  const localDay = day.setZone(calendar.timezone).startOf('day');
  const dayOfWeek = localDay.weekday % 7; // Luxon: 1 = Monday … 7 = Sunday.
  const slots: TimeRange[] = [];

  for (const rule of calendar.rules.filter((r) => r.dayOfWeek === dayOfWeek)) {
    const windowEnd = atLocalTime(localDay, rule.endTime);
    let start = atLocalTime(localDay, rule.startTime);
    while (start.plus({ minutes: calendar.consultationMinutes }) <= windowEnd) {
      const end = start.plus({ minutes: calendar.consultationMinutes });
      const slot = { startAt: start.toJSDate(), endAt: end.toJSDate() };
      if (!calendar.exceptions.some((blocked) => overlaps(blocked, slot))) {
        slots.push(slot);
      }
      start = end;
    }
  }
  return slots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/**
 * Hands out non-overlapping slots. Every reserved slot blocks both the doctor
 * and the patient, whatever the appointment's final status, so the seed never
 * produces overlapping appointments.
 */
export class SlotScheduler {
  private readonly busy = new Map<string, TimeRange[]>();

  /**
   * Reserves the earliest slot in `[from, until]` that is free for both parties.
   *
   * @throws Error when no slot fits, so a bad scenario fails loudly.
   */
  reserve(calendar: DoctorCalendar, patientId: string, from: DateTime, until: DateTime): TimeRange {
    let day = from.setZone(calendar.timezone).startOf('day');
    while (day <= until) {
      for (const slot of slotsOnDay(calendar, day)) {
        if (
          slot.startAt >= from.toJSDate() &&
          slot.endAt <= until.toJSDate() &&
          this.isFree(calendar.id, slot) &&
          this.isFree(patientId, slot)
        ) {
          this.block(calendar.id, slot);
          this.block(patientId, slot);
          return slot;
        }
      }
      day = day.plus({ days: 1 });
    }
    throw new Error(
      `No free slot for doctor ${calendar.id} between ${from.toISO()} and ${until.toISO()}.`,
    );
  }

  private isFree(ownerId: string, slot: TimeRange): boolean {
    return !(this.busy.get(ownerId) ?? []).some((taken) => overlaps(taken, slot));
  }

  private block(ownerId: string, slot: TimeRange): void {
    this.busy.set(ownerId, [...(this.busy.get(ownerId) ?? []), slot]);
  }
}
