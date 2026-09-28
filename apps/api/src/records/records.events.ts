/**
 * Domain event emitted when a note is finalized or a prescription is issued —
 * i.e. the moment either becomes visible to the patient. Consumed by
 * `NotificationsListener.onRecordAvailable` (wiring its previously-scaffolded
 * stub) to create a `RECORD_AVAILABLE` notification for the patient.
 */
export const RECORD_AVAILABLE_EVENT = 'record.available';

/** Payload of {@link RECORD_AVAILABLE_EVENT}. */
export interface RecordAvailableEvent {
  kind: 'note' | 'prescription';
  recordId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
}
