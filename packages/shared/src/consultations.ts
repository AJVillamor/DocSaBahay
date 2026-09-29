import { z } from 'zod';

import { appointmentDoctorSchema, appointmentPersonSchema } from './appointments';
import { AppointmentStatus, SessionState } from './enums';

/** A consultation may be joined starting this many minutes before `Appointment.startAt`. */
export const CONSULTATION_JOIN_LEAD_MINUTES = 10;

/** A consultation may still be joined until this many minutes after `Appointment.endAt`. */
export const CONSULTATION_JOIN_GRACE_MINUTES = 30;

/** How long after `startAt` the patient must join before the doctor may report a no-show. */
export const CONSULTATION_NO_SHOW_GRACE_MINUTES = 15;

/** Fallback poll interval for `GET /consultations/:appointmentId` while the socket is disconnected. */
export const CONSULTATION_POLL_INTERVAL_MS = 5_000;

/** Max length of a consultation chat message body. */
export const MESSAGE_BODY_MAX_LENGTH = 2_000;

/**
 * Whether `now` falls inside the join window for an appointment spanning
 * `startAt`–`endAt`. Shared by `ConsultationsService` (enforcement) and the
 * web app (pre-validation only — the API is always the source of truth).
 */
export function isWithinJoinWindow(
  startAt: string | Date,
  endAt: string | Date,
  now: Date = new Date(),
): boolean {
  const earliest = new Date(startAt).getTime() - CONSULTATION_JOIN_LEAD_MINUTES * 60_000;
  const latest = new Date(endAt).getTime() + CONSULTATION_JOIN_GRACE_MINUTES * 60_000;
  const t = now.getTime();
  return t >= earliest && t <= latest;
}

/** The doctor on a consultation, as shown to either participant. */
export const consultationDoctorSchema = appointmentDoctorSchema.extend({
  specializations: z.array(z.object({ name: z.string() })),
});

/**
 * A snapshot of the patient's profile plus visit history, shown only to the
 * doctor on the consultation (never to the patient, who already knows their
 * own profile from `/patient/profile`).
 */
export const consultationPatientSummarySchema = z.object({
  age: z.number().int().nullable(),
  weightKg: z.number().nullable(),
  heightCm: z.number().nullable(),
  allergies: z.string().nullable(),
  chronicConditions: z.string().nullable(),
  currentMedications: z.string().nullable(),
  previousCompletedConsultations: z.number().int(),
});

export type ConsultationPatientSummary = z.infer<typeof consultationPatientSummarySchema>;

/** Response body of every `/consultations/:appointmentId*` endpoint. */
export const consultationSessionSchema = z.object({
  id: z.uuid(),
  appointmentId: z.uuid(),
  state: z.enum(SessionState),
  patientJoinedAt: z.iso.datetime().nullable(),
  doctorJoinedAt: z.iso.datetime().nullable(),
  startedAt: z.iso.datetime().nullable(),
  endedAt: z.iso.datetime().nullable(),
  appointment: z.object({
    id: z.uuid(),
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
    status: z.enum(AppointmentStatus),
    reasonForVisit: z.string(),
    patient: appointmentPersonSchema,
    doctor: consultationDoctorSchema,
  }),
  /** Only present when the caller is the doctor on this consultation. */
  patientSummary: consultationPatientSummarySchema.nullable(),
});

export type ConsultationSession = z.infer<typeof consultationSessionSchema>;

/**
 * Socket.io event broadcast to room `consultation:{appointmentId}` after
 * every actual `SessionState` transition. Unlike the notification gateway's
 * id-only change-hint, this is a live status board, so a full state snapshot
 * is sent directly — clients still refetch `GET /consultations/:appointmentId`
 * on receipt (and poll every `CONSULTATION_POLL_INTERVAL_MS` as a fallback
 * when the socket is disconnected) rather than trusting it as the sole
 * source of truth.
 */
export const CONSULTATION_STATE_EVENT = 'consultation:state';

export const consultationStateEventSchema = z.object({
  appointmentId: z.uuid(),
  state: z.enum(SessionState),
  patientJoinedAt: z.iso.datetime().nullable(),
  doctorJoinedAt: z.iso.datetime().nullable(),
  startedAt: z.iso.datetime().nullable(),
  endedAt: z.iso.datetime().nullable(),
});

export type ConsultationStateEvent = z.infer<typeof consultationStateEventSchema>;

/**
 * Socket.io event broadcast to room `consultation:{appointmentId}` whenever a
 * participant's socket joins or leaves that room, so the other participant's
 * presence dot can update live.
 */
export const CONSULTATION_PRESENCE_EVENT = 'consultation:presence';

export const consultationPresenceEventSchema = z.object({
  appointmentId: z.uuid(),
  userId: z.uuid(),
  online: z.boolean(),
});

export type ConsultationPresenceEvent = z.infer<typeof consultationPresenceEventSchema>;

/**
 * One chat message sent within a consultation. Only ever readable/sendable
 * once the session has reached `IN_PROGRESS` (see
 * `ConsultationsService.assertMessagingReadable`/`assertMessagingWritable`) —
 * this is a live consultation chat, not a persistent inbox.
 */
export const consultationMessageSchema = z.object({
  id: z.uuid(),
  appointmentId: z.uuid(),
  senderId: z.uuid(),
  body: z.string(),
  createdAt: z.iso.datetime(),
});

export type ConsultationMessage = z.infer<typeof consultationMessageSchema>;

/**
 * Socket.io event broadcast to room `consultation:{appointmentId}` when
 * either participant sends a chat message. Like `CONSULTATION_STATE_EVENT`,
 * the full message is pushed directly (not just a change-hint) since this
 * room is already a live status board — but `POST .../messages` remains the
 * only source of truth (the message is persisted there first), and the web
 * client falls back to polling `GET .../messages` while disconnected.
 */
export const CONSULTATION_MESSAGE_EVENT = 'consultation:message';

export const consultationMessageEventSchema = z.object({
  appointmentId: z.uuid(),
  message: consultationMessageSchema,
});

export type ConsultationMessageEvent = z.infer<typeof consultationMessageEventSchema>;
