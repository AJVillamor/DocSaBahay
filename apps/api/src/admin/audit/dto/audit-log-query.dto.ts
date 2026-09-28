import { Transform, Type, type TransformFnParams } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, IsUUID, Min } from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Query of `GET /admin/audit-logs`. */
export class AuditLogQueryDto {
  @IsOptional()
  @IsUUID('all')
  actorId?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  action?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  entityType?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  entityId?: string;

  /** Inclusive lower bound on `createdAt`. */
  @IsOptional()
  @IsISO8601()
  from?: string;

  /** Inclusive upper bound on `createdAt`. */
  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
