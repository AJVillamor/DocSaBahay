import { z } from 'zod';

import { AppointmentStatus } from './enums';

/** Page size for `GET /appointments`. */
export const APPOINTMENTS_PAGE_SIZE = 10;

/** Body of `POST /appointments`. */
export const createAppointmentSchema = z.object({
  doctorId: z.uuid(),
  startAt: z.iso.datetime({ message: 'Choose a valid time.' }),
  reasonForVisit: z
    .string()
    .trim()
    .min(5, 'Use at least 5 characters.')
    .max(500, 'Use at most 500 characters.'),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

/** Body of `PATCH /appointments/:id/reschedule`. */
export const rescheduleAppointmentSchema = z.object({
  startAt: z.iso.datetime({ message: 'Choose a valid time.' }),
});

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

/** Body of `POST /appointments/:id/cancel`. Required only when the caller is the doctor. */
export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().max(500, 'Use at most 500 characters.').optional(),
});

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

/** The other participant on an appointment, as shown to the caller. */
export const appointmentPersonSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
});

export const appointmentDoctorSchema = appointmentPersonSchema.extend({
  title: z.string(),
});

/** One appointment, as returned by every `/appointments*` endpoint. */
export const appointmentSchema = z.object({
  id: z.uuid(),
  doctorId: z.uuid(),
  patientId: z.uuid(),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  status: z.enum(AppointmentStatus),
  reasonForVisit: z.string(),
  cancelledById: z.uuid().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  cancellationReason: z.string().nullable(),
  version: z.number().int(),
  createdAt: z.iso.datetime(),
  patient: appointmentPersonSchema,
  doctor: appointmentDoctorSchema,
});

export type Appointment = z.infer<typeof appointmentSchema>;

/** Response body of `GET /appointments`. */
export const paginatedAppointmentsSchema = z.object({
  items: z.array(appointmentSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
});

export type PaginatedAppointments = z.infer<typeof paginatedAppointmentsSchema>;
