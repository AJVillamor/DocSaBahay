import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';

/** The other participant on an appointment, as shown to the caller. */
export class AppointmentPersonDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;
}

export class AppointmentDoctorDto extends AppointmentPersonDto {
  @ApiProperty()
  title: string;
}

/** One appointment, as returned by every `/appointments*` endpoint. */
export class AppointmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  doctorId: string;

  @ApiProperty({ format: 'uuid' })
  patientId: string;

  @ApiProperty()
  startAt: string;

  @ApiProperty()
  endAt: string;

  @ApiProperty({ enum: AppointmentStatus, enumName: 'AppointmentStatus' })
  status: AppointmentStatus;

  @ApiProperty()
  reasonForVisit: string;

  @ApiProperty({ nullable: true, type: String })
  cancelledById: string | null;

  @ApiProperty({ nullable: true, type: String })
  cancelledAt: string | null;

  @ApiProperty({ nullable: true, type: String })
  cancellationReason: string | null;

  @ApiProperty()
  version: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ type: AppointmentPersonDto })
  patient: AppointmentPersonDto;

  @ApiProperty({ type: AppointmentDoctorDto })
  doctor: AppointmentDoctorDto;
}

/** Response body of `GET /appointments`. */
export class PaginatedAppointmentsDto {
  @ApiProperty({ type: [AppointmentResponseDto] })
  items: AppointmentResponseDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalCount: number;
}
