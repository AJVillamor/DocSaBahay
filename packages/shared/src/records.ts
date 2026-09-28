import { z } from 'zod';

import { appointmentDoctorSchema, appointmentPersonSchema } from './appointments';
import { NoteStatus, PrescriptionStatus } from './enums';

/** Max length of every free-text `ConsultationNote` field. */
export const NOTE_FIELD_MAX_LENGTH = 5000;

/** Max length of each free-text `PrescriptionItem` field. */
export const MEDICATION_FIELD_MAX_LENGTH = 200;
export const PRESCRIPTION_INSTRUCTIONS_MAX_LENGTH = 500;

/** A prescription upsert must carry between 1 and 15 items. */
export const PRESCRIPTION_ITEMS_MIN = 1;
export const PRESCRIPTION_ITEMS_MAX = 15;

const noteFieldSchema = z
  .string()
  .max(NOTE_FIELD_MAX_LENGTH, `Use at most ${NOTE_FIELD_MAX_LENGTH} characters.`);

const optionalNoteFieldSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  noteFieldSchema.optional(),
);

/**
 * Body of `PUT /consultations/:appointmentId/note`. Every field may be blank
 * — this upserts a DRAFT, and the doctor may still be mid-visit — only
 * `POST .../note/finalize` enforces the required fields are non-empty.
 */
export const upsertConsultationNoteSchema = z.object({
  chiefComplaint: noteFieldSchema,
  findings: noteFieldSchema,
  diagnosis: optionalNoteFieldSchema,
  recommendations: noteFieldSchema,
  summary: noteFieldSchema,
});

export type UpsertConsultationNoteInput = z.infer<typeof upsertConsultationNoteSchema>;

/** Response body wherever a `ConsultationNote` is returned. */
export const consultationNoteSchema = z.object({
  id: z.uuid(),
  appointmentId: z.uuid(),
  doctorId: z.uuid(),
  patientId: z.uuid(),
  chiefComplaint: z.string(),
  findings: z.string(),
  diagnosis: z.string().nullable(),
  recommendations: z.string(),
  summary: z.string(),
  status: z.enum(NoteStatus),
  finalizedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ConsultationNote = z.infer<typeof consultationNoteSchema>;

const medicationFieldSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}.`)
    .max(MEDICATION_FIELD_MAX_LENGTH, `Use at most ${MEDICATION_FIELD_MAX_LENGTH} characters.`);

const optionalInstructionsSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z
    .string()
    .trim()
    .max(
      PRESCRIPTION_INSTRUCTIONS_MAX_LENGTH,
      `Use at most ${PRESCRIPTION_INSTRUCTIONS_MAX_LENGTH} characters.`,
    )
    .optional(),
);

/** One medication row, both as submitted and as returned (the response extends this with `id`). */
export const prescriptionItemInputSchema = z.object({
  medicationName: medicationFieldSchema('the medication name'),
  dosage: medicationFieldSchema('the dosage'),
  frequency: medicationFieldSchema('the frequency'),
  duration: medicationFieldSchema('the duration'),
  instructions: optionalInstructionsSchema,
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemInputSchema>;

export const prescriptionItemSchema = prescriptionItemInputSchema.extend({ id: z.uuid() });

export type PrescriptionItem = z.infer<typeof prescriptionItemSchema>;

/** Body of `POST`/`PUT /consultations/:appointmentId/prescriptions`. */
export const upsertPrescriptionSchema = z.object({
  items: z
    .array(prescriptionItemInputSchema)
    .min(PRESCRIPTION_ITEMS_MIN, 'Add at least one medication.')
    .max(PRESCRIPTION_ITEMS_MAX, `Add at most ${PRESCRIPTION_ITEMS_MAX} medications.`),
});

export type UpsertPrescriptionInput = z.infer<typeof upsertPrescriptionSchema>;

/** Response body wherever a `Prescription` is returned. */
export const prescriptionSchema = z.object({
  id: z.uuid(),
  appointmentId: z.uuid(),
  doctorId: z.uuid(),
  patientId: z.uuid(),
  status: z.enum(PrescriptionStatus),
  issuedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  items: z.array(prescriptionItemSchema),
});

export type Prescription = z.infer<typeof prescriptionSchema>;

/** Response body of `GET /consultations/:appointmentId/prescriptions` (every prescription on the appointment, any status). */
export const prescriptionListSchema = z.object({
  items: z.array(prescriptionSchema),
});

export type PrescriptionList = z.infer<typeof prescriptionListSchema>;

/**
 * One past consultation on a patient's (or a treating doctor's view of a
 * patient's) records timeline. `note` is only present when FINALIZED and
 * `prescriptions` only lists ISSUED ones — `RecordsAccessPolicy` on the API
 * never lets a draft reach this shape. `doctor` and `patient` are both always
 * present (mirroring `Appointment`'s own shape) so this one schema serves
 * both the patient's own records page and the doctor's per-patient view.
 */
export const recordEntrySchema = z.object({
  appointmentId: z.uuid(),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  reasonForVisit: z.string(),
  doctor: appointmentDoctorSchema,
  patient: appointmentPersonSchema,
  note: consultationNoteSchema.nullable(),
  prescriptions: z.array(prescriptionSchema),
});

export type RecordEntry = z.infer<typeof recordEntrySchema>;

/** Response body of `GET /records/me` and `GET /patients/:id/records`. Newest first. */
export const patientRecordsTimelineSchema = z.object({
  items: z.array(recordEntrySchema),
});

export type PatientRecordsTimeline = z.infer<typeof patientRecordsTimelineSchema>;

/** One patient under a doctor's care, as listed by `GET /doctors/me/patients`. */
export const doctorPatientSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  lastAppointmentAt: z.iso.datetime().nullable(),
});

export type DoctorPatient = z.infer<typeof doctorPatientSchema>;

/** Response body of `GET /doctors/me/patients`. */
export const doctorPatientListSchema = z.object({
  items: z.array(doctorPatientSchema),
});

export type DoctorPatientList = z.infer<typeof doctorPatientListSchema>;
