/**
 * Scheduling constants shared by the API's slot engine and the web app.
 * A later booking change adds `MAX_UPCOMING_PER_PATIENT` here too.
 */

/** A slot may not start less than this many minutes from now. */
export const LEAD_TIME_MINUTES = 60;

/** A slot may not start more than this many days from now. */
export const BOOKING_HORIZON_DAYS = 60;
