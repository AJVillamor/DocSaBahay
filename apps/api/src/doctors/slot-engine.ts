import { DateTime } from 'luxon';

/** A doctor's weekly recurring availability rule. Times are "HH:mm" in the doctor's timezone. */
export interface WeeklyRule {
  /** 0 = Sunday … 6 = Saturday. */
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/** An instant range in UTC. */
export interface TimeRange {
  startAt: Date;
  endAt: Date;
}

/** One free consultation slot. */
export interface Slot {
  startAt: Date;
  endAt: Date;
}

export interface SlotEngineInput {
  /** IANA zone the doctor's rules are interpreted in, e.g. "Asia/Manila". */
  timezone: string;
  consultationMinutes: number;
  rules: WeeklyRule[];
  /** Blocked time that overrides the rules (e.g. time off). */
  exceptions: TimeRange[];
  /** Already-booked SCHEDULED appointments. */
  bookedAppointments: TimeRange[];
  /** Window to generate slots in. A slot must start in `[from, to)`. */
  from: Date;
  to: Date;
  /** Reference instant for the lead-time and horizon cutoffs. Injectable for tests. */
  now: Date;
  /** A slot may not start less than this many minutes after `now`. */
  leadTimeMinutes: number;
  /** A slot may not start more than this many days after `now`. */
  horizonDays: number;
}

function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}

/** Sets `hh:mm` on `day`'s local wall clock, re-anchoring the UTC offset for that specific date. */
export function atLocalTime(day: DateTime, hhmm: string): DateTime {
  const [hour, minute] = hhmm.split(':').map(Number);
  return day.set({ hour, minute, second: 0, millisecond: 0 });
}

/**
 * Generates the candidate consultation slots on one local calendar day from
 * the matching weekly rule(s), stepped by `consultationMinutes`. Each slot's
 * start/end is computed via `DateTime.set` on a `DateTime` already anchored
 * to the doctor's zone for that date, so the UTC instant reflects whatever
 * offset applies on that specific day (handling DST transitions correctly)
 * rather than a fixed offset carried over from another day.
 */
function candidateSlotsOnDay(
  localDay: DateTime,
  rules: WeeklyRule[],
  consultationMinutes: number,
): Slot[] {
  const dayOfWeek = localDay.weekday % 7; // Luxon: 1 = Monday … 7 = Sunday; Sunday % 7 = 0.
  const slots: Slot[] = [];

  for (const rule of rules.filter((r) => r.dayOfWeek === dayOfWeek)) {
    const windowEnd = atLocalTime(localDay, rule.endTime);
    let start = atLocalTime(localDay, rule.startTime);
    while (start.plus({ minutes: consultationMinutes }) <= windowEnd) {
      const end = start.plus({ minutes: consultationMinutes });
      slots.push({ startAt: start.toJSDate(), endAt: end.toJSDate() });
      start = end;
    }
  }
  return slots;
}

/**
 * Pure computation of a doctor's free consultation slots. Fetching the
 * doctor's rules/exceptions/appointments from the database is
 * `SlotService.getFreeSlots`'s job; this function only does the date math,
 * which is what makes it trivially unit-testable (see `slot-engine.spec.ts`)
 * without a database — including the DST-sensitive case.
 *
 * A slot is included only if it:
 * - starts in `[from, to)`;
 * - starts at or after `now + leadTimeMinutes`;
 * - starts at or before `now + horizonDays`;
 * - does not overlap any exception or already-booked appointment.
 */
export function computeFreeSlots(input: SlotEngineInput): Slot[] {
  const {
    timezone,
    consultationMinutes,
    rules,
    exceptions,
    bookedAppointments,
    from,
    to,
    now,
    leadTimeMinutes,
    horizonDays,
  } = input;

  const earliestAllowed = DateTime.fromJSDate(now).plus({ minutes: leadTimeMinutes }).toJSDate();
  const latestAllowed = DateTime.fromJSDate(now).plus({ days: horizonDays }).toJSDate();

  const slots: Slot[] = [];
  let day = DateTime.fromJSDate(from, { zone: timezone }).startOf('day');
  const lastDay = DateTime.fromJSDate(to, { zone: timezone }).startOf('day');

  while (day <= lastDay) {
    for (const candidate of candidateSlotsOnDay(day, rules, consultationMinutes)) {
      if (candidate.startAt < from || candidate.startAt >= to) continue;
      if (candidate.startAt < earliestAllowed) continue;
      if (candidate.startAt > latestAllowed) continue;
      if (exceptions.some((blocked) => overlaps(blocked, candidate))) continue;
      if (bookedAppointments.some((booked) => overlaps(booked, candidate))) continue;
      slots.push(candidate);
    }
    day = day.plus({ days: 1 });
  }

  return slots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/** Input to {@link isInstantWithinAvailability}. */
export interface InstantAvailabilityInput {
  /** IANA zone the doctor's rules are interpreted in. */
  timezone: string;
  rules: WeeklyRule[];
  /** Blocked time that overrides the rules. */
  exceptions: TimeRange[];
  startAt: Date;
  endAt: Date;
}

/**
 * Pure check: does `[startAt, endAt)` fall entirely inside one weekly rule's
 * window (in `timezone`) and outside every exception? Unlike
 * {@link computeFreeSlots}, this does not require `startAt` to land on a
 * `consultationMinutes`-stepped candidate boundary — it re-validates an
 * *existing* appointment's original `startAt`/`endAt` against a doctor's
 * *current* rules, which may have changed (e.g. a shortened window, or a
 * different `consultationMinutes`) since the appointment was booked. Does
 * not consider other booked appointments — that is a separate concern from
 * "is this instant still inside the doctor's stated availability".
 */
export function isInstantWithinAvailability(input: InstantAvailabilityInput): boolean {
  const { timezone, rules, exceptions, startAt, endAt } = input;
  const localDay = DateTime.fromJSDate(startAt, { zone: timezone }).startOf('day');
  const dayOfWeek = localDay.weekday % 7; // Luxon: 1 = Monday … 7 = Sunday; Sunday % 7 = 0.

  const coveredByRule = rules
    .filter((rule) => rule.dayOfWeek === dayOfWeek)
    .some((rule) => {
      const ruleStart = atLocalTime(localDay, rule.startTime).toJSDate();
      const ruleEnd = atLocalTime(localDay, rule.endTime).toJSDate();
      return ruleStart <= startAt && endAt <= ruleEnd;
    });
  if (!coveredByRule) {
    return false;
  }

  return !exceptions.some((exception) => overlaps(exception, { startAt, endAt }));
}
