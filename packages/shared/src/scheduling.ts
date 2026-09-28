/**
 * Scheduling constants shared by the API's slot engine and the web app.
 */

/** A slot may not start less than this many minutes from now. */
export const LEAD_TIME_MINUTES = 60;

/** A slot may not start more than this many days from now. */
export const BOOKING_HORIZON_DAYS = 60;

/** A patient may hold at most this many upcoming (SCHEDULED, not-yet-started) appointments. */
export const MAX_UPCOMING_PER_PATIENT = 5;

/** A SCHEDULED appointment may be rescheduled only until this many minutes before its `startAt`. */
export const RESCHEDULE_CUTOFF_MINUTES = 120;
