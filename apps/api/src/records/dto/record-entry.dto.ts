import { AppointmentPersonDto, AppointmentDoctorDto } from '../../appointments/dto/appointment-response.dto';
import { ConsultationNoteResponseDto } from './note-response.dto';
import { PrescriptionResponseDto } from './prescription-response.dto';

/**
 * One past consultation on a records timeline. Structurally mirrors
 * `@doksabahay/shared`'s `recordEntrySchema`. `note` is only present when
 * FINALIZED and `prescriptions` only lists ISSUED ones —
 * `RecordsAccessPolicy` never lets a draft reach this shape. `doctor` and
 * `patient` are both always present (mirroring `Appointment`'s own shape) so
 * this one DTO serves both the patient's own records page and the doctor's
 * per-patient view.
 */
export class RecordEntryDto {
  appointmentId: string;
  startAt: string;
  endAt: string;
  reasonForVisit: string;
  doctor: AppointmentDoctorDto;
  patient: AppointmentPersonDto;
  note: ConsultationNoteResponseDto | null;
  prescriptions: PrescriptionResponseDto[];
}

/** Response body of `GET /records/me` and `GET /patients/:id/records`. Newest first. */
export class PatientRecordsTimelineDto {
  items: RecordEntryDto[];
}
