import { Transform, type TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Lowercase letters, numbers and single hyphens, e.g. "internal-medicine". */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MESSAGE = 'slug must use lowercase letters, numbers and hyphens only.';

/** Body of `POST /admin/specializations`. */
export class CreateSpecializationDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;
}

/** Body of `PATCH /admin/specializations/:id`. */
export class UpdateSpecializationDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string;
}
