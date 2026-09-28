import { AccountStatus, Role } from '@prisma/client';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Query of `GET /admin/users`. */
export class ListUsersQueryDto {
  /** Case-insensitive match on email, or (if a profile exists) first/last name. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

/**
 * Body of `PATCH /admin/users/:id/status`. `reason`'s shape is validated
 * here; whether it is *required* depends on `status` and is enforced in
 * `AdminUsersService.updateStatus` (a cross-field rule, like
 * `AppointmentsService.cancel`'s doctor-reason requirement).
 */
export class UpdateUserStatusDto {
  @IsEnum(AccountStatus)
  status: AccountStatus;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  reason?: string;
}
