import { VerificationStatus } from '@prisma/client';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Query of `GET /admin/doctors`. */
export class ListDoctorsQueryDto {
  @IsOptional()
  @IsIn(Object.values(VerificationStatus))
  verificationStatus?: VerificationStatus;

  /** Case-insensitive match on first or last name. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

/**
 * Body of `POST /admin/doctors/:id/review`. Whether `note` is *required*
 * depends on `decision` and is enforced in `AdminDoctorsService.review`.
 */
export class DoctorReviewDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string;
}
