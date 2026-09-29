import { AppointmentStatus, SessionState } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

/** Query of `GET /admin/appointments`. */
export class ListAdminAppointmentsQueryDto {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsEnum(SessionState)
  sessionState?: SessionState;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  /** Inclusive lower bound on `startAt`, ISO 8601. */
  @IsOptional()
  @IsISO8601()
  from?: string;

  /** Exclusive upper bound on `startAt`, ISO 8601. */
  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

/**
 * Body of `POST /admin/appointments/:id/cancel` and `.../invalidate`. `reason`
 * is always required here — unlike a participant's own cancel, an admin
 * acting on someone else's appointment must always explain why.
 */
export class AdminAppointmentActionDto {
  @IsString()
  @Length(1, 500)
  reason: string;
}

/**
 * Body of `PATCH /admin/appointments/:id/datetime` — a demo/admin tool. See
 * `AdminAppointmentsService.setDateTime` for exactly what it bypasses.
 */
export class AdminSetAppointmentDateTimeDto {
  @IsISO8601()
  startAt: string;
}
