import { Transform, type TransformFnParams } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Query of `GET /doctors/me/patients`. */
export class DoctorPatientsQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  search?: string;
}

/** One patient under a doctor's care, as returned by `GET /doctors/me/patients`. */
export class DoctorPatientDto {
  id: string;
  firstName: string;
  lastName: string;
  lastAppointmentAt: string | null;
}

/** Response body of `GET /doctors/me/patients`. */
export class DoctorPatientListDto {
  items: DoctorPatientDto[];
}
